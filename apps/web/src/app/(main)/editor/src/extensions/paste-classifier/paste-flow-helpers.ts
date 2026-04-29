/**
 * @module extensions/paste-classifier/paste-flow-helpers
 * @description Helper functions for paste-flow to reduce file size
 */

import { progressiveUpdater } from "../ai-progressive-updater";
import {
  agentReviewLogger,
  PASTE_CLASSIFIER_ERROR_EVENT,
} from "../paste-classifier-config";
import { type ClassifiedDraftWithId } from "../paste-classifier-helpers";
import { pipelineRecorder } from "../pipeline-recorder";

import { PIPELINE_FLAGS } from "./constants";
import { ProgressivePipelineStageError } from "./errors";
import { applyFinalReviewLayer } from "./final-review/apply";
import {
  computeFinalReviewRoutingStats,
  promoteHighSeveritySuspicionCases,
  selectFinalReviewPayloads,
} from "./final-review/routing";
import { applySuspicionReviewLayer } from "./suspicion-review-layer";

import type { ClassifiedDraftPipelineState } from "./types";
import type { FinalReviewSuspiciousLinePayload } from "@editor/types/final-review";
import type { EditorView } from "@tiptap/pm/view";

type MarkSettledFn = (
  classified: readonly ClassifiedDraftWithId[],
  metadata?: Record<string, unknown>
) => void;

export const makeMarkSettled = (): MarkSettledFn => (classified, metadata) => {
  pipelineRecorder.trackFile("paste-classifier.ts");
  pipelineRecorder.snapshot("settled", classified, {
    ...(metadata ?? {}),
    visibleStage: "settled",
  });
};

export const handleNoCases = (
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

export const logSuspicionModelDone = (
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

export const gateFinalReview = (
  candidates: readonly FinalReviewSuspiciousLinePayload[],
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
  candidates: readonly FinalReviewSuspiciousLinePayload[];
  importOpId: string;
  sessionId: string;
  routingStats: ReturnType<typeof computeFinalReviewRoutingStats>;
  markSettled: MarkSettledFn;
  updateSession: ReturnType<typeof progressiveUpdater.createSession>;
}

export const executeFinalReview = async (
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

export const runFinalReviewPipeline = async (
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
      error instanceof ProgressivePipelineStageError ? error.code : undefined;
    agentReviewLogger.error(PASTE_CLASSIFIER_ERROR_EVENT, {
      stage,
      message,
      code,
    });
    markSettled(locallyReviewed, { error: message, stage });
  }
};
