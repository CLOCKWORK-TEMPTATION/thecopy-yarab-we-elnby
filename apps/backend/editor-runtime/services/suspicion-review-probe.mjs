/**
 * @description مسبار عملياتي لتشغيل خط أنابيب الاستيراد والشك والمراجعة النهائية
 *
 * يقوم بـ:
 * 1. تشغيل خط أنابيب الكرنك على التركيبة المرجعية
 * 2. عد حالات الشك من النتيجة
 * 3. محاولة استدعاء requestSuspicionReview مع بيانات التركيبة
 * 4. محاولة استدعاء requestFinalReview مع حالات الشك
 * 5. إرجاع إحصائيات عملياتية كاملة حول الجاهزية
 *
 * هذا مسبار حقيقي يثبت أن خط الأنابيب يعمل فعلاً.
 */

import {
  runKarankPipeline,
  countSuspicionCases,
} from "./karank-operations.mjs";
import {
  attemptSuspicionReview,
  attemptFinalReview,
} from "./review-attempts.mjs";
import {
  resolveSuspicionReviewEndpoint,
  resolveFinalReviewEndpoint,
} from "./endpoint-resolvers.mjs";
import {
  determineFailureStage,
  determineFailureCode,
  determineFailureMessage,
} from "./failure-determiners.mjs";
import {
  EXPECTED_SUSPICION_CASES,
  EXPECTED_FINAL_REVIEW_CANDIDATES,
  PROBE_VERSION,
  logger,
} from "./suspicion-probe-constants.mjs"; /**
 * @description المسبار العملياتي الرئيسي
 *
 * تشغيل كامل: كرنك + طلب مراجعة الشك + طلب المراجعة النهائية
 */
export async function probeOperationalReadiness(env = process.env) {
  const startTime = Date.now();
  const warnings = [];
  const errors = [];

  logger.info("═══════════════════════════════════════════════════════════");
  logger.info("بدء المسبار العملياتي");
  logger.info("═══════════════════════════════════════════════════════════");

  // 1. تشغيل خط أنابيب الكرنك
  const karank = await runKarankPipeline();

  if (!karank.success) {
    errors.push({
      stage: "karank-pipeline",
      code: karank.error.code,
      message: karank.error.message,
    });

    return {
      probeVersion: PROBE_VERSION,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
      settled: false,
      failureStage: "karank-pipeline",
      failureCode: karank.error.code,
      failureMessage: karank.error.message,
      karankPipelineRan: false,
      suspicionCasesCount: 0,
      suspicionModelReached: false,
      suspicionReviewedCount: 0,
      finalReviewCandidatesCount: 0,
      finalReviewReached: false,
      finalReviewAppliedCount: 0,
      warnings,
      errors,
    };
  }

  // 2. عد حالات الشك
  const suspicionStats = countSuspicionCases(karank.result);

  logger.info("حالات الشك المكتشفة", {
    casesCount: suspicionStats.casesCount,
    candidatesCount: suspicionStats.candidatesCount,
  });

  // 3. محاولة مراجعة الشك
  const suspicionReview = await attemptSuspicionReview(
    karank.result,
    suspicionStats.casesCount,
    env,
  );

  if (!suspicionReview.reached && suspicionReview.error) {
    if (
      suspicionReview.error.code !== "SUSPICION_MODEL_DISABLED" &&
      suspicionReview.error.code !== "GEMINI_API_KEY_MISSING"
    ) {
      errors.push({
        stage: "suspicion-review",
        code: suspicionReview.error.code,
        message: suspicionReview.error.message,
      });
    } else {
      warnings.push({
        stage: "suspicion-review",
        code: suspicionReview.error.code,
        message: suspicionReview.error.message,
      });
    }
  }

  // 4. محاولة المراجعة النهائية
  const finalReview = await attemptFinalReview(suspicionStats.details, env);

  if (!finalReview.reached && finalReview.error) {
    if (
      finalReview.error.code !== "FINAL_REVIEW_DISABLED" &&
      finalReview.error.code !== "API_KEY_MISSING"
    ) {
      errors.push({
        stage: "final-review",
        code: finalReview.error.code,
        message: finalReview.error.message,
      });
    } else {
      warnings.push({
        stage: "final-review",
        code: finalReview.error.code,
        message: finalReview.error.message,
      });
    }
  }

  // 5. تحديد حالة الفشل (إن وُجد)
  const failureStage = determineFailureStage(
    karank,
    suspicionReview,
    finalReview,
  );
  const failureCode = determineFailureCode(
    karank,
    suspicionReview,
    finalReview,
  );
  const failureMessage = determineFailureMessage(
    karank,
    suspicionReview,
    finalReview,
  );

  const settled = errors.length === 0;

  logger.info("انتهى المسبار العملياتي", {
    settled,
    karankPipelineRan: karank.success,
    suspicionCasesCount: suspicionStats.casesCount,
    suspicionModelReached: suspicionReview.reached,
    suspicionReviewedCount: suspicionReview.reviewed,
    finalReviewCandidatesCount: suspicionStats.candidatesCount,
    finalReviewReached: finalReview.reached,
    finalReviewAppliedCount: finalReview.applied,
    latencyMs: Date.now() - startTime,
  });

  return {
    probeVersion: PROBE_VERSION,
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - startTime,
    settled,
    failureStage,
    failureCode,
    failureMessage,
    karankPipelineRan: karank.success,
    karankSchemaElementCount: karank.result?.schemaElements?.length || 0,
    karankRawTextLength: karank.result?.rawText?.length || 0,
    suspicionCasesCount: suspicionStats.casesCount,
    suspicionModelReached: suspicionReview.reached,
    suspicionReviewedCount: suspicionReview.reviewed,
    suspicionDismissedCount: suspicionReview.dismissed,
    finalReviewCandidatesCount: suspicionStats.candidatesCount,
    finalReviewReached: finalReview.reached,
    finalReviewAppliedCount: finalReview.applied,
    warnings,
    errors,
  };
}

export default {
  probeOperationalReadiness,
  probeSuspicionReviewReadinessSync,
  EXPECTED_SUSPICION_CASES,
  EXPECTED_FINAL_REVIEW_CANDIDATES,
};
