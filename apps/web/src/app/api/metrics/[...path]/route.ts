import { NextRequest } from "next/server";
import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getTargetPath(request: NextRequest): string {
  const upstreamPath = request.nextUrl.pathname.replace(/^\/api\/metrics/, "");
  return `/api/metrics${upstreamPath}`;
}

export async function GET(request: NextRequest) {
  try {
    return await proxyToBackend(request, getTargetPath(request));
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر الاتصال بخدمة القياسات");
  }
}
