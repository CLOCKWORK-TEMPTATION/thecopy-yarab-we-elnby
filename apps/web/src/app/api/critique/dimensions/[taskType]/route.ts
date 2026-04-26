import { NextRequest } from "next/server";

import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskType: string }> }
) {
  try {
    const { taskType } = await params;
    return await proxyToBackend(
      request,
      `/api/critique/dimensions/${taskType}`
    );
  } catch (error) {
    return buildProxyErrorResponse(
      error,
      "تعذر الاتصال بخدمة أبعاد النقد الذاتي"
    );
  }
}
