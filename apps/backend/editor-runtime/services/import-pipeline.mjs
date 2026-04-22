/**
 * @description مسار الاستيراد الطرفي الحقيقي: استخراج أولي ثم تمرير إلزامي عبر الكرنك
 */

import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ExecFileClassifiedError } from "../exec-file-error-classifier.mjs";
import { runPdfOcrAgent } from "../pdf-ocr-agent-runner.mjs";
import { normalizeText } from "./text-normalizer.mjs";
import {
  convertDocBufferToText,
  decodeUtf8Fallback,
  runAntiwordPreflight,
} from "./doc-extractor.mjs";
import * as karankBridge from "../karank-bridge.mjs";

const DOCX_ENGINE_FAST_TIMEOUT_MS = (() => {
  const rawValue = process.env.DOCX_ENGINE_FAST_TIMEOUT_MS?.trim();
  const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : Number.NaN;
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 12_000;
})();

export const ANTIWORD_PREFLIGHT = runAntiwordPreflight();

const createPipelineError = (message, errorCode) =>
  Object.assign(new Error(`${message} [${errorCode}]`), {
    statusCode: 422,
    errorCode,
  });

const wrapKarankStageError = (
  error,
  contextMessage,
  timeoutCode,
  genericCode
) => {
  const message = error instanceof Error ? error.message : String(error);
  const isTimeout = /timeout|انتهت مهلة الطلب/iu.test(message);

  return Object.assign(
    new Error(
      `${contextMessage}: ${message} [${isTimeout ? timeoutCode : genericCode}]`
    ),
    {
      statusCode: isTimeout ? 504 : 422,
      errorCode: isTimeout ? timeoutCode : genericCode,
      cause: error,
    }
  );
};

const requireKarankExtraction = (engineResult, fallbackText) => {
  const schemaText = engineResult?.schemaText || engineResult?.schema_text || "";
  const schemaElements =
    engineResult?.schemaElements || engineResult?.schema_elements || [];
  const rawText =
    engineResult?.rawText || engineResult?.raw_text || fallbackText || "";

  if (!Array.isArray(schemaElements) || schemaElements.length === 0) {
    throw createPipelineError(
      "فشل الكرنك في إنتاج عناصر بنيوية صالحة.",
      "KARANK_EMPTY_RESULT"
    );
  }

  if (!String(rawText).trim()) {
    throw createPipelineError(
      "فشل الكرنك في إنتاج نص مرئي صالح.",
      "KARANK_EMPTY_VISIBLE_TEXT"
    );
  }

  return {
    schemaText: String(schemaText).trim() ? schemaText : rawText,
    schemaElements,
    rawText,
  };
};

const enrichWithEngine = async (extractedText, baseResult) => {
  let normalizedEngineResult;

  try {
    const engineResult = await karankBridge.parseText(extractedText);
    normalizedEngineResult = requireKarankExtraction(
      engineResult,
      baseResult.text
    );
  } catch (error) {
    throw wrapKarankStageError(
      error,
      "فشل الكرنك في تحليل النص المستخرج",
      "KARANK_STAGE_TIMEOUT",
      "KARANK_STAGE_FAILED"
    );
  }

  return {
    ...baseResult,
    text: normalizedEngineResult.rawText,
    method: "karank-engine-bridge",
    attempts: [...(baseResult.attempts || []), "karank-engine-bridge"],
    schemaText: normalizedEngineResult.schemaText,
    schemaElements: normalizedEngineResult.schemaElements,
    rawExtractedText: extractedText,
  };
};

export const extractByType = async (buffer, extension, filename) => {
  if (extension === "pdf") {
    const ocrResult = await runPdfOcrAgent({ buffer, filename });
    const text = typeof ocrResult?.text === "string" ? ocrResult.text : "";

    if (!text.trim()) {
      throw createPipelineError(
        "فشل مسار OCR في إنتاج نص صالح لملف PDF.",
        "OCR_EMPTY_RESULT"
      );
    }

    return enrichWithEngine(text, ocrResult);
  }

  if (extension === "txt" || extension === "fountain" || extension === "fdx") {
    const text = normalizeText(decodeUtf8Fallback(buffer));
    const baseResult = {
      text,
      method: "native-text",
      usedOcr: false,
      attempts: ["native-text"],
      warnings: [],
    };

    if (!text.trim()) {
      throw createPipelineError(
        `تعذر استخراج نص صالح من ملف ${extension.toUpperCase()}.`,
        "EMPTY_TEXT_RESULT"
      );
    }

    return enrichWithEngine(text, baseResult);
  }

  if (extension === "doc") {
    if (!ANTIWORD_PREFLIGHT.binaryAvailable) {
      throw new ExecFileClassifiedError(
        "تعذر استخراج DOC: antiword غير متاح. راجع health endpoint والتأكد من ANTIWORD_PATH.",
        {
          statusCode: 422,
          category: "binary-missing",
          classifiedError: {
            category: "binary-missing",
            antiwordPath: ANTIWORD_PREFLIGHT.antiwordPath,
          },
        }
      );
    }

    if (!ANTIWORD_PREFLIGHT.antiwordHomeExists) {
      throw new ExecFileClassifiedError(
        `تعذر استخراج DOC: مسار ANTIWORDHOME غير صالح (${ANTIWORD_PREFLIGHT.antiwordHome}).`,
        {
          statusCode: 422,
          category: "invalid-config",
          classifiedError: {
            category: "invalid-config",
            antiwordHome: ANTIWORD_PREFLIGHT.antiwordHome,
          },
        }
      );
    }

    const docResult = await convertDocBufferToText(buffer, filename);
    const docText = typeof docResult?.text === "string" ? docResult.text : "";

    if (!docText.trim()) {
      throw createPipelineError(
        "تعذر استخراج نص صالح من ملف DOC.",
        "DOC_EMPTY_RESULT"
      );
    }

    return enrichWithEngine(docText, docResult);
  }

  if (extension === "docx") {
    const tempPath = join(
      tmpdir(),
      `karank-${Date.now()}-${Math.random().toString(36).slice(2)}.docx`
    );

    try {
      await writeFile(tempPath, buffer);

      let normalizedEngineResult;
      try {
        const engineResult = await karankBridge.parseDocx(
          tempPath,
          DOCX_ENGINE_FAST_TIMEOUT_MS
        );
        normalizedEngineResult = requireKarankExtraction(engineResult, "");
      } catch (error) {
        throw wrapKarankStageError(
          error,
          "فشل الكرنك في تحليل ملف DOCX",
          "DOCX_KARANK_TIMEOUT",
          "DOCX_KARANK_FAILED"
        );
      }

      return {
        text: normalizedEngineResult.rawText,
        method: "karank-engine-bridge",
        usedOcr: false,
        attempts: ["karank-engine-bridge"],
        warnings: [],
        schemaText: normalizedEngineResult.schemaText,
        schemaElements: normalizedEngineResult.schemaElements,
        rawExtractedText: normalizedEngineResult.rawText,
      };
    } finally {
      await unlink(tempPath).catch(() => {});
    }
  }

  throw new Error(`Unsupported extension: ${extension}`);
};

export const runReferenceImportPipeline = async (
  referenceText,
  filename = "health-reference.txt"
) => extractByType(Buffer.from(referenceText, "utf8"), "txt", filename);
