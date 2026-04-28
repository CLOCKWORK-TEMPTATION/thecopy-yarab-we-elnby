import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import pino from "pino";
import { getPdfOcrAgentConfig } from "./pdf-ocr-agent-config.mjs";
import { stripOcrArtifactLines } from "./ocr-text-cleanup.mjs";
import { probePdftoppmDependency } from "./pdf-reference-builder.mjs";
import {
  toSafePdfFilename,
  getMockMode,
  buildMockSuccessResult,
  buildRunFileKey,
} from "./lib/utils.mjs";
import {
  runOpenPdfAgentScript,
  runClassifyScript,
  runVisionProofreadStage,
  runVisionQAStage,
  exportProofreadDocx,
} from "./lib/pipeline.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");

const logger = pino({
  name: "pdf-ocr-agent",
  level: process.env.PDF_OCR_AGENT_LOG_LEVEL || "info",
});

const CANONICAL_MISTRAL_OCR_MODEL = "mistral-ocr-latest";
const MISMATCH_REPORTS_ROOT = resolve(__dirname, "tmp", "mismatch-reports");

export const runPdfOcrAgent = async ({ buffer, filename }) => {
  const config = getPdfOcrAgentConfig();
  if (!config.enabled)
    throw new Error("PDF OCR agent is disabled by configuration.");

  const mockMode = getMockMode();
  if (mockMode === "success") return buildMockSuccessResult();
  if (mockMode === "failure") throw new Error("PDF OCR agent mocked failure.");

  const pdftoppmProbe = await probePdftoppmDependency();
  if (!pdftoppmProbe.available)
    throw new Error(
      `[${pdftoppmProbe.errorCode}] ${pdftoppmProbe.errorMessage}`,
    );

  const tempRoot = await mkdtemp(join(tmpdir(), "mo7rer-pdf-ocr-"));
  const inputPath = join(tempRoot, toSafePdfFilename(filename));
  const ocrJsonPath = join(tempRoot, "ocr-result.json");
  const formattedTxtPath = join(tempRoot, "output.txt");
  const mcpNormalizedOutputPath = join(tempRoot, "mcp-normalized.md");

  const startedAt = Date.now();
  const attempts = ["pdf-ocr-agent"];
  const allWarnings = [];

  logger.info(
    {
      file: filename,
      timeoutMs: config.timeoutMs,
      pages: config.pages,
      enableClassification: config.enableClassification,
      enableEnhancement: config.enableEnhancement,
      enableVisionProofread: config.enableVisionProofread,
      visionProofreadModel: config.visionProofreadModel,
      visionCompareModel: config.visionCompareModel,
      visionJudgeModel: config.visionJudgeModel,
    },
    "pipeline-start",
  );

  try {
    await writeFile(inputPath, buffer);

    let classification = null;
    let pipelineFootprint = null;
    let finalText = "";
    let finalMarkdownText = "";
    let pipelinePages = 0;
    const pipelineModel = CANONICAL_MISTRAL_OCR_MODEL;

    attempts.push("pipeline-open-agent");
    const openAgentPayload = await runOpenPdfAgentScript(
      config,
      inputPath,
      ocrJsonPath,
      formattedTxtPath,
      mcpNormalizedOutputPath,
      logger,
    );

    classification =
      openAgentPayload?.classification &&
      typeof openAgentPayload.classification === "object"
        ? openAgentPayload.classification
        : null;
    pipelinePages =
      typeof classification?.pages === "number"
        ? Number(classification.pages)
        : 0;
    finalText =
      typeof openAgentPayload?.text === "string" ? openAgentPayload.text : "";
    finalMarkdownText =
      typeof openAgentPayload?.textMarkdown === "string"
        ? openAgentPayload.textMarkdown
        : "";
    if (!finalText.trim())
      throw new Error("open-pdf-agent returned empty raw text.");

    if (Array.isArray(openAgentPayload?.attempts))
      attempts.push(
        ...openAgentPayload.attempts.filter(
          (entry) => typeof entry === "string" && entry.trim(),
        ),
      );
    if (Array.isArray(openAgentPayload?.warnings))
      allWarnings.push(
        ...openAgentPayload.warnings.filter(
          (entry) => typeof entry === "string" && entry.trim(),
        ),
      );

    const checkedDirectories = Array.isArray(
      openAgentPayload?.meta?.footprint?.checkedDirectories,
    )
      ? openAgentPayload.meta.footprint.checkedDirectories.filter(
          (entry) => typeof entry === "string" && entry.trim(),
        )
      : [];
    const checkedFiles = Array.isArray(
      openAgentPayload?.meta?.footprint?.checkedFiles,
    )
      ? openAgentPayload.meta.footprint.checkedFiles.filter(
          (entry) => typeof entry === "string" && entry.trim(),
        )
      : [];
    if (checkedDirectories.length > 0 || checkedFiles.length > 0)
      pipelineFootprint = { checkedDirectories, checkedFiles };

    if (classification?.type === "protected")
      throw new Error("الملف محمي بكلمة مرور — يتطلب فك التشفير أولاً.");
    if (classification?.notes?.length)
      allWarnings.push(...classification.notes);

    const rawExtractedText = finalText;
    let artifactLinesRemoved = 0;
    let normalizationApplied = [];
    const cleaned = stripOcrArtifactLines(finalText);
    finalText = cleaned.text;
    artifactLinesRemoved = cleaned.removedLines;
    if (artifactLinesRemoved > 0) {
      normalizationApplied.push("strip-ocr-artifact-lines");
      allWarnings.push(`تم حذف ${artifactLinesRemoved} سطرًا مصطنعًا من OCR`);
      logger.info({ artifactLinesRemoved }, "ocr-artifacts-stripped");
    }

    if (!finalMarkdownText.trim()) {
      const { readFileIfExists } = await import("./lib/utils.mjs");
      const markdownFromFile = await readFileIfExists(mcpNormalizedOutputPath);
      if (markdownFromFile.trim()) finalMarkdownText = markdownFromFile;
      else finalMarkdownText = finalText;
    }

    // Vision Proofread
    const proofreadResult = await runVisionProofreadStage(
      config,
      finalText,
      finalMarkdownText,
      inputPath,
      ocrJsonPath,
      normalizationApplied,
      allWarnings,
      attempts,
      logger,
    );
    finalText = proofreadResult.finalText;
    finalMarkdownText = proofreadResult.finalMarkdownText;
    normalizationApplied = proofreadResult.normalizationApplied;

    // DOCX Export
    await exportProofreadDocx(finalText, filename, attempts, logger);

    // Vision QA
    const enableVisionQA = /^(1|true|yes|on)$/iu.test(
      (process.env.PDF_OCR_ENABLE_VISION_QA || "").trim(),
    );
    const qaResult = await runVisionQAStage(
      enableVisionQA,
      config,
      finalText,
      inputPath,
      ocrJsonPath,
      filename,
      attempts,
      allWarnings,
      logger,
      MISMATCH_REPORTS_ROOT,
    );

    const durationMs = Date.now() - startedAt;
    const uniqueAttempts = Array.from(
      new Set(attempts.filter((entry) => typeof entry === "string" && entry)),
    );

    logger.info(
      {
        file: filename,
        pages: pipelinePages,
        model: pipelineModel,
        classificationType: classification?.type ?? "skipped",
        artifactLinesRemoved,
        status: qaResult.status,
        referenceMode: qaResult.referenceMode,
        durationMs,
      },
      "pipeline-complete",
    );

    return {
      text: finalText,
      textRaw: finalText,
      textMarkdown: finalMarkdownText,
      method: "ocr-mistral",
      usedOcr: true,
      attempts: uniqueAttempts,
      warnings: allWarnings,
      qualityScore: Number((qaResult.quality.wordMatch / 100).toFixed(4)),
      quality: qaResult.quality,
      mismatchReport: qaResult.mismatchReport,
      status: qaResult.status,
      rejectionReason: qaResult.rejectionReason,
      referenceMode: qaResult.referenceMode,
      payloadVersion: 2,
      classification,
      rawExtractedText,
      pipelineFootprint,
      artifactLinesRemoved,
      normalizationApplied,
      mismatchReportPath: qaResult.mismatchReportPath,
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    logger.error(
      {
        file: filename,
        durationMs,
        attempts,
        error: error instanceof Error ? error.message : String(error),
      },
      "pipeline-failed",
    );
    throw new Error(
      `PDF OCR agent failed: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
  }
};
