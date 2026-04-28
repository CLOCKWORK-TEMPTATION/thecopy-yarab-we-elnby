import { NextRequest, NextResponse } from "next/server";

import {
  buildProxyErrorResponse,
  getBackendBaseUrl,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "طلب غير صالح: يجب أن يكون الجسم JSON صحيح" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "يجب توفير بيانات الطلب" },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;

    if (
      !("config" in payload) ||
      payload["config"] === undefined ||
      payload["config"] === null
    ) {
      return NextResponse.json(
        { success: false, error: "الحقل config مطلوب" },
        { status: 400 }
      );
    }

    if (
      !("input" in payload) ||
      payload["input"] === undefined ||
      payload["input"] === null
    ) {
      return NextResponse.json(
        { success: false, error: "الحقل input مطلوب" },
        { status: 400 }
      );
    }

    return await proxyToBackend(request, "/api/workflow/execute-custom", {
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر تنفيذ الورك فلو المخصص");
  }
}

export function HEAD() {
  return NextResponse.json({
    service: "Workflow Execute Custom",
    status: "proxied to backend",
    backend: getBackendBaseUrl(),
  });
}
