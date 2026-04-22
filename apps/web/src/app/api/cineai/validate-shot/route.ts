import { NextRequest, NextResponse } from "next/server";
import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const image = formData.get("image");

      if (!(image instanceof File)) {
        return NextResponse.json(
          { success: false, error: "Image is required" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await image.arrayBuffer());
      return await proxyToBackend(request, "/api/cineai/validate-shot", {
        body: JSON.stringify({
          imageBase64: buffer.toString("base64"),
          mimeType: image.type || "image/png",
        }),
        headers: {
          "content-type": "application/json",
        },
      });
    }

    return await proxyToBackend(request, "/api/cineai/validate-shot");
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر الاتصال بخدمة تحليل اللقطة");
  }
}
