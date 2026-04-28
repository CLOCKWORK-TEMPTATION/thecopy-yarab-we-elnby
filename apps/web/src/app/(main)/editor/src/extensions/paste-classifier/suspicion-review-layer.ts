/**
 * @module extensions/paste-classifier/suspicion-review-layer
 *
 * طبقة مراجعة الاشتباه بالنموذج:
 * - تُرقّي الحالات الحرجة، تجمّع payloads، تستدعي SUSPICION_REVIEW_ENDPOINT،
 *   وتدمج الاستجابة مع candidates المحلية.
 * - الإخفاق يُحوَّل إلى ProgressivePipelineStageError بمرحلة suspicion-review.
 * - الإيقاف الناعم (flag مغلق أو endpoint غائب أو لا توجد سطور للمراجعة)
 *   يُعيد ملخصاً فارغاً متسقاً.
 */

import { buildFinalReviewSuspiciousLinePayload } from "@editor/final-review/payload-builder";
import {
  agentReviewLogger,
  SUSPICION_REVIEW_ENDPOINT,
} from "../paste-classifier-config";
import type { ClassifiedDraftWithId } from "../paste-classifier-helpers";
import {
  isModelReviewSuspicionBand,
  summarizeSuspicionReviewDispatchBands,
  type SuspicionReviewDispatchSummary,
} from "../suspicion-review-routing";
import type { SuspicionCase } from "@editor/suspicion-engine/types";
import type { FinalReviewSuspiciousLinePayload } from "@editor/types/final-review";
import type {
  SuspicionReviewLinePayload,
  SuspicionReviewRequestPayload,
  SuspicionReviewResponsePayload,
} from "@editor/types/suspicion-review";

import { PIPELINE_FLAGS } from "./constants";
import { ProgressivePipelineStageError } from "./errors";
import {
  buildLocalSuspicionReviewPayload,
  mergeSuspicionReviewCandidates,
} from "./final-review/payload-builders";
import { promoteHighSeveritySuspicionCases } from "./final-review/routing";
import { simpleHash } from "./utils/hash";

/**
 * نتيجة تشغيل طبقة الاشتباه بالنموذج.
 */
export interface SuspicionReviewLayerResult {
  finalReviewCandidates: FinalReviewSuspiciousLinePayload[];
  reviewedCount: number;
  dismissedCount: number;
  heldLocalReviewCount: number;
  escalatedCount: number;
  discoveredCount: number;
  dispatchSummary: SuspicionReviewDispatchSummary;
}

/**
 * تشغيل طبقة مراجعة الاشتباه بالنموذج وإرجاع candidates المراجعة النهائية.
 */
export const applySuspicionReviewLayer = async (params: {
  classified: ClassifiedDraftWithId[];
  suspicionCases: readonly SuspicionCase[];
  importOpId: string;
  sessionId: string;
  sourceMethod?: string;
}): Promise<SuspicionReviewLayerResult> => {
  const { classified, suspicionCases, importOpId, sessionId, sourceMethod } =
    params;

  const promoted = promoteHighSeveritySuspicionCases(suspicionCases);
  const eligibleDispatchSummary = summarizeSuspicionReviewDispatchBands(
    promoted.map((caseItem) => caseItem.band)
  );
  const localCandidates: FinalReviewSuspiciousLinePayload[] = [];
  const reviewLines: SuspicionReviewLinePayload[] = [];

  for (const caseItem of promoted) {
    if (!isModelReviewSuspicionBand(caseItem.band)) {
      continue;
    }

    const classifiedItem = classified[caseItem.lineIndex];
    const itemId = classifiedItem?._itemId ?? `item-${caseItem.lineIndex}`;
    const payload = buildFinalReviewSuspiciousLinePayload({
      suspicionCase: caseItem,
      classified,
      itemId,
      fingerprint: `${itemId}:${simpleHash(caseItem.classifiedLine.text)}`,
    });
    if (payload) {
      localCandidates.push(payload);
    }

    const reviewPayload = buildLocalSuspicionReviewPayload({
      suspicionCase: caseItem,
      classified,
      itemId,
      ...(sourceMethod !== undefined && { sourceMethod }),
    });
    if (reviewPayload) {
      reviewLines.push(reviewPayload);
    }
  }

  const preparedDispatchSummary = summarizeSuspicionReviewDispatchBands(
    reviewLines.map((line) => line.routingBand)
  );
  const skippedDispatchSummary: SuspicionReviewDispatchSummary = {
    ...preparedDispatchSummary,
    totalLocalCases: eligibleDispatchSummary.totalLocalCases,
    passSkipped: eligibleDispatchSummary.passSkipped,
    sentToModel: 0,
    sentLocalReview: 0,
    sentAgentCandidate: 0,
    sentAgentForced: 0,
  };

  if (
    !PIPELINE_FLAGS.SUSPICION_MODEL_ENABLED ||
    !SUSPICION_REVIEW_ENDPOINT ||
    reviewLines.length === 0
  ) {
    return {
      finalReviewCandidates: [],
      reviewedCount: 0,
      dismissedCount: 0,
      heldLocalReviewCount: 0,
      escalatedCount: 0,
      discoveredCount: 0,
      dispatchSummary: skippedDispatchSummary,
    };
  }

  const requestPayload: SuspicionReviewRequestPayload = {
    apiVersion: "1.0",
    importOpId,
    sessionId,
    totalReviewed: classified.length,
    reviewLines,
  };

  try {
    const { default: axios } = await import("axios");
    const response = await axios.post<SuspicionReviewResponsePayload>(
      SUSPICION_REVIEW_ENDPOINT,
      requestPayload,
      { timeout: 180_000 }
    );
    const data = response.data;
    if (data.status === "error") {
      throw new Error(data.message || "فشلت طبقة الشك بالنموذج.");
    }

    const mergedCandidates = mergeSuspicionReviewCandidates({
      localCandidates,
      response: data,
      classified,
      importSource: reviewLines[0]?.sourceHints.importSource ?? "unknown",
    });

    return {
      finalReviewCandidates: mergedCandidates,
      reviewedCount: data.reviewedLines.length,
      dismissedCount: data.reviewedLines.filter(
        (item) => item.verdict === "dismiss"
      ).length,
      heldLocalReviewCount: data.reviewedLines.filter(
        (item) => item.routingBand === "local-review"
      ).length,
      escalatedCount: data.reviewedLines.filter(
        (item) => item.verdict === "escalate"
      ).length,
      discoveredCount: data.discoveredLines.length,
      dispatchSummary: {
        ...preparedDispatchSummary,
        totalLocalCases: eligibleDispatchSummary.totalLocalCases,
        passSkipped: eligibleDispatchSummary.passSkipped,
      },
    };
  } catch (error) {
    agentReviewLogger.error("suspicion-model-layer-failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new ProgressivePipelineStageError(
      "suspicion-review",
      error instanceof Error ? error.message : "فشلت طبقة الشك بالنموذج."
    );
  }
};
