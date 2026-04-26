import { NextRequest } from "next/server";

import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    return await proxyToBackend(request, `/api/projects/${id}`);
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر جلب بيانات المشروع");
  }
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    return await proxyToBackend(request, `/api/projects/${id}`);
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر تحديث المشروع");
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    return await proxyToBackend(request, `/api/projects/${id}`);
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر حذف المشروع");
  }
}
