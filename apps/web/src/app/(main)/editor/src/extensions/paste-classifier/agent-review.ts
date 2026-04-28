/**
 * @module extensions/paste-classifier/agent-review
 *
 * تطبيق دالة مراجعة محلية مخصصة (agentReview) من خيارات الإضافة على
 * مصفوفة العناصر المصنفة. الإخفاق في المراجعة لا يكسر التدفق:
 * يُسجَّل خطأ ويُعاد التصنيف الأصلي.
 */

import type { ClassifiedDraftWithId } from "../paste-classifier-helpers";
import { agentReviewLogger } from "../paste-classifier-config";

/**
 * تطبيق دالة المراجعة المحلية. إذا أعادت مصفوفة فارغة يُحتفظ بالأصل.
 */
export const applyAgentReview = (
  classified: ClassifiedDraftWithId[],
  agentReview?: (
    classified: readonly ClassifiedDraftWithId[]
  ) => ClassifiedDraftWithId[]
): ClassifiedDraftWithId[] => {
  if (!agentReview) return classified;

  try {
    const reviewed = agentReview(classified);
    return reviewed.length > 0 ? reviewed : classified;
  } catch (error) {
    agentReviewLogger.error("local-review-failed", { error });
    return classified;
  }
};
