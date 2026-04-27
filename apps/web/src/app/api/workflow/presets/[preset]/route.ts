import { NextRequest, NextResponse } from "next/server";

import {
  buildProxyErrorResponse,
  getBackendBaseUrl,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { preset: string } }
) {
  try {
    return await proxyToBackend(
      request,
      `/api/workflow/presets/${params.preset}`
    );
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر جلب تفاصيل قالب الورك فلو");
  }
}

export function HEAD(
  _request: NextRequest,
  { params }: { params: { preset: string } }
) {
  return NextResponse.json({
    service: "Workflow Preset Detail",
    preset: params.preset,
    status: "proxied to backend",
    backend: getBackendBaseUrl(),
  });
}
