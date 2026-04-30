/**
 * مسار تحليل مشروع البريك دون بالذكاء الاصطناعي
 *
 * يحلِّل جميع مشاهد السيناريو المُجزَّأة سابقًا في خطوة bootstrap
 * باستخدام Gemini API مباشرة من طبقة Next.js.
 *
 * لا يتطلب:
 * - مصادقة JWT
 * - خلفية منفصلة
 * - قاعدة بيانات
 */

import { NextRequest, NextResponse } from "next/server";

import { analyzeBreakdownLocally } from "@/app/api/breakdown/_lib/breakdown-gemini-server";
import {
  getProjectSession,
  deleteProjectSession,
} from "@/app/api/breakdown/_lib/breakdown-session";
import { logger } from "@/lib/ai/utils/logger";
import { buildSafeErrorResponse } from "@/lib/server/safe-error-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** مهلة الطلب: 5 دقائق (التحليل قد يستغرق وقتًا) */
export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function POST(
  _request: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  let projectId: string;
  try {
    const params = await ctx.params;
    projectId = params.projectId ?? "";
  } catch {
    return buildSafeErrorResponse({
      status: 400,
      fallbackMessage: "معرف المشروع مطلوب.",
      errorCode: "BREAKDOWN_PROJECT_ID_REQUIRED",
      traceIdPrefix: "breakdown",
    });
  }

  if (!projectId) {
    return buildSafeErrorResponse({
      status: 400,
      fallbackMessage: "معرف المشروع غير صالح.",
      errorCode: "BREAKDOWN_PROJECT_ID_INVALID",
      traceIdPrefix: "breakdown",
    });
  }

  // استرداد الجلسة المُخزَّنة
  const session = getProjectSession(projectId);
  if (!session) {
    return buildSafeErrorResponse({
      status: 404,
      fallbackMessage:
        "لم يُعثر على بيانات المشروع أو انتهت صلاحيتها. أعد تجزئة السيناريو أولاً.",
      errorCode: "BREAKDOWN_PROJECT_SESSION_MISSING",
      traceIdPrefix: "breakdown",
    });
  }

  if (session.parsed.scenes.length === 0) {
    return buildSafeErrorResponse({
      status: 422,
      fallbackMessage: "لا توجد مشاهد قابلة للتحليل في السيناريو.",
      errorCode: "BREAKDOWN_NO_SCENES",
      traceIdPrefix: "breakdown",
    });
  }

  try {
    // تحليل المشاهد بالذكاء الاصطناعي
    const report = await analyzeBreakdownLocally(
      session.projectId,
      session.title,
      session.parsed.scenes
    );

    // حذف الجلسة بعد التحليل الناجح (توفير الذاكرة)
    deleteProjectSession(projectId);

    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل تحليل السيناريو";
    logger.error("[breakdown/projects/analyze] خطأ في التحليل:", message);

    return buildSafeErrorResponse({
      status: 500,
      error: message,
      fallbackMessage: "فشل تحليل السيناريو.",
      errorCode: "BREAKDOWN_ANALYSIS_FAILED",
      traceIdPrefix: "breakdown",
    });
  }
}

export async function GET(
  _request: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const params = await ctx.params;
  const projectId = params.projectId ?? "";
  const session = getProjectSession(projectId);

  return NextResponse.json({
    success: true,
    data: {
      projectId,
      sessionFound: !!session,
      sceneCount: session?.parsed.scenes.length ?? 0,
    },
  });
}
