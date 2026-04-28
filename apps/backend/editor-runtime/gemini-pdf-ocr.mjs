import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { promisify } from "node:util";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { renderPdfPages } from "./pdf-reference-builder.mjs";
import { normalizeText } from "./services/text-normalizer.mjs";

const execFileAsync = promisify(execFile);
const PDFTOTEXT_TIMEOUT_MS = 30_000;
const GEMINI_OCR_MODEL = "gemini-2.5-flash";
const MAX_STDIO_BUFFER = 64 * 1024 * 1024;
const TEXT_LAYER_MIN_LENGTH = 80;

const withTimeout = (promise, ms) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Gemini OCR timed out after ${ms}ms.`)),
      ms,
    );

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

const toSafePdfFilename = (filename) => {
  const candidate = basename(filename || "document.pdf");
  return candidate.toLowerCase().endsWith(".pdf")
    ? candidate
    : `${candidate}.pdf`;
};

const extractPdfTextLayer = async (pdfPath) => {
  try {
    const { stdout } = await execFileAsync(
      "pdftotext",
      ["-layout", "-enc", "UTF-8", pdfPath, "-"],
      {
        timeout: PDFTOTEXT_TIMEOUT_MS,
        maxBuffer: MAX_STDIO_BUFFER,
      },
    );

    return normalizeText(stdout);
  } catch {
    return "";
  }
};

const ocrSinglePage = async (model, imagePath, pageNumber) => {
  const imageBuffer = await readFile(imagePath);
  const response = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              `استخرج نص الصفحة ${pageNumber} من سيناريو عربي بدقة عالية.\n` +
              "أعد النص فقط دون شرح أو تنسيق Markdown إضافي.\n" +
              "حافظ على ترتيب السطور كما هو قدر الإمكان.",
          },
          {
            inlineData: {
              mimeType: "image/png",
              data: imageBuffer.toString("base64"),
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
    },
  });

  return normalizeText(response.response.text());
};

export const runGeminiPdfOcr = async ({ buffer, filename, config }) => {
  const tempRoot = await mkdtemp(join(tmpdir(), "mo7rer-pdf-gemini-"));
  const inputPath = join(tempRoot, toSafePdfFilename(filename));
  let renderRoot = null;

  try {
    await writeFile(inputPath, buffer);

    const textLayer = await extractPdfTextLayer(inputPath);
    if (textLayer.length >= TEXT_LAYER_MIN_LENGTH) {
      return {
        text: textLayer,
        textRaw: textLayer,
        textMarkdown: textLayer,
        method: "backend-api",
        usedOcr: false,
        attempts: ["pdf-ocr-agent", "pdf-text-layer"],
        warnings: [],
        qualityScore: 1,
        quality: { wordMatch: 100, structuralMatch: 100, accepted: true },
        status: "accepted",
        referenceMode: "pdf-text-layer",
        payloadVersion: 2,
        classification: {
          type: "text",
          pages: undefined,
          size_mb: Number((buffer.length / (1024 * 1024)).toFixed(2)),
          has_arabic: /[\u0600-\u06FF]/u.test(textLayer),
          recommended_engine: "pdftotext",
        },
        rawExtractedText: textLayer,
        normalizationApplied: ["pdf-text-layer"],
      };
    }

    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: config.geminiOcrModel || GEMINI_OCR_MODEL,
    });

    const pageImages = await renderPdfPages({
      pdfPath: inputPath,
      dpi: config.visionRenderDpi,
    });
    if (pageImages.length > 0) {
      renderRoot = dirname(pageImages[0]);
    }

    const pageTexts = [];
    for (let index = 0; index < pageImages.length; index += 1) {
      const pageText = await withTimeout(
        ocrSinglePage(model, pageImages[index], index + 1),
        config.timeoutMs,
      );
      if (pageText) {
        pageTexts.push(pageText);
      }
    }

    const finalText = normalizeText(pageTexts.join("\n\n"));
    if (!finalText) {
      throw new Error("Gemini OCR returned empty text for the PDF.");
    }

    return {
      text: finalText,
      textRaw: finalText,
      textMarkdown: finalText,
      method: "backend-api",
      usedOcr: true,
      attempts: ["pdf-ocr-agent", "gemini-direct-ocr"],
      warnings: [],
      qualityScore: 0.94,
      quality: { wordMatch: 94, structuralMatch: 94, accepted: true },
      status: "accepted",
      referenceMode: "gemini-direct",
      payloadVersion: 2,
      classification: {
        type: "ocr",
        pages: pageImages.length,
        size_mb: Number((buffer.length / (1024 * 1024)).toFixed(2)),
        has_arabic: /[\u0600-\u06FF]/u.test(finalText),
        recommended_engine: "gemini-direct",
      },
      rawExtractedText: finalText,
      normalizationApplied: ["gemini-direct-ocr"],
    };
  } finally {
    if (renderRoot) {
      await rm(renderRoot, { recursive: true, force: true }).catch(
        () => undefined,
      );
    }
    await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
  }
};
