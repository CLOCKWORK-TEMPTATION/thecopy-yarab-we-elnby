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

    // إصلاح P0-3: التحقق من أن النتيجة فعلياً تحتوي بيانات قبل الإرجاع.
    // empty response لا يجوز أن يمر كنجاح.
    if (
      report === null ||
      report === undefined ||
      (Array.isArray((report as { scenes?: unknown[] }).scenes) &&
        ((report as { scenes: unknown[] }).scenes.length ?? 0) === 0)
    ) {
      logger.error(
        "[breakdown/projects/analyze] التحليل أرجع نتيجة فارغة — يُعتبر فشلاً",
        { projectId },
      );
      return buildSafeErrorResponse({
        status: 502,
        fallbackMessage: "لم يرجع التحليل أي نتيجة قابلة للاستخدام.",
        errorCode: "BREAKDOWN_MODEL_EMPTY",
        traceIdPrefix: "breakdown",
      });
    }

    // حذف الجلسة بعد التحليل الناجح (توفير الذاكرة)
    deleteProjectSession(projectId);

    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل تحليل السيناريو";

    // إصلاح P0-3: تصنيف الفشل بدل 500 خام.
    // الواجهة تستخدم status لتحديد كيف تعرض الخطأ، و500 الخام يجعلها
    // تبقى في "جاري التحليل" بلا رسالة. الآن نُرجع status مناسباً
    // ورسالة عربية واضحة، ولا يتسرّب stack trace.

    const lower = message.toLowerCase();
    const inferredStatus = (() => {
      if (lower.includes("timeout") || lower.includes("aborted")) {
        return { status: 504, code: "BREAKDOWN_ANALYSIS_TIMEOUT", msg: "انتهت مهلة التحليل." };
      }
      if (
        lower.includes("api key") ||
        lower.includes("missing key") ||
        lower.includes("api_key")
      ) {
        return {
          status: 503,
          code: "BREAKDOWN_AI_UNAVAILABLE",
          msg: "خدمة التحليل غير متاحة حالياً. يرجى المحاولة لاحقاً.",
        };
      }
      if (lower.includes("rate limit") || lower.includes("quota")) {
        return {
          status: 429,
          code: "BREAKDOWN_QUOTA_EXCEEDED",
          msg: "تجاوزت حد الاستخدام. يرجى المحاولة لاحقاً.",
        };
      }
      if (lower.includes("validation") || lower.includes("schema")) {
        return {
          status: 422,
          code: "BREAKDOWN_VALIDATION_ERROR",
          msg: "بيانات السيناريو غير صالحة للتحليل.",
        };
      }
      return {
        status: 502,
        code: "BREAKDOWN_ANALYSIS_FAILED",
        msg: "فشل تحليل السيناريو. تم تسجيل الخطأ ويمكنك إعادة المحاولة.",
      };
    })();

    logger.error("[breakdown/projects/analyze] خطأ في التحليل:", {
      projectId,
      classifiedCode: inferredStatus.code,
      classifiedStatus: inferredStatus.status,
      technicalMessage: message,
    });

    return buildSafeErrorResponse({
      status: inferredStatus.status,
      fallbackMessage: inferredStatus.msg,
      errorCode: inferredStatus.code,
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
