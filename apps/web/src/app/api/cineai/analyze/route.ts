import { NextRequest } from "next/server";

import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, script } = body;

    if (!projectId) {
      return new Response(
        JSON.stringify({ success: false, error: "معرف المشروع مطلوب" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return await proxyToBackend(request, `/api/projects/${projectId}/analyze`, {
      body: JSON.stringify({ script }),
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر الاتصال بخدمة تحليل السيناريو");
  }
}
