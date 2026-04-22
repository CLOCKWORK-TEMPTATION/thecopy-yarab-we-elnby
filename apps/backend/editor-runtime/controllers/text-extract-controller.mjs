/**
 * @description متحكم تمرير النص الحالي إلى الكرنك لإنتاج النسخة البنيوية المرئية
 */

import { createHash, randomUUID } from "node:crypto";
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
const VALID_SOURCE_TYPES = new Set(["paste", "doc", "docx", "pdf"]);

const withTimeout = (promise, ms) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

class TimeoutError extends Error {
  constructor(ms) {
    super(`استغرقت معالجة الكرنك وقتاً أطول من المسموح (${ms / 1_000} ثانية).`);
    this.name = "TimeoutError";
    this.code = "TIMEOUT";
  }
}

class KarankExtractionError extends Error {
  constructor(message, code = "KARANK_EXTRACTION_FAILED", statusCode = 422) {
    super(message);
    this.name = "KarankExtractionError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

const isKarankTimeoutMessage = (message) =>
  /timeout|انتهت مهلة الطلب/iu.test(String(message ?? ""));

const toNonEmptyString = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const buildElementId = (elementType, text, index) => {
  const hash = createHash("sha1")
    .update(`${elementType}\u0000${text}\u0000${index}`)
    .digest("hex")
    .slice(0, 12);
  return `karank-${hash}`;
};

const buildSchemaElements = (schemaElements) =>
  schemaElements.map((element, index) => {
    const elementType = toNonEmptyString(
      element?.elementType ?? element?.element ?? element?.type
    );
    const text = toNonEmptyString(
      element?.text ?? element?.value ?? element?.content
    );
    const fallbackType = elementType || "unknown";
    const fallbackText = text || `element-${index + 1}`;

    return {
      elementId:
        toNonEmptyString(element?.elementId) ||
        buildElementId(fallbackType, fallbackText, index),
      elementType: fallbackType,
      text: fallbackText,
      confidence:
        typeof element?.confidence === "number" &&
        Number.isFinite(element.confidence)
          ? element.confidence
          : undefined,
    };
  });

const buildLegacyElements = (schemaElements) =>
  schemaElements.map((element, index) => ({
    id: element.elementId,
    elementId: element.elementId,
    originalText: element.text,
    normalizedText: element.text.trim(),
    suggestedType: element.elementType,
    metadata:
      element.confidence != null
        ? { confidence: element.confidence, orderIndex: index }
        : { orderIndex: index },
  }));

const assessVisibleTextValidity = (rawText, sourceText) => {
  const normalizedRawText = toNonEmptyString(rawText);
  const normalizedSourceText = toNonEmptyString(sourceText);

  if (!normalizedRawText) {
    return "invalid-empty";
  }

  if (!normalizedSourceText) {
    return "valid";
  }

  const ratio = normalizedRawText.length / Math.max(normalizedSourceText.length, 1);
  if (ratio < 0.35) {
    return "invalid-degraded";
  }

  return "valid";
};

const createErrorPayload = (message, code) => ({
  error: {
    code,
    message,
  },
});

export const handleTextExtract = async (req, res) => {
  const importOpId = randomUUID();
  const startTime = performance.now();
  let sourceType = "paste";
  let runId = randomUUID();
  let inputVisibleVersionId = null;

  try {
    const rawBody = await readRawBody(req);
    const bodyText = rawBody.toString("utf8");

    let parsedBody;
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      sendJson(res, 400, createErrorPayload("Invalid JSON body.", "INVALID_JSON"));
      return;
    }

    const content = parsedBody?.content ?? parsedBody?.text;
    if (typeof content !== "string") {
      sendJson(
        res,
        400,
        createErrorPayload(
          "الحقل content (أو text) مطلوب ويجب أن يكون نصاً.",
          "MISSING_CONTENT"
        )
      );
      return;
    }

    sourceType = VALID_SOURCE_TYPES.has(parsedBody.sourceType)
      ? parsedBody.sourceType
      : "paste";
    runId =
      typeof parsedBody.runId === "string" && parsedBody.runId.trim()
        ? parsedBody.runId.trim()
        : runId;
    inputVisibleVersionId =
      typeof parsedBody.visibleVersionId === "string" &&
      parsedBody.visibleVersionId.trim()
        ? parsedBody.visibleVersionId.trim()
        : null;

    const text = normalizeIncomingText(content, MAX_TEXT_LENGTH);
    if (!text.trim()) {
      sendJson(
        res,
        400,
        createErrorPayload("النص فارغ بعد التطبيع.", "EMPTY_TEXT")
      );
      return;
    }

    recordStageStart(importOpId, "karank", sourceType, {
      runId,
      visibleVersionId: inputVisibleVersionId,
    });

    const timeoutMs = parsedBody.options?.timeoutMs ?? REQUEST_TIMEOUT_MS;
    const engineResult = await withTimeout(
      karankBridge.parseText(text),
      Math.min(timeoutMs, REQUEST_TIMEOUT_MS)
    );

    const schemaText =
      engineResult.schemaText || engineResult.schema_text || "";
    const rawText = engineResult.rawText || engineResult.raw_text || text;
    const rawSchemaElements =
      engineResult.schemaElements || engineResult.schema_elements || [];

    if (!Array.isArray(rawSchemaElements) || rawSchemaElements.length === 0) {
      throw new KarankExtractionError(
        "فشل الكرنك في إنتاج عناصر بنيوية صالحة لهذا النص.",
        "KARANK_EMPTY_RESULT"
      );
    }

    const schemaElements = buildSchemaElements(rawSchemaElements);
    const visibleTextValidity = assessVisibleTextValidity(rawText, text);
    if (visibleTextValidity !== "valid") {
      throw new KarankExtractionError(
        "النص المرئي العائد من الكرنك غير صالح للاستبدال المباشر.",
        "KARANK_INVALID_VISIBLE_TEXT"
      );
    }

    const processingTimeMs = Math.round(performance.now() - startTime);
    const visibleVersionId = `karank-${randomUUID()}`;
    const legacyElements = buildLegacyElements(schemaElements);

    recordStageComplete(importOpId, "karank", sourceType, {
      runId,
      visibleVersionId,
      processingTimeMs,
      schemaElementCount: schemaElements.length,
    });

    sendJson(res, 200, {
      runId,
      visibleVersion: {
        visibleVersionId,
        stage: "karank",
        text: rawText,
        processingTimeMs,
      },
      guidance: {
        rawText,
        schemaText: schemaText || rawText,
        visibleTextValidity,
        schemaElements,
      },
      rawText,
      elements: legacyElements,
      extractionMeta: {
        sourceType,
        processingTimeMs,
        success: true,
        progressiveStage: "karank-visible",
      },
    });
  } catch (error) {
    if (error instanceof TimeoutError) {
      recordStageFailure(importOpId, "karank", sourceType, error, {
        runId,
        visibleVersionId: inputVisibleVersionId,
      });
      sendJson(res, 504, createErrorPayload(error.message, "TIMEOUT"));
      return;
    }

    if (error instanceof KarankExtractionError) {
      recordStageFailure(importOpId, "karank", sourceType, error, {
        runId,
        visibleVersionId: inputVisibleVersionId,
      });
      sendJson(
        res,
        error.statusCode,
        createErrorPayload(error.message, error.code)
      );
      return;
    }

    if (isKarankTimeoutMessage(error?.message)) {
      recordStageFailure(importOpId, "karank", sourceType, error, {
        runId,
        visibleVersionId: inputVisibleVersionId,
      });
      sendJson(
        res,
        504,
        createErrorPayload(
          error instanceof Error ? error.message : "Karank request timed out.",
          "KARANK_TIMEOUT"
        )
      );
      return;
    }

    const message =
      error instanceof Error ? error.message : "Unknown server error";
    recordStageFailure(importOpId, "karank", sourceType, error, {
      runId,
      visibleVersionId: inputVisibleVersionId,
    });
    console.error("[text-extract] Error:", message);

    sendJson(
      res,
      500,
      createErrorPayload(`تعذر الاتصال بمحرك التحليل. ${message}`, "EXTRACTION_FAILED")
    );
  }
};
