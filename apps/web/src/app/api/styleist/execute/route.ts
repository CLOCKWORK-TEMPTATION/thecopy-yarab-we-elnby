import { NextRequest } from "next/server";
import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    return await proxyToBackend(request, "/api/styleist/execute");
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر الاتصال بخدمة styleIST");
  }
}
