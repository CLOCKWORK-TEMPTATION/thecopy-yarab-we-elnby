import { NextRequest } from "next/server";

import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

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
    return await proxyToBackend(request, targetPath, {
      timeoutMs: timeoutForTargetPath(targetPath),
    });
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر الاتصال بخدمة التحليل العامة");
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  try {
    const targetPath = await buildTargetPath(context);
    return await proxyToBackend(request, targetPath, {
      timeoutMs: timeoutForTargetPath(targetPath),
    });
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر الاتصال بخدمة التحليل العامة");
  }
}
