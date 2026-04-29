/**
 * @module extensions/paste-classifier/paste-flow-phases
 * @description مراحل المعاينة والجسر والتصنيف المحلي لتدفق اللصق.
 */

import { fetchUnifiedTextExtract } from "../../utils/file-import";
import { agentReviewLogger } from "../paste-classifier-config";
import { pipelineRecorder } from "../pipeline-recorder";

import { applyAgentReview } from "./agent-review";
import { classifyLines } from "./classify-lines";
import { renderClassifiedDraftsToView } from "./prosemirror-adapter";
import { buildLiteralPreviewDrafts } from "./utils/draft-builders";
import { simpleHash } from "./utils/hash";
import {
  computeDocumentSignature,
  normalizeComparableText,
} from "./utils/text-normalization";

import type { ClassifiedDraftWithId } from "../paste-classifier-helpers";
import type { ApplyPasteClassifierFlowOptions } from "./types";
import type { EditorView } from "@tiptap/pm/view";

export type FinishFn = (stage: string, message: string, code: string) => void;

export interface FlowState {
  classificationText: string;
  previewText: string;
  sourceMethod?: string;
  schemaElements?: ApplyPasteClassifierFlowOptions["schemaElements"];
  activeRange: { from: number; to: number };
  previewDocumentSignature: string | null;
  textHash: string;
  startNow: number;
  hasPreviewDrafts: boolean;
}

export const buildFlowState = (
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
    ...(options?.sourceMethod !== undefined
      ? { sourceMethod: options.sourceMethod }
      : {}),
    ...(options?.schemaElements !== undefined
      ? { schemaElements: options.schemaElements }
      : {}),
    activeRange: { from, to },
    previewDocumentSignature: null,
    textHash: simpleHash(text),
    startNow: performance.now(),
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

export const runPreviewPhase = (args: PreviewPhaseArgs): boolean => {
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

export const runBridgePhase = async (
  args: BridgePhaseArgs
): Promise<boolean> => {
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

export const runClassifyAndRenderPhase = (
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
