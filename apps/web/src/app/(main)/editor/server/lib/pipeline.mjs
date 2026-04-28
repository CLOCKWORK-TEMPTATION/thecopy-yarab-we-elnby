import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { runVisionProofread } from "../pdf-vision-proofread.mjs";
import { enforceTokenMatch } from "../token-enforcement.mjs";
import {
  buildPdfReference,
  renderPdfPages,
} from "../pdf-reference-builder.mjs";
import { stripOcrArtifactLines } from "../ocr-text-cleanup.mjs";
import { writeMismatchReport } from "../mismatch-reporter.mjs";
import { saveProofreadDocx } from "../proofread-docx-writer.mjs";
import {
  execFileAsync,
  toChildProcessEnv,
  parseJsonObject,
  readFileIfExists,
  buildCriticalTokenList,
  buildRunFileKey,
} from "./utils.mjs";

const MAX_STDIO_BUFFER = 64 * 1024 * 1024;
const CLASSIFY_TIMEOUT_MS = 30_000;
const WRITE_OUTPUT_TIMEOUT_MS = 60_000;
const PIPELINE_OPEN_AGENT_BOOT_TIMEOUT_MS = 10_000;
const CANONICAL_MISTRAL_OCR_MODEL = "mistral-ocr-latest";
const CANONICAL_MISTRAL_OCR_ENDPOINT = "https://api.mistral.ai/v1/ocr";
const CANONICAL_VISION_COMPARE_MODEL = "mistral-large-latest";

export const runOpenPdfAgentScript = async (
  config,
  inputPath,
  ocrJsonPath,
  outputTxtPath,
  outputMcpMdPath,
  logger
) => {
  logger.info(
    {
      script: config.openPdfAgentScriptPath,
      file: inputPath,
      pages: config.pages,
    },
    "open-agent-start"
  );
  const args = buildTsxNodeArgs(config.openPdfAgentScriptPath, [
    "--input",
    inputPath,
    "--output-json",
    ocrJsonPath,
    "--output-txt",
    outputTxtPath,
    "--output-mcp-md",
    outputMcpMdPath,
    "--pages",
    config.pages || "all",
  ]);
  const { stdout, stderr } = await execFileAsync(process.execPath, args, {
    timeout: config.timeoutMs + PIPELINE_OPEN_AGENT_BOOT_TIMEOUT_MS,
    maxBuffer: MAX_STDIO_BUFFER,
    env: toChildProcessEnv({
      MISTRAL_API_KEY: config.mistralApiKey,
      MISTRAL_OCR_MODEL: CANONICAL_MISTRAL_OCR_MODEL,
      MISTRAL_OCR_ENDPOINT: CANONICAL_MISTRAL_OCR_ENDPOINT,
      MOONSHOT_API_KEY: config.moonshotApiKey,
      PDF_VISION_COMPARE_MODEL: CANONICAL_VISION_COMPARE_MODEL,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
      OPEN_PDF_AGENT_VERIFY_FOOTPRINT: String(config.openAgentVerifyFootprint),
      OPEN_PDF_AGENT_ENABLE_MCP_STAGE: String(config.openAgentEnableMcpStage),
    }),
  });
  if (stderr?.trim())
    logger.debug({ stderr: stderr.trim() }, "open-agent-stderr");
  const payload = parseJsonObject(stdout.trim(), "open-pdf-agent");
  if (payload.success === false)
    throw new Error(
      `open-pdf-agent failed: ${typeof payload.error === "string" ? payload.error : "Unknown agent error"}`
    );
  logger.info(
    {
      classificationType:
        typeof payload?.classification?.type === "string"
          ? payload.classification.type
          : "unknown",
      mcpSummaryPreview:
        typeof payload?.meta?.mcp?.summary === "string"
          ? payload.meta.mcp.summary.slice(0, 120)
          : null,
    },
    "open-agent-complete"
  );
  return payload;
};

const buildTsxNodeArgs = (scriptPath, scriptArgs = [], extraImports = []) => {
  const nodeArgs = [];
  for (const importTarget of extraImports) {
    if (typeof importTarget === "string" && importTarget.trim())
      nodeArgs.push("--import", importTarget.trim());
  }
  nodeArgs.push("--import", "tsx", scriptPath, ...scriptArgs);
  return nodeArgs;
};

export const runClassifyScript = async (config, pdfPath, logger) => {
  logger.info(
    { script: config.classifyScriptPath, file: pdfPath },
    "classify-start"
  );
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      buildTsxNodeArgs(config.classifyScriptPath, [pdfPath]),
      {
        timeout: CLASSIFY_TIMEOUT_MS,
        maxBuffer: MAX_STDIO_BUFFER,
        env: toChildProcessEnv({ MISTRAL_API_KEY: config.mistralApiKey }),
      }
    );
    if (stderr?.trim())
      logger.debug({ stderr: stderr.trim() }, "classify-stderr");
    const result = JSON.parse(stdout.trim());
    logger.info(
      {
        type: result.type,
        pages: result.pages,
        engine: result.recommended_engine,
      },
      "classify-complete"
    );
    return result;
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "classify-failed"
    );
    return {
      type: "scanned",
      pages: 0,
      size_mb: 0,
      filename: pdfPath.split(/[\\/]/).pop(),
      has_arabic: true,
      recommended_engine: "mistral",
      notes: ["التصنيف فشل — يُفترض أن الملف ممسوح ضوئياً"],
    };
  }
};

export const runVisionProofreadStage = async (
  config,
  finalText,
  finalMarkdownText,
  inputPath,
  ocrJsonPath,
  normalizationApplied,
  allWarnings,
  attempts,
  logger
) => {
  if (!config.enableVisionProofread || !config.geminiApiKey) {
    if (!config.enableVisionProofread) {
      attempts.push("vision-proofread-disabled");
      logger.info(
        "vision-proofread-disabled (PDF_OCR_ENABLE_VISION_PROOFREAD is not set)"
      );
    } else {
      attempts.push("vision-proofread-no-key");
      logger.warn("vision-proofread-skipped (GEMINI_API_KEY missing)");
    }
    return { finalText, finalMarkdownText, normalizationApplied };
  }
  attempts.push("vision-proofread");
  logger.info(
    { model: config.visionProofreadModel, renderDpi: config.visionRenderDpi },
    "vision-proofread-start"
  );
  const tProofread = Date.now();
  try {
    const proofreadPageImages = await renderPdfPages({
      pdfPath: inputPath,
      dpi: config.visionRenderDpi,
    });
    const ocrJsonRaw = await readFile(ocrJsonPath, "utf-8");
    const ocrPayload = JSON.parse(ocrJsonRaw);
    const ocrPagesForProofread = Array.isArray(ocrPayload?.pages)
      ? ocrPayload.pages
          .filter(
            (p) =>
              p &&
              typeof p === "object" &&
              typeof p.index === "number" &&
              typeof p.markdown === "string"
          )
          .sort((a, b) => a.index - b.index)
          .map((p) => ({ index: p.index, text: p.markdown.trim() }))
      : [];
    if (ocrPagesForProofread.length === 0 || proofreadPageImages.length === 0)
      throw new Error(
        `vision-proofread missing source data [VISION_PROOFREAD_NO_DATA]: ocrPages=${ocrPagesForProofread.length}, renderedImages=${proofreadPageImages.length}`
      );
    const proofreadResult = await runVisionProofread({
      apiKey: config.geminiApiKey,
      model: config.visionProofreadModel,
      pageImages: proofreadPageImages,
      ocrPages: ocrPagesForProofread,
      timeoutMs: config.visionProofreadTimeoutMs,
    });
    const proofreadText = proofreadResult.pages
      .sort((a, b) => a.page - b.page)
      .map((p) => p.text.trim())
      .filter(Boolean)
      .join("\n\n");
    if (!proofreadText.trim())
      throw new Error(
        "vision-proofread returned empty text [VISION_PROOFREAD_EMPTY_RESULT]"
      );
    logger.info(
      {
        durationMs: Date.now() - tProofread,
        originalLen: finalText.length,
        correctedLen: proofreadText.length,
        pages: proofreadResult.pages.length,
      },
      "vision-proofread-complete"
    );
    return {
      finalText: proofreadText,
      finalMarkdownText: proofreadText,
      normalizationApplied: [
        ...normalizationApplied,
        "vision-proofread-gemini",
      ],
    };
  } catch (proofreadError) {
    throw new Error(
      `vision-proofread failed: ${proofreadError instanceof Error ? proofreadError.message : String(proofreadError)}`,
      { cause: proofreadError }
    );
  }
};

export const runVisionQAStage = async (
  enableVisionQA,
  config,
  finalText,
  inputPath,
  ocrJsonPath,
  filename,
  attempts,
  allWarnings,
  logger,
  MISMATCH_REPORTS_ROOT
) => {
  let status = "accepted";
  let rejectionReason = undefined;
  let mismatchReport = [];
  let quality = { wordMatch: 100, structuralMatch: 100, accepted: true };
  let referenceMode = "ocr-direct";
  let mismatchReportPath = "";
  if (!enableVisionQA) {
    attempts.push("vision-qa-skipped");
    logger.info("vision-qa-skipped (PDF_OCR_ENABLE_VISION_QA is not set)");
    return {
      status,
      rejectionReason,
      mismatchReport,
      quality,
      referenceMode,
      mismatchReportPath,
    };
  }
  attempts.push("vision-reference-build");
  logger.info(
    {
      compareModel: config.visionCompareModel,
      judgeModel: config.visionJudgeModel,
      renderDpi: config.visionRenderDpi,
    },
    "vision-reference-build-start"
  );
  const reference = await buildPdfReference({
    pdfPath: inputPath,
    ocrJsonPath,
    externalReferencePath: config.externalReferencePath || undefined,
    compare: {
      apiKey: config.mistralApiKey,
      model: config.visionCompareModel,
      timeoutMs: config.visionCompareTimeoutMs,
    },
    judge: {
      apiKey: config.moonshotApiKey,
      model: config.visionJudgeModel,
      timeoutMs: config.visionJudgeTimeoutMs,
    },
    renderDpi: config.visionRenderDpi,
    visionPreflightDone: true,
  });
  logger.info(
    {
      referenceMode: reference.referenceMode,
      renderedPages: Number(reference?.compareReport?.renderedPages ?? 0),
      proposedPatches: Number(reference?.compareReport?.proposedPatches ?? 0),
      approvedPatches: Number(reference?.compareReport?.approvedPatches ?? 0),
      rejectedPatches: Number(reference?.compareReport?.rejectedPatches ?? 0),
    },
    "vision-reference-build-complete"
  );
  attempts.push("token-enforcement");
  const enforcement = enforceTokenMatch({
    candidateText: finalText,
    referenceText: reference.referenceText,
    pageLineBoundaries: reference.pageLineBoundaries,
    criticalTokens: buildCriticalTokenList(reference.referenceText),
    minWordMatch: 99.5,
  });
  logger.info(
    {
      status: enforcement.status,
      wordMatch: enforcement?.quality?.wordMatch,
      structuralMatch: enforcement?.quality?.structuralMatch,
    },
    "token-enforcement-complete"
  );
  status = enforcement.status;
  rejectionReason = enforcement.rejectionReason;
  mismatchReport = enforcement.mismatchReport;
  quality = enforcement.quality;
  referenceMode = reference.referenceMode;
  if (status === "rejected" && rejectionReason)
    allWarnings.push(`extraction-rejected: ${rejectionReason}`);
  mismatchReportPath = join(
    MISMATCH_REPORTS_ROOT,
    `${buildRunFileKey(filename)}.json`
  );
  await writeMismatchReport(mismatchReportPath, {
    payloadVersion: 2,
    status,
    referenceMode,
    quality,
    mismatchReport,
    rejectionReason,
    attempts,
  });
  return {
    status,
    rejectionReason,
    mismatchReport,
    quality,
    referenceMode,
    mismatchReportPath,
  };
};

export const exportProofreadDocx = async (
  finalText,
  filename,
  attempts,
  logger
) => {
  try {
    const docxResult = await saveProofreadDocx(finalText, filename);
    if (docxResult.rawPath) {
      attempts.push("docx-export");
      logger.info(
        {
          rawPath: docxResult.rawPath,
          formattedPath: docxResult.formattedPath,
        },
        "proofread-docx-exported"
      );
    }
    return docxResult;
  } catch (docxError) {
    logger.warn(
      {
        error:
          docxError instanceof Error ? docxError.message : String(docxError),
      },
      "proofread-docx-export-failed"
    );
    return null;
  }
};
