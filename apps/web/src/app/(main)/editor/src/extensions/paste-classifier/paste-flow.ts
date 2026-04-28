/**
 * @module extensions/paste-classifier/paste-flow
 *
 * تدفق التصنيف على المحرر بنمط Render-First:
 * 1) معاينة حرفية فورية.
 * 2) جلب bridge من المحرك المضمّن (karank) عند الحاجة.
 * 3) تصنيف محلي + إصلاحات الاشتباس قبل العرض.
 * 4) عرض فوري للمصنف المحلي.
 * 5) طبقة خلفية: مراجعة الاشتباه + المراجعة النهائية + تطبيق التصحيحات
 *    تدريجياً عبر progressiveUpdater.
 */

import { fetchUnifiedTextExtract } from "../../utils/file-import";
import { progressiveUpdater } from "../ai-progressive-updater";
import {
  agentReviewLogger,
  PASTE_CLASSIFIER_ERROR_EVENT,
} from "../paste-classifier-config";
import {
  generateItemId,
  type ClassifiedDraftWithId,
} from "../paste-classifier-helpers";
import { pipelineRecorder } from "../pipeline-recorder";

import { applyAgentReview } from "./agent-review";
import { classifyLines } from "./classify-lines";
import { PIPELINE_FLAGS } from "./constants";
import { ProgressivePipelineStageError } from "./errors";
import { applyFinalReviewLayer } from "./final-review/apply";
import {
  computeFinalReviewRoutingStats,
  promoteHighSeveritySuspicionCases,
  selectFinalReviewPayloads,
} from "./final-review/routing";
import {
  isDuplicateOfRecentText,
  isPipelineRunning,
  markPipelineStarted,
  markPipelineStopped,
  recordProcessedText,
} from "./pipeline-state";
import { renderClassifiedDraftsToView } from "./prosemirror-adapter";
import { applySuspicionReviewLayer } from "./suspicion-review-layer";
import { buildLiteralPreviewDrafts } from "./utils/draft-builders";
import { simpleHash } from "./utils/hash";
import {
  computeDocumentSignature,
  normalizeComparableText,
  normalizePreviewText,
} from "./utils/text-normalization";

import type {
  ApplyPasteClassifierFlowOptions,
  ClassifiedDraftPipelineState,
} from "./types";
import type { EditorView } from "@tiptap/pm/view";

/**
 * تطبيق طبقة المراجعة النهائية بعد العرض الفوري.
 * تعمل في الخلفية بعد render-first ولا تكسر التدفق إذا فشلت.
 */
const runFinalReviewPipeline = async (
  view: EditorView,
  locallyReviewed: ClassifiedDraftWithId[],
  importOpId: string,
  sourceMethod?: string
): Promise<void> => {
  if (view.isDestroyed) return;

  const sessionId = `silent-review-${Date.now()}`;
  const updateSession = progressiveUpdater.createSession(sessionId, {
    minConfidenceThreshold: 0.65,
    allowLayerOverride: true,
    layerPriority: ["final-review", "suspicion-model", "gemini-context"],
  });
  const suspicionCases =
    (locallyReviewed as ClassifiedDraftPipelineState)._suspicionCases ?? [];
  const routingStats = computeFinalReviewRoutingStats(
    promoteHighSeveritySuspicionCases(suspicionCases)
  );
  const markSettled = (
    classified: readonly ClassifiedDraftWithId[],
    metadata?: Record<string, unknown>
  ): void => {
    pipelineRecorder.trackFile("paste-classifier.ts");
    pipelineRecorder.snapshot("settled", classified, {
      ...(metadata ?? {}),
      visibleStage: "settled",
    });
  };

  try {
    if (suspicionCases.length === 0) {
      agentReviewLogger.telemetry("paste-pipeline-stage", {
        stage: "suspicion-review-summary",
        localSuspicionCases: 0,
        sentToSuspicionModel: 0,
        modelDismissed: 0,
        modelEscalated: 0,
        finalReviewEligible: 0,
        finalReviewReceived: 0,
      });
      agentReviewLogger.telemetry("paste-pipeline-stage", {
        stage: "final-review-skipped",
        reason: "no-suspicion-cases",
      });
      markSettled(locallyReviewed, { reason: "no-suspicion-cases" });
      return;
    }

    const {
      finalReviewCandidates,
      reviewedCount,
      dismissedCount,
      heldLocalReviewCount,
      escalatedCount,
      discoveredCount,
      dispatchSummary,
    } = await applySuspicionReviewLayer({
      classified: locallyReviewed,
      suspicionCases,
      importOpId,
      sessionId,
      ...(sourceMethod !== undefined ? { sourceMethod } : {}),
    });

    (locallyReviewed as ClassifiedDraftPipelineState)._finalReviewCandidates =
      finalReviewCandidates;

    pipelineRecorder.trackFile("paste-classifier.ts");
    pipelineRecorder.snapshot("suspicion-model", locallyReviewed, {
      localCases: dispatchSummary.totalLocalCases,
      sentToModel: dispatchSummary.sentToModel,
      sentLocalReview: dispatchSummary.sentLocalReview,
      sentAgentCandidate: dispatchSummary.sentAgentCandidate,
      sentAgentForced: dispatchSummary.sentAgentForced,
      reviewedCount,
      dismissedCount,
      heldLocalReviewCount,
      escalatedCount,
      discoveredCount,
      remainingCandidates: finalReviewCandidates.length,
      visibleStage: "suspicion-reviewed",
    });

    agentReviewLogger.telemetry("paste-pipeline-stage", {
      stage: "suspicion-model-complete",
      suspicionCount: dispatchSummary.totalLocalCases,
      sentToSuspicionModel: dispatchSummary.sentToModel,
      sentLocalReview: dispatchSummary.sentLocalReview,
      sentAgentCandidate: dispatchSummary.sentAgentCandidate,
      sentAgentForced: dispatchSummary.sentAgentForced,
      reviewedCount,
      dismissedCount,
      heldLocalReviewCount,
      escalatedCount,
      discoveredCount,
      remainingCandidates: finalReviewCandidates.length,
    });

    const selectedFinalReviewCount = selectFinalReviewPayloads(
      finalReviewCandidates,
      locallyReviewed.length
    ).length;

    agentReviewLogger.telemetry("paste-pipeline-stage", {
      stage: "suspicion-review-summary",
      localSuspicionCases: dispatchSummary.totalLocalCases,
      sentToSuspicionModel: dispatchSummary.sentToModel,
      modelDismissed: dismissedCount,
      modelEscalated: escalatedCount,
      finalReviewEligible: selectedFinalReviewCount,
      finalReviewReceived: PIPELINE_FLAGS.FINAL_REVIEW_ENABLED
        ? selectedFinalReviewCount
        : 0,
    });

    if (finalReviewCandidates.length === 0) {
      agentReviewLogger.telemetry("paste-pipeline-stage", {
        stage: "final-review-skipped",
        reason: "no-remaining-suspicion-cases",
      });
      markSettled(locallyReviewed, { reason: "no-remaining-suspicion-cases" });
      return;
    }

    if (selectedFinalReviewCount === 0) {
      agentReviewLogger.telemetry("paste-pipeline-stage", {
        stage: "final-review-skipped",
        reason: "no-final-review-selected-after-suspicion-model",
      });
      markSettled(locallyReviewed, {
        reason: "no-final-review-selected-after-suspicion-model",
      });
      return;
    }

    if (!PIPELINE_FLAGS.FINAL_REVIEW_ENABLED) {
      agentReviewLogger.telemetry("paste-pipeline-stage", {
        stage: "final-review-skipped",
        reason: "FINAL_REVIEW_ENABLED=false",
      });
      markSettled(locallyReviewed, { reason: "FINAL_REVIEW_ENABLED=false" });
      return;
    }

    agentReviewLogger.telemetry("paste-pipeline-stage", {
      stage: "final-review-start",
      suspicionCount: selectedFinalReviewCount,
    });

    const finalReviewed = await applyFinalReviewLayer(
      locallyReviewed,
      finalReviewCandidates,
      importOpId,
      sessionId
    );

    let appliedCount = 0;
    const comparableLength = Math.min(
      locallyReviewed.length,
      finalReviewed.length
    );
    for (let index = 0; index < comparableLength; index += 1) {
      const original = locallyReviewed[index];
      const corrected = finalReviewed[index];
      if (!original || !corrected) continue;
      if (original.type === corrected.type) continue;

      const applied = updateSession.applyCorrection(view, {
        lineIndex: index,
        correctedType: corrected.type,
        confidence: Math.max(0.65, corrected.confidence),
        reason: "Final review correction",
        source: "final-review",
        expectedCurrentText: original.text,
      });
      if (applied) {
        appliedCount += 1;
      }
    }

    pipelineRecorder.trackFile("paste-classifier.ts");
    pipelineRecorder.snapshot("final-review", finalReviewed, {
      appliedCount,
      suspicionCount: selectedFinalReviewCount,
      ...routingStats,
      visibleStage: "final-reviewed",
    });

    markSettled(finalReviewed, {
      appliedCount,
      suspicionCount: selectedFinalReviewCount,
      ...routingStats,
    });

    agentReviewLogger.telemetry("paste-pipeline-stage", {
      stage: "final-review-complete",
      appliedCount,
      suspicionCount: selectedFinalReviewCount,
      countPass: routingStats.countPass,
      countLocalReview: routingStats.countLocalReview,
      countAgentCandidate: routingStats.countAgentCandidate,
      countAgentForced: routingStats.countAgentForced,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stage =
      error instanceof ProgressivePipelineStageError
        ? error.stage
        : "final-review";
    const code =
      error instanceof ProgressivePipelineStageError ? error.code : null;
    agentReviewLogger.error("final-review-pipeline-failed", {
      sessionId,
      stage,
      code,
      error: message,
    });
    pipelineRecorder.logRunFailure(stage, message, code ?? undefined);
  } finally {
    updateSession.complete();
    pipelineRecorder.finishRun();
  }
};

/**
 * تطبيق تصنيف اللصق على العرض بنمط Render-First.
 *
 * 1) تصنيف محلي + تطبيق إصلاحات الاشتباه قبل العرض.
 * 2) عرض فوري.
 * 3) مراجعة نهائية في الخلفية.
 *
 * المستخدم يشوف المحتوى فوراً (الخطوة 1)،
 * ثم تطبق طبقة المراجعة النهائية تصحيحاتها تدريجياً.
 */
export const applyPasteClassifierFlowToView = async (
  view: EditorView,
  text: string,
  options?: ApplyPasteClassifierFlowOptions
): Promise<boolean> => {
  if (isPipelineRunning()) {
    agentReviewLogger.warn("pipeline-reentry-blocked", {});
    return false;
  }

  const textHash = simpleHash(text);
  const startNow = performance.now();
  if (isDuplicateOfRecentText(textHash, startNow)) {
    agentReviewLogger.telemetry("pipeline-dedup-skip", { hash: textHash });
    return false;
  }

  markPipelineStarted();
  try {
    const customReview = options?.agentReview;
    const classificationProfile = options?.classificationProfile;
    const sourceFileType = options?.sourceFileType;
    let sourceMethod = options?.sourceMethod;
    const structuredHints = options?.structuredHints;
    let schemaElements = options?.schemaElements;
    let classificationText = text;
    const previewText =
      typeof options?.rawExtractedText === "string" &&
      options.rawExtractedText.trim().length > 0
        ? options.rawExtractedText
        : text;
    const from = options?.from ?? view.state.selection.from;
    const to = options?.to ?? view.state.selection.to;

    pipelineRecorder.startRun(
      classificationProfile ?? "paste",
      {
        textLength: previewText.length,
        lineCount: normalizePreviewText(previewText).split("\n").length,
      },
      {
        ...(classificationProfile === "paste"
          ? { sourceType: "paste" }
          : sourceFileType === "doc" ||
              sourceFileType === "docx" ||
              sourceFileType === "pdf"
            ? { sourceType: sourceFileType }
            : {}),
        intakeKind: classificationProfile === "paste" ? "paste" : "file-open",
        fileName: options?.fileName ?? null,
      }
    );

    const finishRunWithFailure = (
      stage: string,
      message: string,
      code: string
    ): void => {
      pipelineRecorder.logRunFailure(stage, message, code);
      pipelineRecorder.finishRun();
    };

    let activeRange = { from, to };
    let previewDocumentSignature: string | null = null;
    const previewDrafts = buildLiteralPreviewDrafts(previewText);
    if (previewDrafts.length > 0) {
      const previewRender = renderClassifiedDraftsToView(
        view,
        previewDrafts,
        activeRange,
        "preview-literal"
      );
      if (!previewRender) {
        finishRunWithFailure(
          "local-classification",
          "تعذر عرض المعاينة الأولية داخل المحرر.",
          "PREVIEW_RENDER_FAILED"
        );
        return false;
      }
      activeRange = { from: previewRender.from, to: previewRender.to };
      previewDocumentSignature = previewRender.documentSignature;
      pipelineRecorder.trackFile("paste-classifier.ts");
      pipelineRecorder.snapshot("preview-literal", previewDrafts, {
        nodesRendered: previewRender.nodesRendered,
        visibleStage:
          classificationProfile === "paste" ? "user-paste" : "extracted",
        firstVisibleSourceKind:
          classificationProfile === "paste"
            ? "user-paste"
            : (options?.firstVisibleSourceKind ??
              (sourceFileType === "pdf" ? "ocr" : "direct-extraction")),
      });
    }

    const bridgeStart = performance.now();
    const shouldFetchKarankBridge =
      !schemaElements &&
      (classificationProfile === "paste" ||
        sourceFileType === "doc" ||
        sourceFileType === "docx" ||
        sourceFileType === "pdf");

    if (shouldFetchKarankBridge) {
      const bridgeSourceType =
        classificationProfile === "paste"
          ? "paste"
          : sourceFileType === "doc" ||
              sourceFileType === "docx" ||
              sourceFileType === "pdf"
            ? sourceFileType
            : "paste";
      const unifiedResult = await fetchUnifiedTextExtract(
        text,
        bridgeSourceType
      );
      schemaElements = unifiedResult.schemaElements;
      classificationText =
        unifiedResult.rawText.trim().length > 0 ? unifiedResult.rawText : text;
      sourceMethod = sourceMethod ?? "karank-engine-bridge";

      agentReviewLogger.telemetry("paste-pipeline-stage", {
        stage: "engine-text-extract-success",
        sourceType: bridgeSourceType,
        elementCount: schemaElements.length,
      });
      pipelineRecorder.logBridgeCall(
        bridgeSourceType,
        schemaElements.length,
        Math.round(performance.now() - bridgeStart)
      );
    }

    if (
      schemaElements &&
      schemaElements.length > 0 &&
      classificationProfile !== "paste"
    ) {
      pipelineRecorder.logBridgeCall(
        classificationProfile ?? "file-import",
        schemaElements.length,
        Math.round(performance.now() - bridgeStart)
      );
    }

    const normalizedKarankText = normalizeComparableText(classificationText);
    const normalizedPreviewText = normalizeComparableText(previewText);
    const shouldRenderKarankVisible =
      normalizedKarankText.length > 0 &&
      normalizedKarankText !== normalizedPreviewText;

    if (shouldRenderKarankVisible) {
      const karankPreviewDrafts = buildLiteralPreviewDrafts(classificationText);
      const karankRender = renderClassifiedDraftsToView(
        view,
        karankPreviewDrafts,
        activeRange,
        "karank-visible"
      );
      if (!karankRender) {
        finishRunWithFailure(
          "karank",
          "تعذر عرض نسخة محرك التصنيف الوسيط داخل المحرر.",
          "KARANK_RENDER_FAILED"
        );
        return previewDrafts.length > 0;
      }

      activeRange = { from: karankRender.from, to: karankRender.to };
      previewDocumentSignature = karankRender.documentSignature;

      pipelineRecorder.trackFile("paste-classifier.ts");
      pipelineRecorder.snapshot("karank-visible", karankPreviewDrafts, {
        nodesRendered: karankRender.nodesRendered,
        visibleStage: "karank",
      });
    }

    const initiallyClassified = classifyLines(classificationText, {
      ...(classificationProfile !== undefined && { classificationProfile }),
      ...(sourceFileType !== undefined && { sourceFileType }),
      ...(sourceMethod !== undefined && { sourceMethod }),
      ...(structuredHints !== undefined && { structuredHints }),
      ...(schemaElements !== undefined && { schemaElements }),
    });
    const locallyReviewed = applyAgentReview(initiallyClassified, customReview);

    if (locallyReviewed.length === 0 || view.isDestroyed) {
      finishRunWithFailure(
        "local-classification",
        view.isDestroyed
          ? "توقف مسار التصنيف لأن المحرر لم يعد نشطاً."
          : "لم ينتج مسار التصنيف أي عناصر قابلة للعرض.",
        view.isDestroyed ? "EDITOR_VIEW_DESTROYED" : "EMPTY_CLASSIFICATION"
      );
      return false;
    }

    agentReviewLogger.telemetry("paste-pipeline-stage", {
      stage: "frontend-classify-complete",
      totalLines: locallyReviewed.length,
      sourceFileType,
      sourceMethod,
    });

    if (
      previewDocumentSignature &&
      computeDocumentSignature(view) !== previewDocumentSignature
    ) {
      agentReviewLogger.telemetry("paste-pipeline-stage", {
        stage: "render-first-skipped",
        reason: "document-changed-after-preview",
      });
      recordProcessedText(textHash, performance.now());
      pipelineRecorder.finishRun();
      return true;
    }

    const renderResult = renderClassifiedDraftsToView(
      view,
      locallyReviewed,
      activeRange,
      "render-first"
    );
    if (!renderResult) {
      finishRunWithFailure(
        "local-classification",
        "تعذر عرض النسخة المصنفة داخل المحرر.",
        "CLASSIFIED_RENDER_FAILED"
      );
      return previewDrafts.length > 0;
    }

    agentReviewLogger.telemetry("paste-pipeline-stage", {
      stage: "frontend-render-first",
      nodesApplied: renderResult.nodesRendered,
    });

    pipelineRecorder.trackFile("paste-classifier.ts");
    pipelineRecorder.snapshot("render-first", locallyReviewed, {
      nodesRendered: renderResult.nodesRendered,
      visibleStage: "local-classified",
    });

    const importOpId = generateItemId();
    void runFinalReviewPipeline(
      view,
      locallyReviewed,
      importOpId,
      sourceMethod
    ).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      agentReviewLogger.error("final-review-pipeline-error", {
        error: message,
      });
    });

    recordProcessedText(textHash, performance.now());
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    agentReviewLogger.error("paste-pipeline-silent-fallback", {
      error: message,
    });
    pipelineRecorder.logRunFailure("local-classification", message);
    recordProcessedText(textHash, performance.now());
    pipelineRecorder.finishRun();
    return true;
  } finally {
    markPipelineStopped();
  }
};

/**
 * إعادة تصدير ثابت اسم حدث الأخطاء — يُستخدم في extension الخارجي.
 */
export { PASTE_CLASSIFIER_ERROR_EVENT };
