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

// ─── أنواع مساعدة ────────────────────────────────────────────────────

type FinishFn = (stage: string, message: string, code: string) => void;
type MarkSettledFn = (
  classified: readonly ClassifiedDraftWithId[],
  metadata?: Record<string, unknown>
) => void;

interface FlowState {
  classificationText: string;
  previewText: string;
  sourceMethod?: string;
  schemaElements?: ApplyPasteClassifierFlowOptions["schemaElements"];
  activeRange: { from: number; to: number };
  previewDocumentSignature: string | null;
  textHash: number;
  hasPreviewDrafts: boolean;
}

// ─── helpers لـ runFinalReviewPipeline ───────────────────────────────

const makeMarkSettled = (): MarkSettledFn => (classified, metadata) => {
  pipelineRecorder.trackFile("paste-classifier.ts");
  pipelineRecorder.snapshot("settled", classified, {
    ...(metadata ?? {}),
    visibleStage: "settled",
  });
};

const handleNoCases = (
  locallyReviewed: ClassifiedDraftWithId[],
  markSettled: MarkSettledFn
): void => {
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
};

const logSuspicionModelDone = (
  output: Awaited<ReturnType<typeof applySuspicionReviewLayer>>,
  remainingCount: number
): void => {
  const d = output.dispatchSummary;
  agentReviewLogger.telemetry("paste-pipeline-stage", {
    stage: "suspicion-model-complete",
    suspicionCount: d.totalLocalCases,
    sentToSuspicionModel: d.sentToModel,
    sentLocalReview: d.sentLocalReview,
    sentAgentCandidate: d.sentAgentCandidate,
    sentAgentForced: d.sentAgentForced,
    reviewedCount: output.reviewedCount,
    dismissedCount: output.dismissedCount,
    heldLocalReviewCount: output.heldLocalReviewCount,
    escalatedCount: output.escalatedCount,
    discoveredCount: output.discoveredCount,
    remainingCandidates: remainingCount,
  });
};

/** Checks gating conditions; returns false if final review should be skipped. */
const gateFinalReview = (
  candidates: ClassifiedDraftWithId[],
  totalCount: number,
  locallyReviewed: ClassifiedDraftWithId[],
  markSettled: MarkSettledFn
): boolean => {
  if (candidates.length === 0) {
    agentReviewLogger.telemetry("paste-pipeline-stage", {
      stage: "final-review-skipped",
      reason: "no-remaining-suspicion-cases",
    });
    markSettled(locallyReviewed, { reason: "no-remaining-suspicion-cases" });
    return false;
  }
  const selectedCount = selectFinalReviewPayloads(
    candidates,
    totalCount
  ).length;
  if (selectedCount === 0) {
    agentReviewLogger.telemetry("paste-pipeline-stage", {
      stage: "final-review-skipped",
      reason: "no-final-review-selected-after-suspicion-model",
    });
    markSettled(locallyReviewed, {
      reason: "no-final-review-selected-after-suspicion-model",
    });
    return false;
  }
  if (!PIPELINE_FLAGS.FINAL_REVIEW_ENABLED) {
    agentReviewLogger.telemetry("paste-pipeline-stage", {
      stage: "final-review-skipped",
      reason: "FINAL_REVIEW_ENABLED=false",
    });
    markSettled(locallyReviewed, { reason: "FINAL_REVIEW_ENABLED=false" });
    return false;
  }
  return true;
};

interface ExecuteFinalReviewArgs {
  view: EditorView;
  locallyReviewed: ClassifiedDraftWithId[];
  candidates: ClassifiedDraftWithId[];
  importOpId: string;
  sessionId: string;
  routingStats: ReturnType<typeof computeFinalReviewRoutingStats>;
  markSettled: MarkSettledFn;
  updateSession: ReturnType<typeof progressiveUpdater.createSession>;
}

const executeFinalReview = async (
  args: ExecuteFinalReviewArgs
): Promise<void> => {
  const {
    view,
    locallyReviewed,
    candidates,
    importOpId,
    sessionId,
    routingStats,
    markSettled,
    updateSession,
  } = args;
  const selectedCount = selectFinalReviewPayloads(
    candidates,
    locallyReviewed.length
  ).length;
  agentReviewLogger.telemetry("paste-pipeline-stage", {
    stage: "final-review-start",
    suspicionCount: selectedCount,
  });

  const finalReviewed = await applyFinalReviewLayer(
    locallyReviewed,
    candidates,
    importOpId,
    sessionId
  );

  let appliedCount = 0;
  const len = Math.min(locallyReviewed.length, finalReviewed.length);
  for (let i = 0; i < len; i++) {
    const original = locallyReviewed[i];
    const corrected = finalReviewed[i];
    if (!original || !corrected || original.type === corrected.type) continue;
    const applied = updateSession.applyCorrection(view, {
      lineIndex: i,
      correctedType: corrected.type,
      confidence: Math.max(0.65, corrected.confidence),
      reason: "Final review correction",
      source: "final-review",
      expectedCurrentText: original.text,
    });
    if (applied) appliedCount++;
  }

  pipelineRecorder.trackFile("paste-classifier.ts");
  pipelineRecorder.snapshot("final-review", finalReviewed, {
    appliedCount,
    suspicionCount: selectedCount,
    ...routingStats,
    visibleStage: "final-reviewed",
  });
  markSettled(finalReviewed, {
    appliedCount,
    suspicionCount: selectedCount,
    ...routingStats,
  });

  agentReviewLogger.telemetry("paste-pipeline-stage", {
    stage: "final-review-complete",
    appliedCount,
    suspicionCount: selectedCount,
    countPass: routingStats.countPass,
    countLocalReview: routingStats.countLocalReview,
    countAgentCandidate: routingStats.countAgentCandidate,
    countAgentForced: routingStats.countAgentForced,
  });
};

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
  const markSettled = makeMarkSettled();

  try {
    if (suspicionCases.length === 0) {
      handleNoCases(locallyReviewed, markSettled);
      return;
    }

    const output = await applySuspicionReviewLayer({
      classified: locallyReviewed,
      suspicionCases,
      importOpId,
      sessionId,
      ...(sourceMethod !== undefined ? { sourceMethod } : {}),
    });

    (locallyReviewed as ClassifiedDraftPipelineState)._finalReviewCandidates =
      output.finalReviewCandidates;

    pipelineRecorder.trackFile("paste-classifier.ts");
    pipelineRecorder.snapshot("suspicion-model", locallyReviewed, {
      localCases: output.dispatchSummary.totalLocalCases,
      sentToModel: output.dispatchSummary.sentToModel,
      sentLocalReview: output.dispatchSummary.sentLocalReview,
      sentAgentCandidate: output.dispatchSummary.sentAgentCandidate,
      sentAgentForced: output.dispatchSummary.sentAgentForced,
      reviewedCount: output.reviewedCount,
      dismissedCount: output.dismissedCount,
      heldLocalReviewCount: output.heldLocalReviewCount,
      escalatedCount: output.escalatedCount,
      discoveredCount: output.discoveredCount,
      remainingCandidates: output.finalReviewCandidates.length,
      visibleStage: "suspicion-reviewed",
    });

    logSuspicionModelDone(output, output.finalReviewCandidates.length);

    const selectedCount = selectFinalReviewPayloads(
      output.finalReviewCandidates,
      locallyReviewed.length
    ).length;
    agentReviewLogger.telemetry("paste-pipeline-stage", {
      stage: "suspicion-review-summary",
      localSuspicionCases: output.dispatchSummary.totalLocalCases,
      sentToSuspicionModel: output.dispatchSummary.sentToModel,
      modelDismissed: output.dismissedCount,
      modelEscalated: output.escalatedCount,
      finalReviewEligible: selectedCount,
      finalReviewReceived: PIPELINE_FLAGS.FINAL_REVIEW_ENABLED
        ? selectedCount
        : 0,
    });

    if (
      !gateFinalReview(
        output.finalReviewCandidates,
        locallyReviewed.length,
        locallyReviewed,
        markSettled
      )
    )
      return;

    await executeFinalReview({
      view,
      locallyReviewed,
      candidates: output.finalReviewCandidates,
      importOpId,
      sessionId,
      routingStats,
      markSettled,
      updateSession,
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

// ─── مراحل applyPasteClassifierFlowToView ─────────────────────────────

const buildFlowState = (
  view: EditorView,
  text: string,
  options?: ApplyPasteClassifierFlowOptions
): FlowState => {
  const from = options?.from ?? view.state.selection.from;
  const to = options?.to ?? view.state.selection.to;
  const previewText =
    typeof options?.rawExtractedText === "string" &&
    options.rawExtractedText.trim().length > 0
      ? options.rawExtractedText
      : text;
  return {
    classificationText: text,
    previewText,
    sourceMethod: options?.sourceMethod,
    schemaElements: options?.schemaElements,
    activeRange: { from, to },
    previewDocumentSignature: null,
    textHash: simpleHash(text),
    hasPreviewDrafts: false,
  };
};

interface PreviewPhaseArgs {
  view: EditorView;
  state: FlowState;
  classificationProfile: string | undefined;
  sourceFileType: string | undefined;
  firstVisibleSourceKind: string | undefined;
  finishRun: FinishFn;
}

/** Phase 1: literal preview render */
const runPreviewPhase = (args: PreviewPhaseArgs): boolean => {
  const {
    view,
    state,
    classificationProfile,
    sourceFileType,
    firstVisibleSourceKind,
    finishRun,
  } = args;
  const drafts = buildLiteralPreviewDrafts(state.previewText);
  state.hasPreviewDrafts = drafts.length > 0;
  if (!state.hasPreviewDrafts) return true;

  const render = renderClassifiedDraftsToView(
    view,
    drafts,
    state.activeRange,
    "preview-literal"
  );
  if (!render) {
    finishRun(
      "local-classification",
      "تعذر عرض المعاينة الأولية داخل المحرر.",
      "PREVIEW_RENDER_FAILED"
    );
    return false;
  }
  state.activeRange = { from: render.from, to: render.to };
  state.previewDocumentSignature = render.documentSignature;
  pipelineRecorder.trackFile("paste-classifier.ts");
  pipelineRecorder.snapshot("preview-literal", drafts, {
    nodesRendered: render.nodesRendered,
    visibleStage:
      classificationProfile === "paste" ? "user-paste" : "extracted",
    firstVisibleSourceKind:
      classificationProfile === "paste"
        ? "user-paste"
        : (firstVisibleSourceKind ??
          (sourceFileType === "pdf" ? "ocr" : "direct-extraction")),
  });
  return true;
};

interface BridgePhaseArgs {
  view: EditorView;
  text: string;
  state: FlowState;
  classificationProfile: string | undefined;
  sourceFileType: string | undefined;
  finishRun: FinishFn;
}

/** Phase 2: karank bridge fetch + optional visible render */
const runBridgePhase = async (args: BridgePhaseArgs): Promise<boolean> => {
  const {
    view,
    text,
    state,
    classificationProfile,
    sourceFileType,
    finishRun,
  } = args;
  const bridgeStart = performance.now();
  const shouldFetch =
    !state.schemaElements &&
    (classificationProfile === "paste" ||
      sourceFileType === "doc" ||
      sourceFileType === "docx" ||
      sourceFileType === "pdf");

  if (!shouldFetch) {
    if (
      state.schemaElements &&
      state.schemaElements.length > 0 &&
      classificationProfile !== "paste"
    ) {
      pipelineRecorder.logBridgeCall(
        classificationProfile ?? "file-import",
        state.schemaElements.length,
        Math.round(performance.now() - bridgeStart)
      );
    }
    return true;
  }

  const bridgeSourceType =
    classificationProfile === "paste"
      ? "paste"
      : sourceFileType === "doc" ||
          sourceFileType === "docx" ||
          sourceFileType === "pdf"
        ? sourceFileType
        : "paste";

  const unifiedResult = await fetchUnifiedTextExtract(text, bridgeSourceType);
  state.schemaElements = unifiedResult.schemaElements;
  state.classificationText =
    unifiedResult.rawText.trim().length > 0 ? unifiedResult.rawText : text;
  state.sourceMethod = state.sourceMethod ?? "karank-engine-bridge";

  agentReviewLogger.telemetry("paste-pipeline-stage", {
    stage: "engine-text-extract-success",
    sourceType: bridgeSourceType,
    elementCount: state.schemaElements.length,
  });
  pipelineRecorder.logBridgeCall(
    bridgeSourceType,
    state.schemaElements.length,
    Math.round(performance.now() - bridgeStart)
  );

  const normalizedKarank = normalizeComparableText(state.classificationText);
  const normalizedPreview = normalizeComparableText(state.previewText);
  if (normalizedKarank.length > 0 && normalizedKarank !== normalizedPreview) {
    const karankDrafts = buildLiteralPreviewDrafts(state.classificationText);
    const karankRender = renderClassifiedDraftsToView(
      view,
      karankDrafts,
      state.activeRange,
      "karank-visible"
    );
    if (!karankRender) {
      finishRun(
        "karank",
        "تعذر عرض نسخة محرك التصنيف الوسيط داخل المحرر.",
        "KARANK_RENDER_FAILED"
      );
      return false;
    }
    state.activeRange = { from: karankRender.from, to: karankRender.to };
    state.previewDocumentSignature = karankRender.documentSignature;
    pipelineRecorder.trackFile("paste-classifier.ts");
    pipelineRecorder.snapshot("karank-visible", karankDrafts, {
      nodesRendered: karankRender.nodesRendered,
      visibleStage: "karank",
    });
  }

  return true;
};

interface ClassifyRenderPhaseArgs {
  view: EditorView;
  state: FlowState;
  options: ApplyPasteClassifierFlowOptions | undefined;
  classificationProfile: string | undefined;
  sourceFileType: string | undefined;
  finishRun: FinishFn;
}

/** Phase 3: local classification + render-first */
const runClassifyAndRenderPhase = (
  args: ClassifyRenderPhaseArgs
): ClassifiedDraftWithId[] | "skipped" | null => {
  const {
    view,
    state,
    options,
    classificationProfile,
    sourceFileType,
    finishRun,
  } = args;
  const initiallyClassified = classifyLines(state.classificationText, {
    ...(classificationProfile !== undefined && { classificationProfile }),
    ...(sourceFileType !== undefined && { sourceFileType }),
    ...(state.sourceMethod !== undefined && {
      sourceMethod: state.sourceMethod,
    }),
    ...(options?.structuredHints !== undefined && {
      structuredHints: options.structuredHints,
    }),
    ...(state.schemaElements !== undefined && {
      schemaElements: state.schemaElements,
    }),
  });
  const locallyReviewed = applyAgentReview(
    initiallyClassified,
    options?.agentReview
  );

  if (locallyReviewed.length === 0 || view.isDestroyed) {
    finishRun(
      "local-classification",
      view.isDestroyed
        ? "توقف مسار التصنيف لأن المحرر لم يعد نشطاً."
        : "لم ينتج مسار التصنيف أي عناصر قابلة للعرض.",
      view.isDestroyed ? "EDITOR_VIEW_DESTROYED" : "EMPTY_CLASSIFICATION"
    );
    return null;
  }

  agentReviewLogger.telemetry("paste-pipeline-stage", {
    stage: "frontend-classify-complete",
    totalLines: locallyReviewed.length,
    sourceFileType,
    sourceMethod: state.sourceMethod,
  });

  if (
    state.previewDocumentSignature &&
    computeDocumentSignature(view) !== state.previewDocumentSignature
  ) {
    agentReviewLogger.telemetry("paste-pipeline-stage", {
      stage: "render-first-skipped",
      reason: "document-changed-after-preview",
    });
    return "skipped";
  }

  const renderResult = renderClassifiedDraftsToView(
    view,
    locallyReviewed,
    state.activeRange,
    "render-first"
  );
  if (!renderResult) {
    finishRun(
      "local-classification",
      "تعذر عرض النسخة المصنفة داخل المحرر.",
      "CLASSIFIED_RENDER_FAILED"
    );
    return null;
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

  return locallyReviewed;
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

  const state = buildFlowState(view, text, options);
  if (isDuplicateOfRecentText(state.textHash, state.startNow)) {
    agentReviewLogger.telemetry("pipeline-dedup-skip", {
      hash: state.textHash,
    });
    return false;
  }

  const classificationProfile = options?.classificationProfile;
  const sourceFileType = options?.sourceFileType;

  markPipelineStarted();
  try {
    pipelineRecorder.startRun(
      classificationProfile ?? "paste",
      {
        textLength: state.previewText.length,
        lineCount: normalizePreviewText(state.previewText).split("\n").length,
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

    const finishRun: FinishFn = (stage, message, code) => {
      pipelineRecorder.logRunFailure(stage, message, code);
      pipelineRecorder.finishRun();
    };

    const previewOk = runPreviewPhase({
      view,
      state,
      classificationProfile,
      sourceFileType,
      firstVisibleSourceKind: options?.firstVisibleSourceKind,
      finishRun,
    });
    if (!previewOk) return false;

    const bridgeOk = await runBridgePhase({
      view,
      text,
      state,
      classificationProfile,
      sourceFileType,
      finishRun,
    });
    if (!bridgeOk) return state.hasPreviewDrafts;

    const classifyResult = runClassifyAndRenderPhase({
      view,
      state,
      options,
      classificationProfile,
      sourceFileType,
      finishRun,
    });

    if (classifyResult === "skipped") {
      recordProcessedText(state.textHash, performance.now());
      pipelineRecorder.finishRun();
      return true;
    }

    if (!classifyResult) return state.hasPreviewDrafts;

    const importOpId = generateItemId();
    void runFinalReviewPipeline(
      view,
      classifyResult,
      importOpId,
      state.sourceMethod
    ).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      agentReviewLogger.error("final-review-pipeline-error", {
        error: message,
      });
    });

    recordProcessedText(state.textHash, performance.now());
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    agentReviewLogger.error("paste-pipeline-silent-fallback", {
      error: message,
    });
    pipelineRecorder.logRunFailure("local-classification", message);
    recordProcessedText(state.textHash, performance.now());
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
