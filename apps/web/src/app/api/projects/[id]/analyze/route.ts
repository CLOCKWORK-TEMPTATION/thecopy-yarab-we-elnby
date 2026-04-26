import { NextRequest } from "next/server";

import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    return await proxyToBackend(request, `/api/projects/${id}/analyze`);
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر تحليل المشروع");
  }
}
