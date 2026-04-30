/**
 * مسار إنشاء مشروع البريك دون وتجزئة السيناريو
 *
 * يعمل بالكامل على جانب Next.js دون الحاجة إلى:
 * - مصادقة JWT
 * - خلفية منفصلة
 * - قاعدة بيانات
 *
 * يجزِّئ نص السيناريو محليًا ويُخزِّن النتيجة مؤقتًا لخطوة التحليل.
 */

import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { segmentScriptLocally } from "@/app/(main)/breakdown/infrastructure/screenplay/local-segmenter";
import { storeProjectSession } from "@/app/api/breakdown/_lib/breakdown-session";
import { logger } from "@/lib/ai/utils/logger";
import { buildSafeErrorResponse } from "@/lib/server/safe-error-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BootstrapRequestBody {
  scriptContent?: string;
  title?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    let body: BootstrapRequestBody;
    try {
      body = (await request.json()) as BootstrapRequestBody;
    } catch {
      return buildSafeErrorResponse({
        status: 400,
        fallbackMessage: "تنسيق طلب البريك دون غير صالح.",
        errorCode: "BREAKDOWN_INVALID_JSON",
        traceIdPrefix: "breakdown",
      });
    }

    const scriptContent =
      typeof body.scriptContent === "string" ? body.scriptContent.trim() : "";

    // التحقق من وجود نص السيناريو
    if (!scriptContent) {
      return buildSafeErrorResponse({
        status: 400,
        fallbackMessage: "نص السيناريو مطلوب.",
        errorCode: "BREAKDOWN_SCRIPT_REQUIRED",
        traceIdPrefix: "breakdown",
      });
    }

    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : "مشروع بريك دون";

    // تجزئة السيناريو محليًا — لا تتطلب API خارجي
    const parsed = segmentScriptLocally(scriptContent);

    // توليد معرف فريد للمشروع
    const projectId = randomUUID();

    // حفظ الجلسة مؤقتًا للتحليل اللاحق
    storeProjectSession({
      projectId,
      title,
      scriptContent,
      parsed,
      createdAt: Date.now(),
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          projectId,
          title,
          parsed,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل تجزئة السيناريو";
    logger.error("[breakdown/projects/bootstrap] خطأ:", message);

    return buildSafeErrorResponse({
      status: 500,
      error: message,
      fallbackMessage: "فشل تجهيز مشروع البريك دون.",
      errorCode: "BREAKDOWN_BOOTSTRAP_FAILED",
      traceIdPrefix: "breakdown",
    });
  }
}

export function GET(): NextResponse {
  return NextResponse.json({
    success: true,
    data: {
      endpoint: "breakdown-bootstrap",
      description: "يُجزِّئ نص السيناريو ويُنشئ مشروع بريك دون مؤقتًا",
    },
  });
}
