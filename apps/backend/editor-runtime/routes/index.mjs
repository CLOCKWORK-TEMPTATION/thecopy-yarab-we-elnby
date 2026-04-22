/**
 * @description تعريف مسارات API للخادم الخلفي
 */

import rateLimit from "express-rate-limit";
import { sendJson } from "../utils/http-helpers.mjs";
import {
  handleExtract,
  ANTIWORD_PREFLIGHT,
} from "../controllers/extract-controller.mjs";
import { handleTextExtract } from "../controllers/text-extract-controller.mjs";
import { handleFinalReview } from "../controllers/final-review-controller.mjs";
import { handleExportPdfA } from "../controllers/export-controller.mjs";
import {
  handleContextEnhance,
  getGeminiContextHealth,
} from "../ai-context-gemini.mjs";
import { getPdfOcrAgentHealth } from "../pdf-ocr-agent-config.mjs";
import { handleSuspicionReview } from "../controllers/suspicion-review-controller.mjs";
import {
  getFinalReviewModel,
  getFinalReviewRuntime,
} from "../final-review.mjs";
import {
  DEFAULT_ANTIWORD_PATH,
  DEFAULT_ANTIWORD_HOME,
} from "../services/doc-extractor.mjs";
import { probeKarankReadiness } from "../services/karank-readiness.mjs";
import { probeSuspicionReviewReadinessSync, probeOperationalReadiness } from "../services/suspicion-review-probe.mjs";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const FILE_IMPORT_PREFLIGHT_WARNINGS = [...ANTIWORD_PREFLIGHT.warnings];

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const extractLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    sendJson(res, options.statusCode, {
      success: false,
      error: options.message,
    });
  },
});

const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    sendJson(res, options.statusCode, {
      success: false,
      error: options.message,
    });
  },
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    sendJson(res, options.statusCode, {
      success: false,
      error: options.message,
    });
  },
});

/**
 * @description بناء كائن النتائج المشتركة بين /health و /health/deep
 * @returns {Promise<Object>} كائن البيانات الصحية
 */
const buildHealthData = async () => {
  const ocrAgent = await getPdfOcrAgentHealth();
  const finalReviewRuntime = getFinalReviewRuntime();
  const intakeLimitations = [];
  const karank = await probeKarankReadiness();

  // مسبار عملياتي لخط أنابيب الشك والمراجعة النهائية
  let operationalProof = null;
  try {
    operationalProof = await probeOperationalReadiness();
  } catch (error) {
    operationalProof = {
      probeVersion: "2.0.0",
      settled: false,
      failureStage: "probe-error",
      failureCode: "PROBE_EXECUTION_FAILED",
      failureMessage: error.message,
      karankPipelineRan: false,
      suspicionCasesCount: 0,
      suspicionModelReached: false,
      finalReviewCandidatesCount: 0,
      finalReviewReached: false,
    };
  }

  if (
    !ANTIWORD_PREFLIGHT.binaryAvailable ||
    !ANTIWORD_PREFLIGHT.antiwordHomeExists
  ) {
    intakeLimitations.push({
      sourceType: "doc",
      code: "DOC_ANTIWORD_NOT_READY",
      blocking: true,
      message:
        "استيراد DOC غير جاهز لأن antiword أو ANTIWORDHOME غير متاحين بشكل صحيح.",
    });
  }

  if (!ocrAgent.configured) {
    intakeLimitations.push({
      sourceType: "pdf",
      code: "PDF_OCR_NOT_READY",
      blocking: true,
      message:
        "استيراد PDF غير جاهز لأن طبقة OCR أو نموذجها غير متاحين بشكل صحيح.",
    });
  }

  if (!karank.ok) {
    intakeLimitations.push({
      sourceType: "import-pipeline",
      code: "KARANK_IMPORT_PIPELINE_NOT_READY",
      blocking: true,
      message:
        "مسار الاستيراد الطرفي غير جاهز لأن الكرنك أو فحصه الحي فشل.",
    });
  }

  return {
    ocrAgent,
    finalReviewRuntime,
    intakeLimitations,
    karank,
    operationalProof,
  };
};

/**
 * @description بناء استجابة الصحة العميقة المفصلة
 * @param {Object} data - بيانات الصحة من buildHealthData
 * @returns {Object} كائن الاستجابة الكامل
 */
const buildDeepHealthResponse = (data) => {
  const {
    ocrAgent,
    finalReviewRuntime,
    intakeLimitations,
    karank,
    operationalProof,
  } = data;

  // Call probe for suspicion review readiness
  const syncProbe = probeSuspicionReviewReadinessSync();

  // ─ حساب الحالة الإجمالية ─
  const criticalFailures = [];

  if (!karank.ok) {
    criticalFailures.push("karank_import_pipeline_failed");
  }
  if (karank.python && !karank.python.ok) {
    criticalFailures.push("python_runtime_unavailable");
  }
  if (karank.ping && !karank.ping.ok) {
    criticalFailures.push("karank_ping_failed");
  }
  if (karank.textExtractProbe && !karank.textExtractProbe.ok) {
    criticalFailures.push("text_extract_probe_failed");
  }
  if (karank.importPipelineProbe && !karank.importPipelineProbe.ok) {
    criticalFailures.push("import_pipeline_probe_failed");
  }
  if (operationalProof && !operationalProof.karankPipelineRan) {
    criticalFailures.push("operational_karank_pipeline_not_ran");
  }

  const nonCriticalFailures = [];
  if (
    !ANTIWORD_PREFLIGHT.binaryAvailable ||
    !ANTIWORD_PREFLIGHT.antiwordHomeExists
  ) {
    nonCriticalFailures.push("antiword_not_ready");
  }
  if (!ocrAgent.configured) {
    nonCriticalFailures.push("pdf_ocr_not_configured");
  }

  let status = "ok";
  if (criticalFailures.length > 0) {
    status = "failed";
  } else if (nonCriticalFailures.length > 0) {
    status = "degraded";
  }

  const ok = status === "ok";
  const geminiContext = getGeminiContextHealth();

  return {
    // ─── الحقول العليا ───
    ok: ok,
    status: status,
    checkedAt: new Date().toISOString(),
    service: "file-import-backend",
    failureReasons: criticalFailures,

    // ─── قسم karank ───
    karank: {
      ok: karank.ok,
      checkedAt: karank.checkedAt,
      minimumPythonVersion: karank.minimumPythonVersion,
      python: karank.python ? {
        ok: karank.python.ok === true,
        version: karank.python.version || null,
      } : { ok: false, version: null },
      engine: karank.engine ? {
        ok: karank.engine.ok === true,
        exists: karank.engine.exists === true,
      } : { ok: false, exists: false },
      ping: karank.ping ? {
        ok: karank.ping.ok === true,
      } : { ok: false },
      textExtractProbe: karank.textExtractProbe ? {
        ok: karank.textExtractProbe.ok === true,
        rawTextLength: karank.textExtractProbe.rawTextLength || 0,
        schemaElementCount: karank.textExtractProbe.schemaElementCount || 0,
      } : { ok: false, rawTextLength: 0, schemaElementCount: 0 },
      importPipelineProbe: karank.importPipelineProbe ? {
        ok: karank.importPipelineProbe.ok === true,
        method: karank.importPipelineProbe.method || null,
        progressiveStage: karank.importPipelineProbe.progressiveStage || null,
      } : { ok: false, method: null, progressiveStage: null },
      bridgeState: karank.bridgeState || null,
      errors: [
        karank.python?.error,
        karank.engine?.error,
        karank.ping?.error,
        karank.textExtractProbe?.error,
        karank.importPipelineProbe?.error,
      ].filter(Boolean),
    },

    // ─── قسم antiword ───
    antiword: {
      antiwordReady: ANTIWORD_PREFLIGHT.binaryAvailable === true && ANTIWORD_PREFLIGHT.antiwordHomeExists === true,
      antiwordBinaryAvailable: ANTIWORD_PREFLIGHT.binaryAvailable === true,
      antiwordHomeExists: ANTIWORD_PREFLIGHT.antiwordHomeExists === true,
      antiwordPath: ANTIWORD_PREFLIGHT.antiwordPath || DEFAULT_ANTIWORD_PATH,
      antiwordHome: ANTIWORD_PREFLIGHT.antiwordHome || DEFAULT_ANTIWORD_HOME,
      antiwordWarnings: FILE_IMPORT_PREFLIGHT_WARNINGS,
      docIntakeReady: ANTIWORD_PREFLIGHT.binaryAvailable === true && ANTIWORD_PREFLIGHT.antiwordHomeExists === true,
    },

    // ─── قسم المحولات والوقت التشغيلي ───
    runtime: {
      docxConverterScriptExists: existsSync(resolve(__dirname, '../services/docx-extractor.mjs')),
      pdfOcrReady: ocrAgent.configured === true,
      finalReviewReady: finalReviewRuntime.configured === true,
      aiContextReady: geminiContext.configured === true && geminiContext.enabled === true,
      intakeLimitations: intakeLimitations,
    },

    // ─── قسم إعدادات خط أنابيب مراجعة المحرر ───
    editorReviewPipeline: {
      suspicionModelEnabled: (process.env.SUSPICION_MODEL_ENABLED ?? "true").trim().toLowerCase() !== "false",
      suspicionReviewEndpointResolved: syncProbe.suspicionReviewEndpointResolved === true,
      suspicionReviewEndpointValue: syncProbe.suspicionReviewEndpointValue || "/api/suspicion-review",
      finalReviewEnabled: (process.env.FINAL_REVIEW_ENABLED ?? "true").trim().toLowerCase() !== "false",
      finalReviewEndpointResolved: finalReviewRuntime.configured === true,
      finalReviewEndpointValue: finalReviewRuntime.baseUrl || "/api/final-review",
      textExtractEndpointResolved: karank.ok === true,
      fileImportExtractEndpointResolved: karank.ok === true,
    },

    // ─── قسم الإثبات التشغيلي ───
    operationalProof: operationalProof ? {
      probeVersion: operationalProof.probeVersion || "unknown",
      timestamp: operationalProof.timestamp || null,
      latencyMs: operationalProof.latencyMs || null,
      karankPipelineRan: operationalProof.karankPipelineRan === true,
      karankSchemaElementCount: operationalProof.karankSchemaElementCount || 0,
      karankRawTextLength: operationalProof.karankRawTextLength || 0,
      suspicionCasesCount: operationalProof.suspicionCasesCount || 0,
      suspicionModelReached: operationalProof.suspicionModelReached === true,
      suspicionReviewedCount: operationalProof.suspicionReviewedCount || 0,
      finalReviewCandidatesCount: operationalProof.finalReviewCandidatesCount || 0,
      finalReviewReached: operationalProof.finalReviewReached === true,
      finalReviewAppliedCount: operationalProof.finalReviewAppliedCount || 0,
      settled: operationalProof.settled === true,
      failureStage: operationalProof.failureStage || null,
      failureCode: operationalProof.failureCode || null,
      warnings: operationalProof.warnings || [],
    } : {
      probeVersion: "unavailable",
      settled: false,
      failureStage: "probe-not-run",
      failureCode: "PROBE_NOT_EXECUTED",
    },

    // ─── البيانات التفصيلية الموروثة ───
    antiwordPath: ANTIWORD_PREFLIGHT.antiwordPath || DEFAULT_ANTIWORD_PATH,
    antiwordHome: ANTIWORD_PREFLIGHT.antiwordHome || DEFAULT_ANTIWORD_HOME,
    antiwordRuntimeSource: ANTIWORD_PREFLIGHT.runtimeSource,
    antiwordBinaryAvailable: ANTIWORD_PREFLIGHT.binaryAvailable === true,
    antiwordHomeExists: ANTIWORD_PREFLIGHT.antiwordHomeExists === true,
    antiwordWarnings: FILE_IMPORT_PREFLIGHT_WARNINGS,
    finalReviewConfigured: finalReviewRuntime.configured === true,
    aiContextLayer: geminiContext,
    ocrConfigured: ocrAgent.configured === true,
    ocrAgent: ocrAgent,
    finalReviewModel: getFinalReviewModel(),
    finalReviewProvider: finalReviewRuntime.provider,
    finalReviewModelRequested: finalReviewRuntime.requestedModel,
    finalReviewModelResolved: finalReviewRuntime.resolvedModel,
    finalReviewFallbackApplied: finalReviewRuntime.fallbackApplied === true,
    finalReviewFallbackReason: finalReviewRuntime.fallbackReason,
    finalReviewApiBaseUrl: finalReviewRuntime.baseUrl,
    finalReviewApiVersion: finalReviewRuntime.apiVersion,
    finalReviewFallbackStatus: finalReviewRuntime.fallbackApplied ? "active" : "idle",
    finalReviewChannel: {
      channel: "final-review",
      requestedModel: finalReviewRuntime.requestedModel,
      resolvedModel: finalReviewRuntime.resolvedModel,
      resolvedSpecifier: finalReviewRuntime.resolvedSpecifier,
      provider: finalReviewRuntime.provider,
      configured: finalReviewRuntime.configured === true,
      fallbackApplied: finalReviewRuntime.fallbackApplied === true,
      fallbackReason: finalReviewRuntime.fallbackReason,
      apiBaseUrl: finalReviewRuntime.baseUrl,
      apiVersion: finalReviewRuntime.apiVersion,
      warnings: finalReviewRuntime.warnings,
    },
    pdfFirstVisibleSourceKinds: ["direct-extraction", "ocr"],
    intakeLimitations: intakeLimitations,
  };
};

export const registerRoutes = (app) => {
  // ─── مسار الصحة العميقة /health/deep ───
  app.get("/health/deep", async (req, res) => {
    try {
      const data = await buildHealthData();
      const response = buildDeepHealthResponse(data);
      const statusCode = response.status === "ok" ? 200 : 503;
      res.status(statusCode).json(response);
    } catch (error) {
      res.status(503).json({
        ok: false,
        status: "failed",
        service: "file-import-backend",
        error: "خطأ في فحص الصحة العميقة",
        checkedAt: new Date().toISOString(),
        failureReasons: ["health_check_error"],
      });
    }
  });

  // ─── مسار الصحة القياسي /health ───
  app.get("/health", async (req, res) => {
    try {
      // إذا طُلب ?deep=1 أو ?deep=true، أرجع البيانات العميقة
      if (req.query.deep === "1" || req.query.deep === "true") {
        const data = await buildHealthData();
        const response = buildDeepHealthResponse(data);
        const statusCode = response.status === "ok" ? 200 : 503;
        res.status(statusCode).json(response);
        return;
      }

      // وإلا، أرجع الاستجابة المختصرة (موروثة)
      const ocrAgent = await getPdfOcrAgentHealth();
      const finalReviewRuntime = getFinalReviewRuntime();
      const intakeLimitations = [];
      const karank = await probeKarankReadiness();
      const suspicionReviewProbe = probeSuspicionReviewReadinessSync();

      if (
        !ANTIWORD_PREFLIGHT.binaryAvailable ||
        !ANTIWORD_PREFLIGHT.antiwordHomeExists
      ) {
        intakeLimitations.push({
          sourceType: "doc",
          code: "DOC_ANTIWORD_NOT_READY",
          blocking: true,
          message:
            "استيراد DOC غير جاهز لأن antiword أو ANTIWORDHOME غير متاحين بشكل صحيح.",
        });
      }

      if (!ocrAgent.configured) {
        intakeLimitations.push({
          sourceType: "pdf",
          code: "PDF_OCR_NOT_READY",
          blocking: true,
          message:
            "استيراد PDF غير جاهز لأن طبقة OCR أو نموذجها غير متاحين بشكل صحيح.",
        });
      }

      if (!karank.ok) {
        intakeLimitations.push({
          sourceType: "import-pipeline",
          code: "KARANK_IMPORT_PIPELINE_NOT_READY",
          blocking: true,
          message:
            "مسار الاستيراد الطرفي غير جاهز لأن الكرنك أو فحصه الحي فشل.",
        });
      }

      const ok = intakeLimitations.length === 0;

      res.status(ok ? 200 : 503).json({
        status: intakeLimitations.length === 0 ? "ok" : "degraded",
        ok,
        service: "file-import-backend",
        antiwordPath: ANTIWORD_PREFLIGHT.antiwordPath || DEFAULT_ANTIWORD_PATH,
        antiwordHome: ANTIWORD_PREFLIGHT.antiwordHome || DEFAULT_ANTIWORD_HOME,
        antiwordRuntimeSource: ANTIWORD_PREFLIGHT.runtimeSource,
        antiwordBinaryAvailable: ANTIWORD_PREFLIGHT.binaryAvailable,
        antiwordHomeExists: ANTIWORD_PREFLIGHT.antiwordHomeExists,
        antiwordWarnings: FILE_IMPORT_PREFLIGHT_WARNINGS,
        karank,
        finalReviewConfigured: finalReviewRuntime.configured,
        aiContextLayer: getGeminiContextHealth(),
        ocrConfigured: ocrAgent.configured,
        ocrAgent,
        finalReviewModel: getFinalReviewModel(),
        finalReviewProvider: finalReviewRuntime.provider,
        finalReviewModelRequested: finalReviewRuntime.requestedModel,
        finalReviewModelResolved: finalReviewRuntime.resolvedModel,
        finalReviewFallbackApplied: finalReviewRuntime.fallbackApplied,
        finalReviewFallbackReason: finalReviewRuntime.fallbackReason,
        finalReviewApiBaseUrl: finalReviewRuntime.baseUrl,
        finalReviewApiVersion: finalReviewRuntime.apiVersion,
        finalReviewFallbackStatus: finalReviewRuntime.fallbackApplied
          ? "active"
          : "idle",
        finalReviewChannel: {
          channel: "final-review",
          requestedModel: finalReviewRuntime.requestedModel,
          resolvedModel: finalReviewRuntime.resolvedModel,
          resolvedSpecifier: finalReviewRuntime.resolvedSpecifier,
          provider: finalReviewRuntime.provider,
          configured: finalReviewRuntime.configured,
          fallbackApplied: finalReviewRuntime.fallbackApplied,
          fallbackReason: finalReviewRuntime.fallbackReason,
          apiBaseUrl: finalReviewRuntime.baseUrl,
          apiVersion: finalReviewRuntime.apiVersion,
          warnings: finalReviewRuntime.warnings,
        },
        suspicionReviewProbe,
        pdfFirstVisibleSourceKinds: ["direct-extraction", "ocr"],
        intakeLimitations,
      });
    } catch (error) {
      res.status(503).json({
        ok: false,
        status: "degraded",
        service: "file-import-backend",
        error: "خطأ في فحص الصحة",
      });
    }
  });

  app.post("/api/file-extract", extractLimiter, handleExtract);
  app.post("/api/files/extract", extractLimiter, handleExtract);
  app.post("/api/text-extract", extractLimiter, handleTextExtract);
  app.post("/api/suspicion-review", reviewLimiter, handleSuspicionReview);
  app.post("/api/final-review", reviewLimiter, handleFinalReview);
  app.post("/api/ai/context-enhance", aiLimiter, handleContextEnhance);
  app.post("/api/export/pdfa", handleExportPdfA);

  app.use((req, res) => {
    sendJson(res, 404, { success: false, error: "Route not found." });
  });
};
