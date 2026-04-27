import { NextRequest, NextResponse } from "next/server";

import {
  buildProxyErrorResponse,
  getBackendBaseUrl,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  try {
    return await proxyToBackend(request, "/api/brainstorm");
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر تحميل كتالوج Brain Storm AI");
  }
}

export async function POST(request: NextRequest) {
  try {
    return await proxyToBackend(request, "/api/brainstorm");
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر تنفيذ مناظرة Brain Storm AI");
  }
}

export function HEAD() {
  return NextResponse.json({
    service: "Brain Storm AI",
    status: "proxied to backend",
    backend: getBackendBaseUrl(),
  });
}
