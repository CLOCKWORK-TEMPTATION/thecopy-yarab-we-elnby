/**
 * مسار التحليل المُدمج لخدمة البريك دون
 *
 * يُجزِّئ النص ويُحلِّله في طلب واحد باستخدام Gemini مباشرة.
 * لا يتطلب مصادقة أو خلفية منفصلة.
 */

import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { segmentScriptLocally } from "@/app/(main)/breakdown/infrastructure/screenplay/local-segmenter";
import { analyzeBreakdownLocally } from "@/app/api/breakdown/_lib/breakdown-gemini-server";
import { logger } from "@/lib/ai/utils/logger";
import { getBackendBaseUrl } from "@/lib/server/backend-proxy";
import { buildSafeErrorResponse } from "@/lib/server/safe-error-response";

export async function POST(request: NextRequest) {
  try {
    let body: {
      script?: string;
      title?: string;
    };

    try {
      body = (await request.json()) as {
        script?: string;
        title?: string;
      };
    } catch {
      return buildSafeErrorResponse({
        status: 400,
        fallbackMessage: "تنسيق طلب البريك دون غير صالح.",
        errorCode: "BREAKDOWN_INVALID_JSON",
        traceIdPrefix: "breakdown",
      });
    }

    const { script, title } = body;

    if (!script || !String(script).trim()) {
      return buildSafeErrorResponse({
        status: 400,
        fallbackMessage: "نص السيناريو مطلوب.",
        errorCode: "BREAKDOWN_SCRIPT_REQUIRED",
        traceIdPrefix: "breakdown",
      });
    }

    const scriptContent = String(script).trim();
    const projectTitle =
      typeof title === "string" && title.trim() ? title.trim() : "تحليل مباشر";
    const projectId = randomUUID();

    // تجزئة السيناريو محليًا
    const parsed = segmentScriptLocally(scriptContent);

    if (parsed.scenes.length === 0) {
      return buildSafeErrorResponse({
        status: 422,
        fallbackMessage:
          "لم يُكتشف أي مشهد في السيناريو. تأكد من تنسيق عناوين المشاهد.",
        errorCode: "BREAKDOWN_NO_SCENES",
        traceIdPrefix: "breakdown",
      });
    }

    // التحليل بالذكاء الاصطناعي
    const report = await analyzeBreakdownLocally(
      projectId,
      projectTitle,
      parsed.scenes
    );

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    logger.error("[breakdown/analyze] خطأ:", message);

    return buildSafeErrorResponse({
      status: 500,
      error: message,
      fallbackMessage: "فشل تحليل السيناريو.",
      errorCode: "BREAKDOWN_ANALYSIS_FAILED",
      traceIdPrefix: "breakdown",
    });
  }
}

export function GET() {
  return NextResponse.json({
    success: true,
    data: {
      service: "breakdown-analyze",
      backend: getBackendBaseUrl(),
      source: "nextjs-native",
    },
  });
}
