/**
 * @description بناء إعدادات محول OCR من سطر الأوامر ومتغيرات البيئة
 */

import process from "node:process";

import { clamp, isTruthy, toNumberFloat, toNumberInt } from "./text-helpers.js";

import type {
  ConfigManager,
  LLMConfig,
  MistralOCRConfig,
  NormalizationOptions,
  ParsedArgs,
  PreOCRConfig,
} from "./types.js";

const DEFAULT_LLM_MODEL = "kimi-k2.5";
const DEFAULT_MISTRAL_OCR_MODEL = "mistral-ocr-latest";
const DEFAULT_PRE_OCR_LANG = "ar";

const DEFAULT_MATCH_THRESHOLD = 0.88;
const DEFAULT_FULLPAGE_FALLBACK_RATIO = 0.7;
const DEFAULT_REGION_PADDING_PX = 12;
const DEFAULT_LLM_MAX_ITERATIONS = 3;
const DEFAULT_LLM_TARGET_MATCH = 100.0;
const DEFAULT_DIFF_PREVIEW_LINES = 12;

const DEFAULT_INPUT = String.raw`E:\New folder (31)\12.pdf`;

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token?.startsWith("--")) {
      continue;
    }

    const arg = token.slice(2);
    const eq = arg.indexOf("=");

    if (eq >= 0) {
      const name = arg.slice(0, eq).trim();
      const value = arg.slice(eq + 1);
      if (name) {
        parsed[name] = value;
      }
      continue;
    }

    const name = arg.trim();
    if (!name) {
      continue;
    }

    const next = argv[i + 1];
    if (typeof next === "string" && !next.startsWith("--")) {
      parsed[name] = next;
      i += 1;
    } else {
      parsed[name] = true;
    }
  }

  return parsed;
}

function argString(parsed: ParsedArgs, name: string, fallback: string): string {
  const v = parsed[name];
  if (typeof v === "string" && v.trim()) {
    return v;
  }
  return fallback;
}

function argOptionalString(
  parsed: ParsedArgs,
  name: string
): string | undefined {
  const v = parsed[name];
  if (typeof v === "string" && v.trim()) {
    return v;
  }
  return undefined;
}

function argBool(parsed: ParsedArgs, name: string, fallback = false): boolean {
  const v = parsed[name];
  if (typeof v === "boolean") {
    return v;
  }
  if (typeof v === "string") {
    return isTruthy(v);
  }
  return fallback;
}

function buildLLMConfig(args: ParsedArgs): LLMConfig {
  const llmReferencePath = argOptionalString(args, "llm-reference");
  return {
    enabled: argBool(args, "use-llm"),
    model: argString(args, "llm-model", DEFAULT_LLM_MODEL),
    strict: argBool(args, "llm-strict"),
    iterative: !argBool(args, "llm-no-iterative"),
    maxIterations: Math.max(
      1,
      toNumberInt(
        argOptionalString(args, "llm-max-iterations"),
        DEFAULT_LLM_MAX_ITERATIONS
      )
    ),
    targetMatch: clamp(
      toNumberFloat(
        argOptionalString(args, "llm-target-match"),
        DEFAULT_LLM_TARGET_MATCH
      ),
      0,
      100
    ),
    diffPreviewLines: Math.max(
      1,
      toNumberInt(
        argOptionalString(args, "llm-diff-preview-lines"),
        DEFAULT_DIFF_PREVIEW_LINES
      )
    ),
    ...(llmReferencePath !== undefined
      ? { referencePath: llmReferencePath }
      : {}),
  };
}

function getTableFormat(args: ParsedArgs): "markdown" | "html" | undefined {
  const tableRaw = (
    argOptionalString(args, "mistral-table-format") ??
    process.env["MISTRAL_OCR_TABLE_FORMAT"] ??
    ""
  )
    .trim()
    .toLowerCase();
  const tableFormat =
    tableRaw === "markdown" || tableRaw === "html" ? tableRaw : undefined;
  return tableFormat;
}

function getAnnotationConfig(args: ParsedArgs): {
  annotationSchemaPath?: string;
  annotationPrompt?: string;
  annotationOutputPath?: string;
} {
  const annotationSchemaPath =
    argOptionalString(args, "mistral-annotation-schema") ??
    process.env["MISTRAL_ANNOTATION_SCHEMA_PATH"]?.trim() ??
    undefined;
  const annotationPrompt =
    argOptionalString(args, "mistral-annotation-prompt") ??
    process.env["MISTRAL_ANNOTATION_PROMPT"]?.trim() ??
    undefined;
  const annotationOutputPath =
    argOptionalString(args, "mistral-annotation-output") ??
    process.env["MISTRAL_ANNOTATION_OUTPUT_PATH"]?.trim() ??
    undefined;
  return {
    annotationSchemaPath,
    annotationPrompt,
    annotationOutputPath,
  };
}

function buildMistralConfig(args: ParsedArgs): MistralOCRConfig {
  const tableFormat = getTableFormat(args);
  const annotationConfig = getAnnotationConfig(args);

  const mistral: MistralOCRConfig = {
    model: argString(
      args,
      "mistral-ocr-model",
      (process.env["MISTRAL_OCR_MODEL"] ?? DEFAULT_MISTRAL_OCR_MODEL).trim() ||
        DEFAULT_MISTRAL_OCR_MODEL
    ),
    useDocumentInput: !argBool(args, "mistral-disable-document-input"),
    useBatchOCR: argBool(args, "mistral-use-batch"),
    batchTimeoutSec: Math.max(
      5,
      toNumberInt(
        argOptionalString(args, "mistral-batch-timeout-sec") ??
          process.env["MISTRAL_BATCH_TIMEOUT_SEC"],
        300
      )
    ),
    batchPollIntervalSec: Math.max(
      0.5,
      toNumberFloat(
        argOptionalString(args, "mistral-batch-poll-interval-sec") ??
          process.env["MISTRAL_BATCH_POLL_INTERVAL_SEC"],
        3
      )
    ),
    annotationStrict: !argBool(args, "mistral-annotation-non-strict"),
    extractHeader: argBool(args, "mistral-extract-header"),
    extractFooter: argBool(args, "mistral-extract-footer"),
    includeImageBase64: argBool(args, "mistral-include-image-base64"),
    ...(annotationConfig.annotationSchemaPath !== undefined
      ? { annotationSchemaPath: annotationConfig.annotationSchemaPath }
      : {}),
    ...(annotationConfig.annotationPrompt !== undefined
      ? { annotationPrompt: annotationConfig.annotationPrompt }
      : {}),
    ...(annotationConfig.annotationOutputPath !== undefined
      ? { annotationOutputPath: annotationConfig.annotationOutputPath }
      : {}),
    ...(tableFormat !== undefined ? { tableFormat } : {}),
  };
  if (mistral.model !== DEFAULT_MISTRAL_OCR_MODEL) {
    throw new Error(
      `Mistral OCR model must be ${DEFAULT_MISTRAL_OCR_MODEL}. Received: ${mistral.model}`
    );
  }
  return mistral;
}

function buildPreOcrConfig(args: ParsedArgs): PreOCRConfig {
  return {
    enabled: !argBool(args, "disable-pre-ocr-filter"),
    lang: argString(
      args,
      "pre-ocr-lang",
      (process.env["PRE_OCR_LANG"] ?? DEFAULT_PRE_OCR_LANG).trim() ||
        DEFAULT_PRE_OCR_LANG
    ),
    matchThreshold: clamp(
      toNumberFloat(
        argOptionalString(args, "pre-ocr-match-threshold"),
        DEFAULT_MATCH_THRESHOLD
      ),
      0,
      1
    ),
    fullpageFallbackRatio: clamp(
      toNumberFloat(
        argOptionalString(args, "pre-ocr-fullpage-fallback-ratio"),
        DEFAULT_FULLPAGE_FALLBACK_RATIO
      ),
      0,
      1
    ),
    regionPaddingPx: Math.max(
      0,
      toNumberInt(
        argOptionalString(args, "pre-ocr-region-padding-px"),
        DEFAULT_REGION_PADDING_PX
      )
    ),
  };
}

function buildNormalizerOptions(args: ParsedArgs): NormalizationOptions {
  return {
    normalizeYa: argBool(args, "normalize-ya", false),
    normalizeTaMarbuta: argBool(args, "normalize-ta-marbuta", false),
    normalizeHamza: !argBool(args, "no-normalize-hamza"),
    normalizeDigits: (argOptionalString(args, "normalize-digits") ??
      "arabic") as "none" | "arabic" | "western",
    removeDiacritics: !argBool(args, "no-remove-diacritics"),
    fixConnectedLetters: !argBool(args, "no-fix-connected-letters"),
    fixArabicPunctuation: !argBool(args, "no-fix-arabic-punctuation"),
    scriptSpecificRules: !argBool(args, "no-script-specific-rules"),
  };
}

export function buildConfig(argv: string[]): ConfigManager {
  const args = parseArgs(argv);
  const llm = buildLLMConfig(args);
  const mistral = buildMistralConfig(args);
  const preOcr = buildPreOcrConfig(args);
  const normalizerOptions = buildNormalizerOptions(args);
  const outputPath = argOptionalString(args, "output");

  return {
    inputPath: argString(args, "input", DEFAULT_INPUT),
    normalizeOutput: !argBool(args, "no-normalize"),
    normalizerOptions,
    saveRawMarkdown: !argBool(args, "no-raw"),
    llm,
    mistral,
    preOcr,
    ...(outputPath !== undefined ? { outputPath } : {}),
  };
}
