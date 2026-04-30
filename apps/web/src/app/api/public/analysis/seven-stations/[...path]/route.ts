import { NextRequest } from "next/server";

import { proxyToBackend } from "@/lib/server/backend-proxy";
import {
  buildSafeErrorResponse,
  replaceFailureWithSafeEnvelope,
} from "@/lib/server/safe-error-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ path?: string[] }>;
}

async function buildTargetPath(context: RouteContext): Promise<string> {
  const { path = [] } = await context.params;
  const suffix = path.map((segment) => encodeURIComponent(segment)).join("/");
  return suffix
    ? `/api/public/analysis/seven-stations/${suffix}`
    : "/api/public/analysis/seven-stations";
}

function timeoutForTargetPath(targetPath: string): number {
  return targetPath.includes("/stream/") ? 30 * 60 * 1_000 : 300_000;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  try {
    const targetPath = await buildTargetPath(context);
    const response = await proxyToBackend(request, targetPath, {
      timeoutMs: timeoutForTargetPath(targetPath),
    });
    return await replaceFailureWithSafeEnvelope(response, {
      status: response.status >= 500 ? 502 : response.status,
      fallbackMessage: "تعذر تنفيذ طلب التحليل.",
      errorCode: "ANALYSIS_UPSTREAM_FAILED",
      traceIdPrefix: "analysis",
    });
  } catch (error) {
    return buildSafeErrorResponse({
      status: 503,
      error,
      fallbackMessage: "تعذر الاتصال بخدمة التحليل العامة.",
      errorCode: "ANALYSIS_PUBLIC_PROXY_FAILED",
      traceIdPrefix: "analysis",
    });
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  try {
    const targetPath = await buildTargetPath(context);
    const response = await proxyToBackend(request, targetPath, {
      timeoutMs: timeoutForTargetPath(targetPath),
    });
    return await replaceFailureWithSafeEnvelope(response, {
      status: response.status >= 500 ? 502 : response.status,
      fallbackMessage: "تعذر تنفيذ طلب التحليل.",
      errorCode: "ANALYSIS_UPSTREAM_FAILED",
      traceIdPrefix: "analysis",
    });
  } catch (error) {
    return buildSafeErrorResponse({
      status: 503,
      error,
      fallbackMessage: "تعذر الاتصال بخدمة التحليل العامة.",
      errorCode: "ANALYSIS_PUBLIC_PROXY_FAILED",
      traceIdPrefix: "analysis",
    });
  }
}
