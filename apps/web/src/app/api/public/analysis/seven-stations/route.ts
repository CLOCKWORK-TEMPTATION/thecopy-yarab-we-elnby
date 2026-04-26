import { NextRequest, NextResponse } from "next/server";

import { getBackendBaseUrl } from "@/lib/server/backend-proxy";
import {
  withNoStoreHeaders,
  withNoStoreResponseInit,
} from "@/lib/server/no-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Backend base URL is not configured",
        },
        { status: 500 }
      );
    }

    const upstreamResponse = await fetch(
      `${backendBaseUrl}/api/public/analysis/seven-stations`,
      {
        method: "POST",
        headers: {
          "content-type":
            request.headers.get("content-type") ?? "application/json",
          accept: request.headers.get("accept") ?? "application/json",
        },
        body: await request.text(),
        cache: "no-store",
      }
    );

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: withNoStoreHeaders({
        "content-type":
          upstreamResponse.headers.get("content-type") ?? "application/json",
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "تعذر الاتصال بخدمة التحليل العامة";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      withNoStoreResponseInit({ status: 500 })
    );
  }
}
