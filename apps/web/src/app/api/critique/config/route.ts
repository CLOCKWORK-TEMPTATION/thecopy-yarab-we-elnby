import { NextRequest } from "next/server";

import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    return await proxyToBackend(request, "/api/critique/config");
  } catch (error) {
    return buildProxyErrorResponse(
      error,
      "تعذر الاتصال بخدمة إعدادات النقد الذاتي"
    );
  }
}
