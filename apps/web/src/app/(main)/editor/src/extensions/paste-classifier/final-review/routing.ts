/**
 * @module extensions/paste-classifier/final-review/routing
 *
 * منطق توجيه الحالات المشتبه بها إلى مراحل النموذج:
 * - promoteHighSeveritySuspicionCases: ترقية agent-candidate ذات alternative-pull
 *   عالية إلى agent-forced.
 * - computeFinalReviewRoutingStats: إحصاءات count* لكل band.
 * - shouldEscalatePayloadToFinalReview: قرار تصعيد payload إلى المراجعة النهائية.
 * - selectFinalReviewPayloads: اختيار المرشحين بحدّ أقصى = max(1, ceil(total*ratio)).
 */

import type { SuspicionCase } from "@editor/suspicion-engine/types";
import type {
  ReviewRoutingStats as FinalReviewRoutingStats,
  FinalReviewSuspiciousLinePayload,
} from "@editor/types/final-review";

import { FINAL_REVIEW_MAX_RATIO, FINAL_REVIEW_PROMOTION_THRESHOLD } from "../../paste-classifier-config";

/**
 * ترقية حالات agent-candidate ذات alternative-pull قوي (≥ promotion threshold)
 * إلى agent-forced. باقي الحالات تبقى كما هي.
 */
export const promoteHighSeveritySuspicionCases = (
  cases: readonly SuspicionCase[]
): SuspicionCase[] =>
  cases.map((caseItem) => {
    if (caseItem.band !== "agent-candidate") return caseItem;
    const hasHighPull = caseItem.signals.some(
      (signal) =>
        signal.signalType === "alternative-pull" &&
        signal.score >= FINAL_REVIEW_PROMOTION_THRESHOLD
    );
    if (!hasHighPull) return caseItem;
    return { ...caseItem, band: "agent-forced" };
  });

/**
 * إحصاءات الـ bands عبر مجموعة حالات اشتباه.
 */
export const computeFinalReviewRoutingStats = (
  cases: readonly SuspicionCase[]
): FinalReviewRoutingStats => {
  let countPass = 0;
  let countLocalReview = 0;
  let countAgentCandidate = 0;
  let countAgentForced = 0;

  for (const caseItem of cases) {
    switch (caseItem.band) {
      case "pass":
        countPass += 1;
        break;
      case "local-review":
        countLocalReview += 1;
        break;
      case "agent-candidate":
        countAgentCandidate += 1;
        break;
      case "agent-forced":
        countAgentForced += 1;
        break;
    }
  }

  return { countPass, countLocalReview, countAgentCandidate, countAgentForced };
};

/**
 * قرار تصعيد payload إلى المراجعة النهائية:
 * - agent-forced
 * - critical
 * - score ≥ 85
 * - distinctSignalFamilies ≥ 2
 * - أو تعارض النوع المقترح مع المُسنَد.
 */
export const shouldEscalatePayloadToFinalReview = (
  payload: FinalReviewSuspiciousLinePayload
): boolean => {
  if (payload.routingBand === "agent-forced") return true;
  if (payload.critical) return true;
  if (payload.suspicionScore >= 85) return true;
  if (payload.distinctSignalFamilies >= 2) return true;
  return Boolean(
    payload.primarySuggestedType &&
      payload.primarySuggestedType !== payload.assignedType
  );
};

/**
 * اختيار payloads المراجعة النهائية بحد أقصى نسبي
 * مع تفضيل agent-forced ثم suspicionScore الأعلى.
 */
export const selectFinalReviewPayloads = (
  suspiciousLines: readonly FinalReviewSuspiciousLinePayload[],
  totalReviewed: number
): FinalReviewSuspiciousLinePayload[] => {
  const cap = Math.max(1, Math.ceil(totalReviewed * FINAL_REVIEW_MAX_RATIO));
  return [...suspiciousLines]
    .filter(shouldEscalatePayloadToFinalReview)
    .sort((a, b) => {
      if (
        a.routingBand === "agent-forced" &&
        b.routingBand !== "agent-forced"
      )
        return -1;
      if (
        b.routingBand === "agent-forced" &&
        a.routingBand !== "agent-forced"
      )
        return 1;
      return b.suspicionScore - a.suspicionScore;
    })
    .slice(0, cap);
};
