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
    // فحص ما إذا كان هناك طلب للصحة العميقة عبر query parameter
    const deepParam = request.nextUrl.searchParams.get("deep");
    const targetPath =
      deepParam === "1" || deepParam === "true"
        ? "/api/editor-runtime/health/deep"
        : "/api/editor-runtime/health";

    return await proxyToBackend(request, targetPath, {
      baseUrl: getEditorRuntimeBaseUrl(),
    });
  } catch (error) {
    return buildProxyErrorResponse(
      error,
      "تعذر الاتصال بخدمة فحص جاهزية المحرر"
    );
  }
}
