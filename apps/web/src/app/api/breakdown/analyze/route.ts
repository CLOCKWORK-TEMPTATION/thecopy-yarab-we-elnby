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

export async function POST(request: NextRequest) {
  try {
    const { script, title } = (await request.json()) as {
      script?: string;
      title?: string;
    };

    if (!script || !String(script).trim()) {
      return NextResponse.json(
        { success: false, error: "Script content is required" },
        { status: 400 }
      );
    }

    const scriptContent = String(script).trim();
    const projectTitle =
      typeof title === "string" && title.trim() ? title.trim() : "تحليل مباشر";
    const projectId = randomUUID();

    // تجزئة السيناريو محليًا
    const parsed = segmentScriptLocally(scriptContent);

    if (parsed.scenes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "لم يُكتشف أي مشهد في السيناريو. تأكد من تنسيق عناوين المشاهد.",
        },
        { status: 422 }
      );
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

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      service: "breakdown-analyze",
      backend: getBackendBaseUrl(),
      source: "nextjs-native",
    },
  });
}
