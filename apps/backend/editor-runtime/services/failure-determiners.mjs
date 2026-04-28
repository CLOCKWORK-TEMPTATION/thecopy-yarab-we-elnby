/**
 * @description محدّدات حالات الفشل
 */

/**
 * @description تحديد مرحلة الفشل
 */
export function determineFailureStage(karank, suspicion, finalReview) {
  if (!karank.success) return "karank-pipeline";
  if (!suspicion.reached && suspicion.error?.code !== "SUSPICION_MODEL_DISABLED") {
    return "suspicion-review";
  }
  if (!finalReview.reached && finalReview.error?.code !== "FINAL_REVIEW_DISABLED") {
    return "final-review";
  }
  return null;
}

/**
 * @description تحديد كود الفشل
 */
export function determineFailureCode(karank, suspicion, finalReview) {
  if (!karank.success) return karank.error.code;
  if (!suspicion.reached && suspicion.error?.code !== "SUSPICION_MODEL_DISABLED") {
    return suspicion.error.code;
  }
  if (!finalReview.reached && finalReview.error?.code !== "FINAL_REVIEW_DISABLED") {
    return finalReview.error.code;
  }
  return null;
}

/**
 * @description تحديد رسالة الفشل
 */
export function determineFailureMessage(karank, suspicion, finalReview) {
  if (!karank.success) return karank.error.message;
  if (!suspicion.reached && suspicion.error?.code !== "SUSPICION_MODEL_DISABLED") {
    return suspicion.error.message;
  }
  if (!finalReview.reached && finalReview.error?.code !== "FINAL_REVIEW_DISABLED") {
    return finalReview.error.message;
  }
  return null;
}
