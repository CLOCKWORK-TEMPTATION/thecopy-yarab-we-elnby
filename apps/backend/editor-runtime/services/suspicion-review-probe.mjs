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
  REFERENCE_SUSPICION_FIXTURE,
  FIXTURE_METADATA,
  createSuspicionReviewRequest,
} from "../fixtures/reference-suspicion-fixture.mjs";
import { runReferenceImportPipeline } from "./import-pipeline.mjs";
import { requestSuspicionReview } from "../suspicion-review.mjs";
import { requestFinalReview } from "../final-review.mjs";

// ─────────────────────────────────────────────────────────
// ثوابت المسبار
// ─────────────────────────────────────────────────────────

const SUSPICION_SCORE_THRESHOLD = 40;
const FINAL_REVIEW_SCORE_THRESHOLD = 60;
const PROBE_VERSION = "2.0.0";

// مسجل بسيط بدون pino
const createSimpleLogger = () => ({
  info: (msg, meta) => console.log(`[PROBE:INFO] ${msg}`, meta ? JSON.stringify(meta) : ""),
  warn: (msg, meta) => console.warn(`[PROBE:WARN] ${msg}`, meta ? JSON.stringify(meta) : ""),
  error: (msg, meta) => console.error(`[PROBE:ERROR] ${msg}`, meta ? JSON.stringify(meta) : ""),
});

const logger = createSimpleLogger();

// ─────────────────────────────────────────────────────────
// حالات الشك المتوقعة (للتوافق العكسي)
// ─────────────────────────────────────────────────────────

export const EXPECTED_SUSPICION_CASES = {
  minimum: FIXTURE_METADATA.statistics.expectedMinimumSuspicionCases || 2,
  detailed: FIXTURE_METADATA.intendedSuspicionCases || [],
};

/**
 * @description مرشحي المراجعة النهائية المتوقعون
 */
export const EXPECTED_FINAL_REVIEW_CANDIDATES = {
  minimum: FIXTURE_METADATA.statistics.expectedMinimumFinalReviewCandidates || 1,
  detailed: FIXTURE_METADATA.expectedFinalReviewCandidates || [],
};

// ─────────────────────────────────────────────────────────
// المسبار العملياتي الرئيسي
// ─────────────────────────────────────────────────────────

/**
 * @description تشغيل خط أنابيب الكرنك على التركيبة المرجعية
 */
async function runKarankPipeline() {
  logger.info("بدء تشغيل خط أنابيب الكرنك");
  
  try {
    const result = await runReferenceImportPipeline(
      REFERENCE_SUSPICION_FIXTURE,
      "probe-fixture.txt"
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
function countSuspicionCases(karankResult, threshold = SUSPICION_SCORE_THRESHOLD) {
  if (!karankResult?.schemaElements || !Array.isArray(karankResult.schemaElements)) {
    return { casesCount: 0, candidatesCount: 0, details: [] };
  }
  
  const suspicionDetails = [];
  let casesCount = 0;
  let candidatesCount = 0;
  
  // إنشاء خريطة من معرّفات الأسطر المريبة من التركيبة
  const suspiciousMap = new Map(
    Object.entries(FIXTURE_METADATA.suspiciousLineIdentifiers || {})
  );
  
  for (const element of karankResult.schemaElements) {
    // محاولة استخراج درجة الشك من خصائص العنصر
    const suspicionScore = element.suspicionScore ?? 
                          calculateSuspicionScoreFromElement(element);
    
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
  if (element.text?.includes("(VO)") && !element.text?.match(/يقول|يتحدث|يقرأ/)) {
    score += 35;
  }
  
  // كشف نصوص قصيرة جداً
  if (element.text && element.text.length < 5) {
    score += 10;
  }
  
  return Math.min(100, score);
}

/**
 * @description محاولة استدعاء requestSuspicionReview
 */
async function attemptSuspicionReview(
  karankResult,
  suspicionCasesCount,
  env = process.env
) {
  logger.info("بدء محاولة requestSuspicionReview");
  
  try {
    // التحقق من تفعيل نموذج الشك
    const suspicionEnabled = env.SUSPICION_MODEL_ENABLED !== "false";
    const hasGeminiKey = env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0;
    
    if (!suspicionEnabled) {
      return {
        reached: false,
        reviewed: 0,
        dismissed: 0,
        error: { code: "SUSPICION_MODEL_DISABLED", message: "نموذج الشك معطّل" },
      };
    }
    
    if (!hasGeminiKey) {
      return {
        reached: false,
        reviewed: 0,
        dismissed: 0,
        error: { code: "GEMINI_API_KEY_MISSING", message: "مفتاح Gemini API غير متوفر" },
      };
    }
    
    // بناء طلب مراجعة الشك
    const request = createSuspicionReviewRequest({
      importOpId: "operational-probe-001",
      sessionId: "probe-session-001",
    });
    
    // استدعاء requestSuspicionReview
    const response = await requestSuspicionReview(request);
    
    if (!response) {
      return {
        reached: true,
        reviewed: 0,
        dismissed: 0,
        error: { code: "EMPTY_RESPONSE", message: "رد فارغ من requestSuspicionReview" },
      };
    }
    
    // عد الأسطر المراجعة والمُرفوضة
    const reviewedLines = response.reviewedLines || response.processedLines || [];
    const dismissedLines = reviewedLines.filter(
      (line) => line.finalDecision === "dismiss" || line.status === "dismissed"
    ).length;
    
    logger.info("نجح requestSuspicionReview", {
      reviewed: reviewedLines.length,
      dismissed: dismissedLines,
    });
    
    return {
      reached: true,
      reviewed: reviewedLines.length,
      dismissed: dismissedLines,
      error: null,
    };
  } catch (error) {
    // التحقق من نوع الخطأ
    const isApiKeyMissing = error.message?.includes("GEMINI_API_KEY") ||
                           error.message?.includes("API key") ||
                           error.message?.includes("unauthorized");
    
    logger.warn("فشل requestSuspicionReview", {
      message: error.message,
      isApiKeyMissing,
    });
    
    return {
      reached: false,
      reviewed: 0,
      dismissed: 0,
      error: {
        code: isApiKeyMissing ? "GEMINI_API_KEY_MISSING" : "SUSPICION_REVIEW_FAILED",
        message: error.message,
      },
    };
  }
}

/**
 * @description محاولة استدعاء requestFinalReview
 */
async function attemptFinalReview(
  suspicionCases,
  env = process.env
) {
  logger.info("بدء محاولة requestFinalReview");
  
  try {
    // التحقق من تفعيل المراجعة النهائية
    const finalReviewEnabled = env.FINAL_REVIEW_ENABLED !== "false";
    const hasClaudeKey = env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.trim().length > 0;
    const hasGeminiKey = env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0;
    
    if (!finalReviewEnabled) {
      return {
        reached: false,
        applied: 0,
        error: { code: "FINAL_REVIEW_DISABLED", message: "المراجعة النهائية معطّلة" },
      };
    }
    
    if (!hasClaudeKey && !hasGeminiKey) {
      return {
        reached: false,
        applied: 0,
        error: {
          code: "API_KEY_MISSING",
          message: "لا توجد مفاتيح API متوفرة (ANTHROPIC_API_KEY أو GEMINI_API_KEY)",
        },
      };
    }
    
    // بناء طلب المراجعة النهائية من حالات الشك
    const suspiciousLines = suspicionCases.map((caseItem, idx) => ({
      itemId: `probe-line-${idx}`,
      lineIndex: idx,
      text: caseItem.text || "probe-text",
      assignedType: "character",
      routingBand: "agent-candidate",
      suspicionScore: caseItem.score || 75,
      reasonCodes: ["SPLIT_CHARACTER_NAME", "POSSIBLE_SCAN_ARTIFACT"],
      signalMessages: [],
      contextLines: [],
      fullText: caseItem.text || "probe-text",
      fingerprint: `probe-fp-${idx}`,
    }));
    
    const finalReviewRequest = {
      apiVersion: "2.0",
      mode: "auto-apply",
      importOpId: "operational-probe-001",
      sessionId: "probe-session-001",
      packetVersion: "1.0",
      schemaVersion: "1.0",
      suspiciousLines,
    };
    
    // استدعاء requestFinalReview
    const response = await requestFinalReview(finalReviewRequest);
    
    if (!response) {
      return {
        reached: true,
        applied: 0,
        error: { code: "EMPTY_RESPONSE", message: "رد فارغ من requestFinalReview" },
      };
    }
    
    // عد التعديلات المُطبقة
    const appliedCommands = response.appliedCommands || response.commands || [];
    const appliedCount = Array.isArray(appliedCommands) ? appliedCommands.length : 0;
    
    logger.info("نجح requestFinalReview", { applied: appliedCount });
    
    return {
      reached: true,
      applied: appliedCount,
      error: null,
    };
  } catch (error) {
    // التحقق من نوع الخطأ
    const isApiKeyMissing = error.message?.includes("API_KEY") ||
                           error.message?.includes("API key") ||
                           error.message?.includes("unauthorized");
    
    logger.warn("فشل requestFinalReview", {
      message: error.message,
      isApiKeyMissing,
    });
    
    return {
      reached: false,
      applied: 0,
      error: {
        code: isApiKeyMissing ? "API_KEY_MISSING" : "FINAL_REVIEW_FAILED",
        message: error.message,
      },
    };
  }
}

/**
 * @description حل نقطة نهاية مراجعة الشك
 */
function resolveSuspicionReviewEndpoint(env = process.env) {
  const suspicionEnabled = env.SUSPICION_MODEL_ENABLED !== "false";
  const hasGeminiKey = env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0;
  
  return suspicionEnabled && hasGeminiKey
    ? "gemini-2.5-flash"
    : null;
}

/**
 * @description حل نقطة نهاية المراجعة النهائية
 */
function resolveFinalReviewEndpoint(env = process.env) {
  const finalReviewEnabled = env.FINAL_REVIEW_ENABLED !== "false";
  const hasClaudeKey = env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.trim().length > 0;
  const hasGeminiKey = env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0;
  
  if (!finalReviewEnabled || (!hasClaudeKey && !hasGeminiKey)) {
    return null;
  }
  
  if (hasClaudeKey) {
    return "claude-sonnet-4";
  }
  
  return "gemini-2.5-flash";
}

/**
 * @description المسبار العملياتي الرئيسي
 * 
 * تشغيل كامل: كرنك + طلب مراجعة الشك + طلب المراجعة النهائية
 */
export async function probeOperationalReadiness(env = process.env) {
  const startTime = Date.now();
  const warnings = [];
  const errors = [];
  
  logger.info("═══════════════════════════════════════════════════════════");
  logger.info("بدء مسبار جاهزية عملياتي شامل");
  logger.info("═══════════════════════════════════════════════════════════");
  
  // الخطوة 1: تشغيل خط أنابيب الكرنك
  const karankResult = await runKarankPipeline();
  
  if (!karankResult.success) {
    logger.error("فشل خط أنابيب الكرنك - توقف المسبار");
    
    const latencyMs = Date.now() - startTime;
    
    return {
      probeVersion: PROBE_VERSION,
      timestamp: new Date().toISOString(),
      latencyMs,
      
      // دليل خط أنابيب الكرنك
      karankPipelineRan: false,
      karankSchemaElementCount: 0,
      karankRawTextLength: 0,
      
      // طبقة الشك
      suspicionCasesCount: 0,
      suspicionModelEnabled: env.SUSPICION_MODEL_ENABLED !== "false",
      suspicionModelReached: false,
      suspicionReviewedCount: 0,
      suspicionDismissedCount: 0,
      suspicionReviewEndpointResolved: false,
      suspicionReviewEndpointValue: null,
      
      // طبقة المراجعة النهائية
      finalReviewCandidatesCount: 0,
      finalReviewEnabled: env.FINAL_REVIEW_ENABLED !== "false",
      finalReviewReached: false,
      finalReviewAppliedCount: 0,
      finalReviewEndpointResolved: false,
      finalReviewEndpointValue: null,
      
      // التسوية
      settled: false,
      failureStage: "karank-pipeline",
      failureCode: karankResult.error.code,
      failureMessage: karankResult.error.message,
      
      warnings,
      errors: [
        {
          code: karankResult.error.code,
          message: karankResult.error.message,
        },
      ],
    };
  }
  
  logger.info("نجح خط أنابيب الكرنك");
  
  // الخطوة 2: عد حالات الشك
  const { casesCount, candidatesCount, details } = countSuspicionCases(
    karankResult.result
  );
  
  logger.info("عد حالات الشك", {
    cases: casesCount,
    candidates: candidatesCount,
  });
  
  // الخطوة 3: محاولة استدعاء requestSuspicionReview
  const suspicionReviewResult = await attemptSuspicionReview(
    karankResult.result,
    casesCount,
    env
  );
  
  if (suspicionReviewResult.error) {
    warnings.push({
      code: suspicionReviewResult.error.code,
      message: `تحذير طبقة الشك: ${suspicionReviewResult.error.message}`,
    });
  }
  
  // الخطوة 4: محاولة استدعاء requestFinalReview
  const finalReviewResult = await attemptFinalReview(details, env);
  
  if (finalReviewResult.error) {
    warnings.push({
      code: finalReviewResult.error.code,
      message: `تحذير المراجعة النهائية: ${finalReviewResult.error.message}`,
    });
  }
  
  // حل نقاط النهاية
  const suspicionEndpoint = resolveSuspicionReviewEndpoint(env);
  const finalReviewEndpoint = resolveFinalReviewEndpoint(env);
  
  // تحديد حالة التسوية
  const settled =
    karankResult.success &&
    (suspicionReviewResult.reached || suspicionReviewResult.error?.code === "SUSPICION_MODEL_DISABLED") &&
    (finalReviewResult.reached || finalReviewResult.error?.code === "FINAL_REVIEW_DISABLED");
  
  const latencyMs = Date.now() - startTime;
  
  logger.info("═══════════════════════════════════════════════════════════");
  logger.info("انتهى مسبار الجاهزية العملياتي", {
    settled,
    latencyMs,
    karankRan: karankResult.success,
    suspicionReached: suspicionReviewResult.reached,
    finalReviewReached: finalReviewResult.reached,
  });
  logger.info("═══════════════════════════════════════════════════════════");
  
  return {
    probeVersion: PROBE_VERSION,
    timestamp: new Date().toISOString(),
    latencyMs,
    
    // دليل خط أنابيب الكرنك
    karankPipelineRan: karankResult.success,
    karankSchemaElementCount: karankResult.result?.schemaElements?.length || 0,
    karankRawTextLength: karankResult.result?.rawText?.length || 0,
    
    // طبقة الشك
    suspicionCasesCount: casesCount,
    suspicionModelEnabled: env.SUSPICION_MODEL_ENABLED !== "false",
    suspicionModelReached: suspicionReviewResult.reached,
    suspicionReviewedCount: suspicionReviewResult.reviewed,
    suspicionDismissedCount: suspicionReviewResult.dismissed,
    suspicionReviewEndpointResolved: !!suspicionEndpoint,
    suspicionReviewEndpointValue: suspicionEndpoint,
    
    // طبقة المراجعة النهائية
    finalReviewCandidatesCount: candidatesCount,
    finalReviewEnabled: env.FINAL_REVIEW_ENABLED !== "false",
    finalReviewReached: finalReviewResult.reached,
    finalReviewAppliedCount: finalReviewResult.applied,
    finalReviewEndpointResolved: !!finalReviewEndpoint,
    finalReviewEndpointValue: finalReviewEndpoint,
    
    // التسوية
    settled,
    failureStage: settled ? null : determineFailureStage(karankResult, suspicionReviewResult, finalReviewResult),
    failureCode: settled ? null : determineFailureCode(karankResult, suspicionReviewResult, finalReviewResult),
    failureMessage: settled ? null : determineFailureMessage(karankResult, suspicionReviewResult, finalReviewResult),
    
    warnings,
    errors,
  };
}

/**
 * @description تحديد مرحلة الفشل
 */
function determineFailureStage(karank, suspicion, finalReview) {
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
function determineFailureCode(karank, suspicion, finalReview) {
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
function determineFailureMessage(karank, suspicion, finalReview) {
  if (!karank.success) return karank.error.message;
  if (!suspicion.reached && suspicion.error?.code !== "SUSPICION_MODEL_DISABLED") {
    return suspicion.error.message;
  }
  if (!finalReview.reached && finalReview.error?.code !== "FINAL_REVIEW_DISABLED") {
    return finalReview.error.message;
  }
  return null;
}

// ─────────────────────────────────────────────────────────
// نسخة مزامنة مبسطة (بدون استدعاءات AI)
// ─────────────────────────────────────────────────────────

/**
 * @description نسخة مزامنة من المسبار (كرنك فقط، بدون استدعاءات نماذج)
 */
export function probeSuspicionReviewReadinessSync(env = process.env) {
  const suspicionModelEnabled = env.SUSPICION_MODEL_ENABLED !== "false";
  const suspicionReviewEndpointResolved = 
    suspicionModelEnabled && env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0;
  
  const finalReviewEnabled = env.FINAL_REVIEW_ENABLED !== "false";
  const finalReviewEndpointResolved =
    finalReviewEnabled && (
      (env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.trim().length > 0) ||
      (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0)
    );
  
  return {
    suspicionModelEnabled,
    suspicionReviewEndpointResolved,
    suspicionReviewEndpointValue: suspicionReviewEndpointResolved
      ? "gemini-2.5-flash"
      : null,
    finalReviewEnabled,
    finalReviewEndpointResolved,
    finalReviewEndpointValue: finalReviewEndpointResolved
      ? env.ANTHROPIC_API_KEY
        ? "claude-sonnet-4"
        : "gemini-2.5-flash"
      : null,
    fixtureLoaded: !!REFERENCE_SUSPICION_FIXTURE,
    fixtureSuspicionCasesExpected: EXPECTED_SUSPICION_CASES.minimum,
    fixtureFinalReviewCandidatesExpected: EXPECTED_FINAL_REVIEW_CANDIDATES.minimum,
  };
}

export default {
  probeOperationalReadiness,
  probeSuspicionReviewReadinessSync,
  EXPECTED_SUSPICION_CASES,
  EXPECTED_FINAL_REVIEW_CANDIDATES,
};
