import { NextRequest } from "next/server";

import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    return await proxyToBackend(request, `/api/projects/${id}/characters`);
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر جلب شخصيات المشروع");
  }
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const rawBody: unknown = await request.json();
    const body = rawBody as Record<string, unknown>;
    return await proxyToBackend(request, "/api/characters", {
      body: JSON.stringify({ ...body, projectId: id }),
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر إنشاء شخصية جديدة");
  }
}
