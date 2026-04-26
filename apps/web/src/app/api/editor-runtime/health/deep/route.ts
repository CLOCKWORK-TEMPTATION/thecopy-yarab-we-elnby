import { NextRequest } from "next/server";

import {
  buildProxyErrorResponse,
  getEditorRuntimeBaseUrl,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // ترجم الطلب إلى /health/deep في الخادم الخلفي
    return await proxyToBackend(request, "/api/editor-runtime/health/deep", {
      baseUrl: getEditorRuntimeBaseUrl(),
    });
  } catch (error) {
    return buildProxyErrorResponse(
      error,
      "تعذر الاتصال بخدمة فحص الصحة العميقة للمحرر"
    );
  }
}
