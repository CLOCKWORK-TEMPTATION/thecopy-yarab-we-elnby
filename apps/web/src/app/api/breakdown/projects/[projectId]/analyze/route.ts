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
    return NextResponse.json(
      { success: false, error: "معرف المشروع مطلوب" },
      { status: 400 }
    );
  }

  if (!projectId) {
    return NextResponse.json(
      { success: false, error: "معرف المشروع غير صالح" },
      { status: 400 }
    );
  }

  // استرداد الجلسة المُخزَّنة
  const session = getProjectSession(projectId);
  if (!session) {
    return NextResponse.json(
      {
        success: false,
        error:
          "لم يُعثر على بيانات المشروع أو انتهت صلاحيتها. يرجى إعادة تجزئة السيناريو أولًا.",
      },
      { status: 404 }
    );
  }

  if (session.parsed.scenes.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "لا توجد مشاهد قابلة للتحليل في السيناريو.",
      },
      { status: 422 }
    );
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

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
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
