import { NextRequest, NextResponse } from "next/server";

import {
  buildProxyErrorResponse,
  getBackendBaseUrl,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    return await proxyToBackend(request, "/api/workflow/presets");
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر جلب قوالب الورك فلو");
  }
}

export function HEAD() {
  return NextResponse.json({
    service: "Workflow Presets",
    status: "proxied to backend",
    backend: getBackendBaseUrl(),
  });
}
