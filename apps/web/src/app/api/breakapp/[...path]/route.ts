import { NextRequest } from "next/server";
import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };

function getTargetPath(path: string[]): string {
  return `/api/breakapp/${path.join("/")}`;
}

async function handle(request: NextRequest, path: string[]) {
  return proxyToBackend(request, getTargetPath(path));
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  try {
    const { path } = await ctx.params;
    return await handle(request, path);
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر الاتصال بخدمة BREAKAPP");
  }
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  try {
    const { path } = await ctx.params;
    return await handle(request, path);
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر الاتصال بخدمة BREAKAPP");
  }
}
