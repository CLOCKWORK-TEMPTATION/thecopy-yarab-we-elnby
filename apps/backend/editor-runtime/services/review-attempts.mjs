/**
 * @description محاولات مراجعة الشك والمراجعة النهائية
 */

import { createSuspicionReviewRequest } from "../fixtures/reference-suspicion-fixture.mjs";
import { requestSuspicionReview } from "../suspicion-review.mjs";
import { requestFinalReview } from "../final-review.mjs";
import { logger } from "./suspicion-probe-constants.mjs";

/**
 * @description محاولة استدعاء requestSuspicionReview
 */
export async function attemptSuspicionReview(
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
export async function attemptFinalReview(
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
