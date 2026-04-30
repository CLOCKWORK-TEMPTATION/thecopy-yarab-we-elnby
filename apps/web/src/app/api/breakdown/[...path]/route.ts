import { NextRequest } from "next/server";

import { proxyToBackend } from "@/lib/server/backend-proxy";
import {
  buildSafeErrorResponse,
  replaceFailureWithSafeEnvelope,
} from "@/lib/server/safe-error-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

function getTargetPath(path: string[]): string {
  return `/api/breakdown/${path.join("/")}`;
}

async function handle(request: NextRequest, path: string[]) {
  const response = await proxyToBackend(request, getTargetPath(path));
  return replaceFailureWithSafeEnvelope(response, {
    status: response.status >= 500 ? 502 : response.status,
    fallbackMessage: "تعذر تنفيذ طلب البريك دون.",
    errorCode: "BREAKDOWN_UPSTREAM_FAILED",
    traceIdPrefix: "breakdown",
  });
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  try {
    const { path } = await ctx.params;
    return await handle(request, path);
  } catch (error) {
    return buildSafeErrorResponse({
      status: 503,
      error,
      fallbackMessage: "تعذر الاتصال بخدمة البريك دون.",
      errorCode: "BREAKDOWN_PROXY_FAILED",
      traceIdPrefix: "breakdown",
    });
  }
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  try {
    const { path } = await ctx.params;
    return await handle(request, path);
  } catch (error) {
    return buildSafeErrorResponse({
      status: 503,
      error,
      fallbackMessage: "تعذر الاتصال بخدمة البريك دون.",
      errorCode: "BREAKDOWN_PROXY_FAILED",
      traceIdPrefix: "breakdown",
    });
  }
}
