import { NextRequest } from "next/server";
import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    return await proxyToBackend(request, `/api/scenes/${id}/shots`);
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر جلب لقطات المشهد");
  }
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    return await proxyToBackend(request, "/api/shots", {
      body: JSON.stringify({ ...body, sceneId: id }),
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر إنشاء لقطة جديدة");
  }
}
