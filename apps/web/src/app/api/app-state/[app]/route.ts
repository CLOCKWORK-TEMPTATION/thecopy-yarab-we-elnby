import { NextRequest } from "next/server";
import { z } from "zod";

import {
  AppStateIdSchema,
  AppStatePayloadSchema,
} from "@/lib/app-state-contract";
import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

interface RouteContext {
  params: Promise<{ app: string }>;
}

const AppStateRequestSchema = z.object({
  data: AppStatePayloadSchema,
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveAppId(ctx: RouteContext): Promise<string> {
  const { app } = await ctx.params;
  return AppStateIdSchema.parse(app);
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  try {
    const appId = await resolveAppId(ctx);
    return await proxyToBackend(request, `/api/app-state/${appId}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { success: false, error: "معرف التطبيق غير صالح" },
        { status: 400 }
      );
    }

    return buildProxyErrorResponse(error, "تعذر تحميل حالة التطبيق");
  }
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  try {
    const appId = await resolveAppId(ctx);
    const body = AppStateRequestSchema.parse(await request.json());

    return await proxyToBackend(request, `/api/app-state/${appId}`, {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { success: false, error: "حمولة حالة التطبيق غير صالحة" },
        { status: 400 }
      );
    }

    return buildProxyErrorResponse(error, "تعذر حفظ حالة التطبيق");
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  try {
    const appId = await resolveAppId(ctx);
    return await proxyToBackend(request, `/api/app-state/${appId}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { success: false, error: "معرف التطبيق غير صالح" },
        { status: 400 }
      );
    }

    return buildProxyErrorResponse(error, "تعذر مسح حالة التطبيق");
  }
}
