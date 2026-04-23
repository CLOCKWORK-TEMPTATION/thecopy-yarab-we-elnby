/**
 * @description متحكم استخراج النصوص الموحّد — نقطة الدخول المشتركة لجميع مسارات الاستقبال
 * يُعيد `UnifiedReceptionResponse` متطابقة بغض النظر عن المصدر (paste | doc | docx)
 * @note مرجع ظلي فقط داخل الويب.
 * لا يجوز ربط أي مسار حي بهذا الملف بعد اعتماد backend runtime الرسمي.
 *
 * FR-016: مهلة 30 ثانية
 * FR-017: تسجيل تفصيلي لمرحلة الاستخراج
 */

export const SHADOW_RUNTIME_REFERENCE_ONLY = true;

import { randomUUID } from "node:crypto";
import { sendJson, readRawBody } from "../utils/http-helpers.mjs";
import { normalizeIncomingText } from "../services/text-normalizer.mjs";
import * as karankBridge from "../karank-bridge.mjs";
import {
  recordStageStart,
  recordStageComplete,
  recordStageFailure,
} from "../utils/pipeline-telemetry.mjs";

const MAX_TEXT_LENGTH = 200_000;
const REQUEST_TIMEOUT_MS = 30_000;
const VALID_SOURCE_TYPES = new Set(["paste", "doc", "docx"]);

/**
 * تشغيل عملية مع مهلة زمنية
 * @param {Promise<T>} promise
 * @param {number} ms
 * @returns {Promise<T>}
 */
const withTimeout = (promise, ms) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });

class TimeoutError extends Error {
  constructor(ms) {
    super(`استغرقت معالجة الخادم وقتاً أطول من المسموح (${ms / 1_000} ثانية).`);
    this.name = "TimeoutError";
    this.code = "TIMEOUT";
  }
}

class KarankExtractionError extends Error {
  constructor(message, code = "KARANK_EXTRACTION_FAILED") {
    super(message);
    this.name = "KarankExtractionError";
    this.code = code;
    this.statusCode = 422;
  }
}

const isKarankTimeoutMessage = (message) =>
  /timeout|انتهت مهلة الطلب/iu.test(String(message ?? ""));

/**
 * بناء عناصر الاستجابة الموحدة من ناتج المحرك
 * @param {Array} schemaElements - عناصر المحرك
 * @returns {Array} عناصر UnifiedReceptionResponse
 */
const buildResponseElements = (schemaElements) =>
  schemaElements.map((el, index) => ({
    id: `elem-${index}`,
    originalText: el.value || el.text || "",
    normalizedText: (el.value || el.text || "").trim(),
    suggestedType: el.element || undefined,
    metadata: el.confidence != null ? { confidence: el.confidence } : undefined,
  }));

export const handleTextExtract = async (req, res) => {
  const importOpId = randomUUID();
  const startTime = performance.now();

  try {
    const rawBody = await readRawBody(req);
    const bodyText = rawBody.toString("utf8");

    let parsedBody;
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      sendJson(res, 400, {
        error: { code: "INVALID_JSON", message: "Invalid JSON body." },
      });
      return;
    }

    // استخراج وتحقق الحقول
    const content = parsedBody?.content ?? parsedBody?.text;
    if (typeof content !== "string") {
      sendJson(res, 400, {
        error: {
          code: "MISSING_CONTENT",
          message: "الحقل content (أو text) مطلوب ويجب أن يكون نصاً.",
        },
      });
      return;
    }

    const sourceType = VALID_SOURCE_TYPES.has(parsedBody.sourceType)
      ? parsedBody.sourceType
      : "paste";

    const text = normalizeIncomingText(content, MAX_TEXT_LENGTH);
    if (!text.trim()) {
      sendJson(res, 400, {
        error: {
          code: "EMPTY_TEXT",
          message: "النص فارغ بعد التطبيع.",
        },
      });
      return;
    }

    // --- بدء مرحلة الاستخراج (Telemetry) ---
    recordStageStart(importOpId, "extraction", sourceType);

    const timeoutMs = parsedBody.options?.timeoutMs ?? REQUEST_TIMEOUT_MS;

    const engineResult = await withTimeout(
      karankBridge.parseText(text),
      Math.min(timeoutMs, REQUEST_TIMEOUT_MS)
    );

    const schemaElements =
      engineResult.schemaElements || engineResult.schema_elements || [];
    const rawText = engineResult.rawText || engineResult.raw_text || text;
    if (!Array.isArray(schemaElements) || schemaElements.length === 0) {
      throw new KarankExtractionError(
        "فشل الكرنك في إنتاج عناصر بنيوية صالحة لهذا النص.",
        "KARANK_EMPTY_RESULT"
      );
    }

    const processingTimeMs = Math.round(performance.now() - startTime);

    recordStageComplete(importOpId, "extraction", sourceType);

    // --- بناء الاستجابة الموحدة ---
    /** @type {import('../../src/types/unified-reception').UnifiedReceptionResponse} */
    const response = {
      rawText,
      elements: buildResponseElements(schemaElements),
      extractionMeta: {
        sourceType,
        processingTimeMs,
        success: true,
      },
    };

    sendJson(res, 200, response);
  } catch (error) {
    const sourceType = "paste"; // fallback

    if (error instanceof TimeoutError) {
      recordStageFailure(importOpId, "extraction", sourceType, error);
      sendJson(res, 504, {
        error: {
          code: "TIMEOUT",
          message: error.message,
        },
      });
      return;
    }
    if (error instanceof KarankExtractionError) {
      recordStageFailure(importOpId, "extraction", sourceType, error);
      sendJson(res, error.statusCode, {
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }
    if (isKarankTimeoutMessage(error?.message)) {
      recordStageFailure(importOpId, "extraction", sourceType, error);
      sendJson(res, 504, {
        error: {
          code: "KARANK_TIMEOUT",
          message:
            error instanceof Error
              ? error.message
              : "Karank request timed out.",
        },
      });
      return;
    }

    const message =
      error instanceof Error ? error.message : "Unknown server error";
    recordStageFailure(importOpId, "extraction", sourceType, error);
    console.error("[text-extract] Error:", message);

    sendJson(res, 500, {
      error: {
        code: "EXTRACTION_FAILED",
        message: `تعذر الاتصال بمحرك التحليل. ${message}`,
      },
    });
  }
};
