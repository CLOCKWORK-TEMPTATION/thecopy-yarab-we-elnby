import { NextRequest, NextResponse } from "next/server";
import {
  buildProxyErrorResponse,
  getBackendBaseUrl,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    return await proxyToBackend(request, "/api/analysis/seven-stations");
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر الاتصال بخدمة التحليل السباعي");
  }
}

export async function GET() {
  return NextResponse.json({
    service: "Seven Stations Analysis",
    status: "proxied to backend",
    backend: getBackendBaseUrl(),
  });
}
