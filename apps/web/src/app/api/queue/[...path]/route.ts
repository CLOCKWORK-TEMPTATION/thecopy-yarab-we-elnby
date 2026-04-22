import { NextRequest } from "next/server";
import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getTargetPath(request: NextRequest): string {
  const upstreamPath = request.nextUrl.pathname.replace(/^\/api\/queue/, "");
  return `/api/queue${upstreamPath}`;
}

async function handle(request: NextRequest) {
  return proxyToBackend(request, getTargetPath(request));
}

export async function GET(request: NextRequest) {
  try {
    return await handle(request);
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر الاتصال بخدمة الطوابير");
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handle(request);
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر الاتصال بخدمة الطوابير");
  }
}
