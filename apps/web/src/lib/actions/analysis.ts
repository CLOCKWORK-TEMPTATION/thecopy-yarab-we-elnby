"use server";

import { z } from "zod";

import { clientEnv } from "@/env";
import {
  buildFallbackSevenStationsResult,
  serializeAnalysisValue,
  type AnalysisPipelinePayload,
} from "@/lib/analysis/seven-stations-fallback";

// ==========================================
// مخطط التحقق من مدخلات خط الأنابيب
// ==========================================
const pipelineRequestSchema = z.object({
  fullText: z.string().min(1, "النص مطلوب"),
  projectName: z.string().min(1).default("تحليل درامي شامل"),
});

export type PipelineInput = z.infer<typeof pipelineRequestSchema>;
export type PipelineResult = AnalysisPipelinePayload;

// ==========================================
// ثوابت المحطات المتوقعة
// ==========================================
const EXPECTED_STATION_KEYS = [
  "station1",
  "station2",
  "station3",
  "station4",
  "station5",
  "station6",
  "station7",
] as const;

// ==========================================
// تحديد عنوان الخادم الخلفي
// ==========================================
function resolveBackendBaseUrl(): string | null {
  // الأولوية: متغيرات الخادم ثم متغيرات العميل ثم القيمة الافتراضية للتطوير
  return (
    process.env["NEXT_PUBLIC_API_URL"] ??
    process.env["NEXT_PUBLIC_BACKEND_URL"] ??
    process.env["BACKEND_URL"] ??
    clientEnv.NEXT_PUBLIC_API_URL ??
    clientEnv.NEXT_PUBLIC_BACKEND_URL ??
    (process.env.NODE_ENV !== "production" ? "http://localhost:3001" : null) ??
    null
  );
}

// ==========================================
// تطبيع مخرجات محطة واحدة من الخادم إلى الشكل الموحد
// ==========================================
// الخادم يعيد: { stationId, stationName, details: { fullAnalysis, finalReport, ... } }
// الواجهة تتوقع: محتوى مسطّح مباشر (logline, majorCharacters, finalReport, ...)
function normalizeBackendStation(
  raw: Record<string, unknown>
): Record<string, unknown> {
  // إذا كان المحتوى يحتوي مباشرة على بنية الـ fallback، أعِده كما هو
  if (
    raw.logline ||
    raw.finalReport ||
    raw.efficiencyMetrics ||
    raw.dynamicAnalysisResults
  ) {
    return raw;
  }

  // إذا كان بشكل الخادم الخلفي { details: { ... } }، استخرج المحتوى
  const details = raw.details as Record<string, unknown> | undefined;
  if (details && typeof details === "object") {
    return {
      ...details,
      stationId: raw.stationId,
      stationName: raw.stationName,
      status: raw.status,
      executionTime: raw.executionTime,
    };
  }

  // أعِده كما هو مع كل الحقول
  return raw;
}

// ==========================================
// تطبيع نتيجة خط الأنابيب الكاملة
// ==========================================
function normalizePipelineResult(
  result: Record<string, unknown>,
  request: PipelineInput
): AnalysisPipelinePayload {
  const rawOutputs = (result.stationOutputs ??
    result.detailedResults ??
    {}) as Record<string, Record<string, unknown>>;

  const serialized = serializeAnalysisValue(rawOutputs);

  // تطبيع كل محطة من شكل الخادم إلى الشكل الموحد
  const normalizedOutputs: Record<string, Record<string, unknown>> = {};
  for (const key of EXPECTED_STATION_KEYS) {
    if (serialized[key] && typeof serialized[key] === "object") {
      normalizedOutputs[key] = normalizeBackendStation(serialized[key]);
    }
  }

  const metadata = serializeAnalysisValue(
    (result.metadata ?? result.pipelineMetadata ?? {}) as Record<
      string,
      unknown
    >
  );

  const hasStations = Object.keys(normalizedOutputs).length > 0;

  if (!hasStations) {
    throw new Error(
      "لم تُنتج المحطات أي مخرجات قابلة للعرض — " +
        `المفاتيح الواردة: [${Object.keys(serialized).join(", ")}]`
    );
  }

  return {
    success: Boolean(result.success),
    mode: "ai",
    warnings: [],
    stationOutputs: normalizedOutputs,
    metadata: {
      ...metadata,
      analysisMode: "ai",
      projectName: request.projectName,
      textLength: request.fullText.length,
    },
  };
}

// ==========================================
// تنفيذ خط الأنابيب مع fallback تلقائي
// ==========================================
export async function runFullPipeline(
  input: PipelineInput
): Promise<PipelineResult> {
  const request = pipelineRequestSchema.parse(input);
  const backendBaseUrl = resolveBackendBaseUrl();

  // إذا لم يكن الخادم مهيأ، فعّل المسار الاحتياطي مباشرة
  if (!backendBaseUrl) {
    return buildFallbackSevenStationsResult({
      fullText: request.fullText,
      projectName: request.projectName,
      warning:
        "لم يتم تهيئة عنوان الخادم الخلفي — يتم استخدام المسار الاحتياطي المحلي.",
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 280_000); // أقل من maxDuration

    const response = await fetch(
      `${backendBaseUrl.replace(/\/$/, "")}/api/public/analysis/seven-stations`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: request.fullText, async: false }),
        cache: "no-store",
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const statusDetail = `HTTP ${response.status}${errorText ? ` — ${errorText.slice(0, 200)}` : ""}`;
      // فشل الخادم — تفعيل المسار الاحتياطي
      return buildFallbackSevenStationsResult({
        fullText: request.fullText,
        projectName: request.projectName,
        warning: `فشل الخادم الخلفي (${statusDetail}) — يتم استخدام التحليل الاحتياطي المحلي.`,
      });
    }

    const payload = (await response.json()) as Record<string, unknown>;

    // المسار الأول: الخادم يعيد detailedResults (شكل buildPipelineResponse)
    if (payload.detailedResults) {
      try {
        return normalizePipelineResult(
          { ...payload, stationOutputs: payload.detailedResults },
          request
        );
      } catch {
        // إذا فشل التطبيع، فعّل المسار الاحتياطي
        return buildFallbackSevenStationsResult({
          fullText: request.fullText,
          projectName: request.projectName,
          warning:
            "بيانات الخادم الخلفي غير مكتملة — يتم استخدام التحليل الاحتياطي.",
        });
      }
    }

    // المسار الثاني: الخادم يعيد stationOutputs مباشرة
    if (payload.stationOutputs) {
      try {
        return normalizePipelineResult(payload, request);
      } catch {
        return buildFallbackSevenStationsResult({
          fullText: request.fullText,
          projectName: request.projectName,
          warning:
            "بيانات الخادم غير قابلة للتطبيع — يتم استخدام التحليل الاحتياطي.",
        });
      }
    }

    // لا detailedResults ولا stationOutputs — المسار الاحتياطي
    return buildFallbackSevenStationsResult({
      fullText: request.fullText,
      projectName: request.projectName,
      warning:
        "استجابة الخادم لا تحتوي على مخرجات محطات — يتم استخدام التحليل الاحتياطي.",
    });
  } catch (error) {
    // أي خطأ شبكي أو timeout — فعّل المسار الاحتياطي
    const reason = error instanceof Error ? error.message : "خطأ غير معروف";
    return buildFallbackSevenStationsResult({
      fullText: request.fullText,
      projectName: request.projectName,
      warning: `تعذر الاتصال بالخادم الخلفي (${reason}) — يتم استخدام التحليل الاحتياطي المحلي.`,
    });
  }
}
