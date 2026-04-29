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

import {
  agentReviewLogger,
  PASTE_CLASSIFIER_ERROR_EVENT,
} from "../paste-classifier-config";
import { generateItemId } from "../paste-classifier-helpers";
import { pipelineRecorder } from "../pipeline-recorder";

import { runFinalReviewPipeline } from "./paste-flow-helpers";
import {
  buildFlowState,
  runPreviewPhase,
  runBridgePhase,
  runClassifyAndRenderPhase,
  type FinishFn,
} from "./paste-flow-phases";
import {
  isDuplicateOfRecentText,
  isPipelineRunning,
  markPipelineStarted,
  markPipelineStopped,
  recordProcessedText,
} from "./pipeline-state";
import { normalizePreviewText } from "./utils/text-normalization";

import type { ApplyPasteClassifierFlowOptions } from "./types";
import type { EditorView } from "@tiptap/pm/view";

export { PASTE_CLASSIFIER_ERROR_EVENT };

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
