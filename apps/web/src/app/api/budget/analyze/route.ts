import { NextRequest } from "next/server";

import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

import {
  buildFallbackBudgetAnalysis,
  buildFallbackMeta,
  readBudgetFallbackInput,
} from "../_lib/fallback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const fallbackInput = readBudgetFallbackInput(await request.clone().json().catch(() => null));

  try {
    return await proxyToBackend(request, "/api/budget/analyze");
  } catch (error) {
    if (!fallbackInput.scenario) {
      return buildProxyErrorResponse(error, "تعذر الاتصال بخدمة تحليل الميزانية");
    }

    return Response.json({
      success: true,
      data: {
        analysis: buildFallbackBudgetAnalysis(fallbackInput),
        meta: buildFallbackMeta("backend-unavailable"),
      },
    });
  }
}
