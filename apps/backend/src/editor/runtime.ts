import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import rateLimit from "express-rate-limit";

import { definedProps } from "@/utils/defined-props";

import type { Application, RequestHandler } from "express";

type NativeDynamicImport = <T>(modulePath: string) => Promise<T>;
type PathExists = (path: string) => boolean;
type RuntimeHandler = RequestHandler;
interface ModelAvailability {
  available: boolean;
  checkedAt: string;
  error?: string;
  model: string;
  provider: string;
  statusCode?: number;
  supportsGenerateContent?: boolean;
}

interface LoadedEditorRuntime {
  handleExtract: RuntimeHandler;
  handleTextExtract: RuntimeHandler;
  handleSuspicionReview: RuntimeHandler;
  handleFinalReview: RuntimeHandler;
  handleContextEnhance: RuntimeHandler;
  handleExportPdfA: RuntimeHandler;
  getGeminiContextHealth: () => {
    configured: boolean;
    enabled: boolean;
    model: string;
  };
  getPdfOcrAgentHealth: () => Promise<
    Record<string, unknown> & { configured?: boolean }
  >;
  getFinalReviewRuntime: () => Record<string, unknown> & {
    configured?: boolean;
  };
  antiwordPreflight: Record<string, unknown> & {
    antiwordPath?: string;
    antiwordHome?: string;
    runtimeSource?: string;
    binaryAvailable?: boolean;
    antiwordHomeExists?: boolean;
    warnings?: string[];
  };
  defaultAntiwordPath: string;
  defaultAntiwordHome: string;
  docxConverterScriptPath: string;
  docxConverterScriptExists: boolean;
}

interface RuntimePathOptions {
  baseDir?: string;
  cwd?: string;
  pathExists?: PathExists;
}

export function resolveEditorRuntimeRoot(
  options: RuntimePathOptions = {},
): string {
  const cwd = options.cwd ?? process.cwd();
  const baseDir = options.baseDir ?? __dirname;
  const pathExists = options.pathExists ?? existsSync;
  const fallbackRuntimeRoot = resolve(cwd, "editor-runtime");
  const candidates = [
    fallbackRuntimeRoot,
    resolve(cwd, "apps", "backend", "editor-runtime"),
    resolve(baseDir, "..", "editor-runtime"),
    resolve(baseDir, "..", "..", "editor-runtime"),
  ];

  return (
    candidates.find((candidate) => pathExists(candidate)) ?? fallbackRuntimeRoot
  );
}

export function resolveNativeDynamicImportHelperPath(
  options: RuntimePathOptions = {},
): string {
  return resolve(
    resolveEditorRuntimeRoot(options),
    "native-dynamic-import.cjs",
  );
}

const runtimeRoot = resolveEditorRuntimeRoot();
let loadedRuntimePromise: Promise<LoadedEditorRuntime> | null = null;
const googleModelHealthCache = new Map<
  string,
  {
    expiresAt: number;
    payload: ModelAvailability;
  }
>();

const GOOGLE_MODEL_HEALTH_TTL_MS = 5 * 60 * 1000;
const GOOGLE_MODEL_HEALTH_TIMEOUT_MS = 10_000;

function buildRateLimiter(limit: number): RequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res, _next, options) => {
      res.status(options.statusCode).json({
        success: false,
        error: String(options.message),
      });
    },
  });
}

const extractLimiter = buildRateLimiter(100);
const reviewLimiter = buildRateLimiter(100);
const aiLimiter = buildRateLimiter(200);

function isNativeDynamicImportModule(
  value: unknown,
): value is { nativeDynamicImport: NativeDynamicImport } {
  const candidate = value as { nativeDynamicImport?: unknown };
  return typeof candidate.nativeDynamicImport === "function";
}

function loadNativeDynamicImport(): NativeDynamicImport {
  const helperPath = resolveNativeDynamicImportHelperPath();
  const runtimeRequire = createRequire(__filename) as (
    modulePath: string,
  ) => unknown;
  const imported = runtimeRequire(helperPath);

  if (!isNativeDynamicImportModule(imported)) {
    throw new Error("Editor runtime dynamic import helper is invalid.");
  }

  return imported.nativeDynamicImport;
}

const nativeDynamicImport = loadNativeDynamicImport();

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getGoogleGenAiApiKey(): string {
  return (
    toTrimmedString(process.env.GEMINI_API_KEY) ||
    toTrimmedString(process.env.GOOGLE_GENAI_API_KEY)
  );
}

async function checkGoogleModelAvailability(
  model: string,
  apiKey: string,
): Promise<ModelAvailability> {
  const now = Date.now();
  const cached = googleModelHealthCache.get(model);
  if (cached && cached.expiresAt > now) {
    return cached.payload;
  }

  if (!model) {
    return {
      available: false,
      checkedAt: new Date(now).toISOString(),
      error: "Google model name is empty.",
      model,
      provider: "google-genai",
    };
  }

  if (!apiKey) {
    return {
      available: false,
      checkedAt: new Date(now).toISOString(),
      error: "GEMINI_API_KEY or GOOGLE_GENAI_API_KEY is not configured.",
      model,
      provider: "google-genai",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    GOOGLE_MODEL_HEALTH_TIMEOUT_MS,
  );

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}?key=${encodeURIComponent(apiKey)}`,
      {
        cache: "no-store",
        method: "GET",
        signal: controller.signal,
      },
    );

    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
      supportedGenerationMethods?: string[];
    } | null;
    const supportedGenerationMethods = Array.isArray(
      payload?.supportedGenerationMethods,
    )
      ? payload.supportedGenerationMethods
      : [];
    const errorMessage = response.ok
      ? supportedGenerationMethods.includes("generateContent")
        ? undefined
        : "Model does not advertise generateContent support."
      : (payload?.error?.message ??
        `Google model lookup failed with HTTP ${response.status}.`);
    const result: ModelAvailability = {
      available:
        response.ok && supportedGenerationMethods.includes("generateContent"),
      checkedAt: new Date().toISOString(),
      model,
      provider: "google-genai",
      ...definedProps({
        error: errorMessage,
        statusCode: response.status,
        supportsGenerateContent:
          supportedGenerationMethods.includes("generateContent"),
      }),
    };

    googleModelHealthCache.set(model, {
      expiresAt: Date.now() + GOOGLE_MODEL_HEALTH_TTL_MS,
      payload: result,
    });

    return result;
  } catch (error) {
    return {
      available: false,
      checkedAt: new Date().toISOString(),
      error:
        error instanceof Error
          ? error.message
          : "Unknown Google model lookup error.",
      model,
      provider: "google-genai",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function resolveProviderModelAvailability(
  provider: string,
  model: string,
): Promise<ModelAvailability> {
  if (provider === "google-genai") {
    return checkGoogleModelAvailability(model, getGoogleGenAiApiKey());
  }

  return {
    available: Boolean(model),
    checkedAt: new Date().toISOString(),
    model,
    provider: provider || "unknown",
  };
}

async function importRuntimeModule<T>(relativePath: string): Promise<T> {
  const moduleUrl = pathToFileURL(resolve(runtimeRoot, relativePath)).href;
  return nativeDynamicImport<T>(moduleUrl);
}

async function loadEditorRuntime(): Promise<LoadedEditorRuntime> {
  loadedRuntimePromise ??= (async () => {
    const [
      extractModule,
      textExtractModule,
      suspicionReviewModule,
      finalReviewModule,
      contextModule,
      exportModule,
      pdfOcrConfigModule,
      finalReviewRuntimeModule,
      docExtractorModule,
      docxExtractorModule,
    ] = await Promise.all([
      importRuntimeModule<{
        handleExtract: RuntimeHandler;
        ANTIWORD_PREFLIGHT: LoadedEditorRuntime["antiwordPreflight"];
      }>("controllers/extract-controller.mjs"),
      importRuntimeModule<{ handleTextExtract: RuntimeHandler }>(
        "controllers/text-extract-controller.mjs",
      ),
      importRuntimeModule<{ handleSuspicionReview: RuntimeHandler }>(
        "controllers/suspicion-review-controller.mjs",
      ),
      importRuntimeModule<{ handleFinalReview: RuntimeHandler }>(
        "controllers/final-review-controller.mjs",
      ),
      importRuntimeModule<{
        handleContextEnhance: RuntimeHandler;
        getGeminiContextHealth: LoadedEditorRuntime["getGeminiContextHealth"];
      }>("ai-context-gemini.mjs"),
      importRuntimeModule<{ handleExportPdfA: RuntimeHandler }>(
        "controllers/export-controller.mjs",
      ),
      importRuntimeModule<{
        getPdfOcrAgentHealth: LoadedEditorRuntime["getPdfOcrAgentHealth"];
      }>("pdf-ocr-agent-config.mjs"),
      importRuntimeModule<{
        getFinalReviewRuntime: LoadedEditorRuntime["getFinalReviewRuntime"];
      }>("final-review.mjs"),
      importRuntimeModule<{
        DEFAULT_ANTIWORD_PATH: string;
        DEFAULT_ANTIWORD_HOME: string;
      }>("services/doc-extractor.mjs"),
      importRuntimeModule<{
        DOCX_TO_DOC_SCRIPT_PATH: string;
        DOCX_TO_DOC_SCRIPT_EXISTS: boolean;
      }>("services/docx-extractor.mjs"),
    ]);

    return {
      handleExtract: extractModule.handleExtract,
      handleTextExtract: textExtractModule.handleTextExtract,
      handleSuspicionReview: suspicionReviewModule.handleSuspicionReview,
      handleFinalReview: finalReviewModule.handleFinalReview,
      handleContextEnhance: contextModule.handleContextEnhance,
      handleExportPdfA: exportModule.handleExportPdfA,
      getGeminiContextHealth: contextModule.getGeminiContextHealth,
      getPdfOcrAgentHealth: pdfOcrConfigModule.getPdfOcrAgentHealth,
      getFinalReviewRuntime: finalReviewRuntimeModule.getFinalReviewRuntime,
      antiwordPreflight: extractModule.ANTIWORD_PREFLIGHT,
      defaultAntiwordPath: docExtractorModule.DEFAULT_ANTIWORD_PATH,
      defaultAntiwordHome: docExtractorModule.DEFAULT_ANTIWORD_HOME,
      docxConverterScriptPath: docxExtractorModule.DOCX_TO_DOC_SCRIPT_PATH,
      docxConverterScriptExists: docxExtractorModule.DOCX_TO_DOC_SCRIPT_EXISTS,
    };
  })();

  return loadedRuntimePromise;
}

export async function getEditorIntegrationHealth(): Promise<
  Record<string, unknown>
> {
  const runtime = await loadEditorRuntime();
  const [ocrAgent] = await Promise.all([runtime.getPdfOcrAgentHealth()]);
  const aiContextLayer = runtime.getGeminiContextHealth();
  const finalReviewRuntime = runtime.getFinalReviewRuntime();
  const finalReviewProvider = toTrimmedString(finalReviewRuntime["provider"]);
  const finalReviewModel = toTrimmedString(finalReviewRuntime["resolvedModel"]);
  const ocrModel = toTrimmedString(ocrAgent["geminiOcrModel"]);
  const aiContextModel = toTrimmedString(aiContextLayer.model);
  const [finalReviewModelCheck, ocrModelCheck, aiContextModelCheck] =
    await Promise.all([
      resolveProviderModelAvailability(finalReviewProvider, finalReviewModel),
      resolveProviderModelAvailability("google-genai", ocrModel),
      aiContextLayer.enabled
        ? resolveProviderModelAvailability("google-genai", aiContextModel)
        : Promise.resolve<ModelAvailability>({
            available: true,
            checkedAt: new Date().toISOString(),
            model: aiContextModel,
            provider: "google-genai",
          }),
    ]);
  const antiwordWarnings = Array.isArray(runtime.antiwordPreflight.warnings)
    ? runtime.antiwordPreflight.warnings
    : [];
  const antiwordReady =
    runtime.antiwordPreflight.binaryAvailable === true &&
    runtime.antiwordPreflight.antiwordHomeExists === true;
  const finalReviewReady =
    finalReviewRuntime.configured === true &&
    finalReviewModelCheck.available === true;
  const ocrReady =
    ocrAgent.configured === true && ocrModelCheck.available === true;
  const aiContextReady = aiContextLayer.enabled
    ? aiContextLayer.configured === true &&
      aiContextModelCheck.available === true
    : true;
  const healthy =
    antiwordReady &&
    finalReviewReady &&
    ocrReady &&
    aiContextReady &&
    runtime.docxConverterScriptExists === true;
  const intakeLimitations: {
    sourceType: "doc" | "docx" | "pdf";
    code: string;
    blocking: boolean;
    message: string;
  }[] = [];

  if (!antiwordReady) {
    intakeLimitations.push({
      sourceType: "doc",
      code: "DOC_ANTIWORD_NOT_READY",
      blocking: true,
      message:
        "استيراد DOC غير جاهز لأن antiword أو ANTIWORDHOME غير متاحين بشكل صحيح.",
    });
  }

  if (!runtime.docxConverterScriptExists) {
    intakeLimitations.push({
      sourceType: "docx",
      code: "DOCX_FALLBACK_CONVERTER_MISSING",
      blocking: true,
      message:
        "المسار الاحتياطي لتحويل DOCX إلى DOC غير متاح لأن سكربت التحويل غير موجود.",
    });
  }

  if (!ocrReady) {
    intakeLimitations.push({
      sourceType: "pdf",
      code: "PDF_OCR_NOT_READY",
      blocking: true,
      message:
        "استيراد PDF غير جاهز لأن طبقة OCR أو نموذجها غير متاحين بشكل صحيح.",
    });
  }

  return {
    status: healthy ? "ok" : "degraded",
    ok: healthy,
    service: "backend-editor-runtime",
    officialBackend: true,
    mode: "embedded",
    antiwordPath:
      runtime.antiwordPreflight.antiwordPath ?? runtime.defaultAntiwordPath,
    antiwordHome:
      runtime.antiwordPreflight.antiwordHome ?? runtime.defaultAntiwordHome,
    antiwordRuntimeSource: runtime.antiwordPreflight.runtimeSource,
    antiwordBinaryAvailable: runtime.antiwordPreflight.binaryAvailable,
    antiwordHomeExists: runtime.antiwordPreflight.antiwordHomeExists,
    antiwordWarnings,
    docxConverterScriptPath: runtime.docxConverterScriptPath,
    docxConverterScriptExists: runtime.docxConverterScriptExists,
    finalReviewConfigured: finalReviewReady,
    finalReviewRuntime: {
      ...finalReviewRuntime,
      modelCheck: finalReviewModelCheck,
    },
    ocrConfigured: ocrReady,
    ocrAgent: {
      ...ocrAgent,
      modelCheck: ocrModelCheck,
    },
    aiContextLayer: {
      ...aiContextLayer,
      modelCheck: aiContextModelCheck,
    },
    pdfFirstVisibleSourceKinds: ["direct-extraction", "ocr"],
    intakeLimitations,
  };
}

export function registerEditorRuntimeRoutes(app: Application): void {
  const createLazyRuntimeHandler = (
    pickHandler: (runtime: LoadedEditorRuntime) => RuntimeHandler,
  ): RequestHandler => {
    return async (req, res, next) => {
      try {
        const runtime = await loadEditorRuntime();
        const handler = pickHandler(runtime);
        handler(req, res, next);
      } catch (error) {
        next(error);
      }
    };
  };

  app.post(
    "/api/file-extract",
    extractLimiter,
    createLazyRuntimeHandler((runtime) => runtime.handleExtract),
  );
  app.post(
    "/api/files/extract",
    extractLimiter,
    createLazyRuntimeHandler((runtime) => runtime.handleExtract),
  );
  app.post(
    "/api/text-extract",
    extractLimiter,
    createLazyRuntimeHandler((runtime) => runtime.handleTextExtract),
  );
  app.post(
    "/api/suspicion-review",
    reviewLimiter,
    createLazyRuntimeHandler((runtime) => runtime.handleSuspicionReview),
  );
  app.post(
    "/api/final-review",
    reviewLimiter,
    createLazyRuntimeHandler((runtime) => runtime.handleFinalReview),
  );
  app.post(
    "/api/ai/context-enhance",
    aiLimiter,
    createLazyRuntimeHandler((runtime) => runtime.handleContextEnhance),
  );
  app.post(
    "/api/export/pdfa",
    createLazyRuntimeHandler((runtime) => runtime.handleExportPdfA),
  );
  app.get("/api/editor-runtime/health", async (_req, res) => {
    const payload = await getEditorIntegrationHealth();
    res.status(payload["ok"] ? 200 : 503).json(payload);
  });
}
