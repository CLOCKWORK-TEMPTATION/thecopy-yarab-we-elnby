import { NextRequest } from "next/server";

import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const payload = isRecord(body) ? body : {};
    const projectId = payload["projectId"];
    const script = payload["script"];

    if (typeof projectId !== "string" || projectId.trim().length === 0) {
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
