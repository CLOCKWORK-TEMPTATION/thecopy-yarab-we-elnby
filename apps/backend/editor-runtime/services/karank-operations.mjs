/**
 * @description عمليات الكرنك للمسبار
 */

import { runReferenceImportPipeline } from "./import-pipeline.mjs";
import {
  REFERENCE_SUSPICION_FIXTURE,
  FIXTURE_METADATA,
} from "../fixtures/reference-suspicion-fixture.mjs";
import {
  SUSPICION_SCORE_THRESHOLD,
  FINAL_REVIEW_SCORE_THRESHOLD,
  logger,
} from "./suspicion-probe-constants.mjs";

/**
 * @description تشغيل خط أنابيب الكرنك على التركيبة المرجعية
 */
export async function runKarankPipeline() {
  logger.info("بدء تشغيل خط أنابيب الكرنك");

  try {
    const result = await runReferenceImportPipeline(
      REFERENCE_SUSPICION_FIXTURE,
      "probe-fixture.txt",
    );

    logger.info("نجح خط أنابيب الكرنك", {
      schemaElementCount: result.schemaElements?.length || 0,
      rawTextLength: result.rawText?.length || 0,
    });

    return {
      success: true,
      result,
      error: null,
    };
  } catch (error) {
    logger.error("فشل خط أنابيب الكرنك", {
      message: error.message,
      code: error.errorCode || "UNKNOWN",
    });

    return {
      success: false,
      result: null,
      error: {
        message: error.message,
        code: error.errorCode || "KARANK_PIPELINE_FAILED",
      },
    };
  }
}

/**
 * @description عد حالات الشك من نتيجة الكرنك
 */
export function countSuspicionCases(
  karankResult,
  threshold = SUSPICION_SCORE_THRESHOLD,
) {
  if (
    !karankResult?.schemaElements ||
    !Array.isArray(karankResult.schemaElements)
  ) {
    return { casesCount: 0, candidatesCount: 0, details: [] };
  }

  const suspicionDetails = [];
  let casesCount = 0;
  let candidatesCount = 0;

  // إنشاء خريطة من معرّفات الأسطر المريبة من التركيبة
  const suspiciousMap = new Map(
    Object.entries(FIXTURE_METADATA.suspiciousLineIdentifiers || {}),
  );

  for (const element of karankResult.schemaElements) {
    // محاولة استخراج درجة الشك من خصائص العنصر
    const suspicionScore =
      element.suspicionScore ?? calculateSuspicionScoreFromElement(element);

    if (suspicionScore >= threshold) {
      casesCount++;

      if (suspicionScore >= FINAL_REVIEW_SCORE_THRESHOLD) {
        candidatesCount++;
      }

      suspicionDetails.push({
        element: element.id || element.text || "unknown",
        score: suspicionScore,
        isCandidate: suspicionScore >= FINAL_REVIEW_SCORE_THRESHOLD,
      });
    }
  }

  return {
    casesCount,
    candidatesCount,
    details: suspicionDetails,
  };
}

/**
 * @description حساب درجة الشك من عنصر الكرنك
 */
function calculateSuspicionScoreFromElement(element) {
  let score = 0;

  // كشف التطويل (tatweel)
  if (element.text?.includes("ـ")) {
    score += 70;
  }

  // كشف رؤوس المشاهد المركبة
  if (element.text?.match(/داخلي\/خارجي|خارجي\/داخلي/)) {
    score += 40;
  }

  // كشف (VO) غير المتوقع
  if (
    element.text?.includes("(VO)") &&
    !element.text?.match(/يقول|يتحدث|يقرأ/)
  ) {
    score += 35;
  }

  // كشف نصوص قصيرة جداً
  if (element.text && element.text.length < 5) {
    score += 10;
  }

  return Math.min(100, score);
}
