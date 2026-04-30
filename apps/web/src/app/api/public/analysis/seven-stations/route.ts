import { NextRequest, NextResponse } from "next/server";

import { getBackendBaseUrl } from "@/lib/server/backend-proxy";
import { withNoStoreHeaders } from "@/lib/server/no-store";
import {
  buildSafeErrorResponse,
  readSafeResponseMessage,
} from "@/lib/server/safe-error-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ANALYSIS_ERROR_MESSAGES: Record<number, string> = {
  400: "بيانات التحليل غير صحيحة.",
  401: "جلسة التحليل غير مصرح بها.",
  403: "جلسة التحليل غير متاحة لهذا المتصفح.",
  404: "خدمة التحليل غير متاحة الآن.",
  413: "النص المدخل أكبر من الحد المسموح.",
  429: "تم الوصول إلى حد الطلبات مؤقتاً.",
  502: "خدمة التحليل غير متاحة الآن.",
  503: "خدمة التحليل مشغولة الآن.",
  504: "انتهت مهلة الاتصال بخدمة التحليل.",
};

function safeAnalysisMessage(status: number): string {
  return ANALYSIS_ERROR_MESSAGES[status] ?? "تعذر تنفيذ طلب التحليل.";
}

function normalizeUpstreamFailureStatus(status: number): number {
  return status >= 500 ? 502 : status;
}

export async function POST(request: NextRequest) {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return buildSafeErrorResponse({
        status: 500,
        fallbackMessage: "خدمة التحليل غير مهيأة الآن.",
        errorCode: "ANALYSIS_BACKEND_NOT_CONFIGURED",
        traceIdPrefix: "analysis",
      });
    }

    const upstreamResponse = await fetch(
      `${backendBaseUrl}/api/public/analysis/seven-stations`,
      {
        method: "POST",
        headers: {
          "content-type":
            request.headers.get("content-type") ?? "application/json",
          accept: request.headers.get("accept") ?? "application/json",
        },
        body: await request.text(),
        cache: "no-store",
      }
    );

    if (!upstreamResponse.ok) {
      const status = normalizeUpstreamFailureStatus(upstreamResponse.status);
      const fallbackMessage = safeAnalysisMessage(status);
      const message = await readSafeResponseMessage(
        upstreamResponse,
        fallbackMessage
      );

      return buildSafeErrorResponse({
        status,
        error: message,
        fallbackMessage,
        errorCode: "ANALYSIS_UPSTREAM_FAILED",
        traceIdPrefix: "analysis",
      });
    }

    const contentType =
      upstreamResponse.headers.get("content-type") ?? "application/json";
    if (!contentType.toLowerCase().includes("application/json")) {
      return buildSafeErrorResponse({
        status: 502,
        fallbackMessage: "خدمة التحليل أعادت رداً غير صالح.",
        errorCode: "ANALYSIS_UPSTREAM_INVALID_RESPONSE",
        traceIdPrefix: "analysis",
      });
    }

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: withNoStoreHeaders({
        "content-type": contentType,
      }),
    });
  } catch (error) {
    return buildSafeErrorResponse({
      status: 503,
      error,
      fallbackMessage: "تعذر الاتصال بخدمة التحليل العامة.",
      errorCode: "ANALYSIS_PUBLIC_ROUTE_FAILED",
      traceIdPrefix: "analysis",
    });
  }
}
