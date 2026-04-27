/**
 * مسار فحص الصحة لخدمة البريك دون
 *
 * يُعيد استجابة سريعة دون الحاجة إلى الخلفية أو المصادقة.
 * يُستخدم أيضًا لضبط رمز CSRF قبل إرسال الطلبات.
 */

import { randomBytes } from "crypto";

import { NextRequest, NextResponse } from "next/server";

const CSRF_COOKIE_NAME = "XSRF-TOKEN";

/** توليد رمز CSRF آمن */
function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

/** إعداد رمز CSRF في ملف تعريف الارتباط إذا لم يكن موجودًا */
function ensureCsrfCookie(request: NextRequest, response: NextResponse): void {
  const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (!existingToken) {
    const token = generateCsrfToken();
    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60,
      path: "/",
    });
  }
}

export function GET(request: NextRequest): NextResponse {
  const response = NextResponse.json({
    success: true,
    data: {
      service: "breakdown",
      status: "ok",
      timestamp: new Date().toISOString(),
      source: "nextjs-native",
    },
  });

  // ضبط رمز CSRF للطلبات اللاحقة
  ensureCsrfCookie(request, response);
  return response;
}
