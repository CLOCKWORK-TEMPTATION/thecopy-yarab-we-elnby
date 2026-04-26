import { NextRequest } from "next/server";

import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    return await proxyToBackend(request, "/api/projects");
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر الاتصال بخدمة المشاريع");
  }
}

export async function POST(request: NextRequest) {
  try {
    return await proxyToBackend(request, "/api/projects");
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر إنشاء المشروع");
  }
}
