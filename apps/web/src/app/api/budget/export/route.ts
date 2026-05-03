import { NextRequest } from "next/server";

import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

import {
  buildBudgetExportFilename,
  buildBudgetWorkbookBuffer,
} from "../_lib/fallback";

import type { BudgetDocument } from "../../../(main)/BUDGET/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const fallbackPayload = (await request.clone().json().catch(() => null)) as {
    budget?: BudgetDocument;
  } | null;

  try {
    return await proxyToBackend(request, "/api/budget/export");
  } catch (error) {
    if (!fallbackPayload?.budget) {
      return buildProxyErrorResponse(error, "تعذر الاتصال بخدمة تصدير الميزانية");
    }

    const output = await buildBudgetWorkbookBuffer(fallbackPayload.budget);
    return new Response(new Uint8Array(output), {
      headers: {
        "Content-Disposition": `attachment; filename="${encodeURIComponent(buildBudgetExportFilename(fallbackPayload.budget))}"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  }
}
