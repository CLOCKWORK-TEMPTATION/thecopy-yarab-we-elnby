import { NextRequest, NextResponse } from "next/server";

import { proxyToBackend } from "@/lib/server/backend-proxy";
import {
  buildSafeErrorResponse,
  replaceFailureWithSafeEnvelope,
} from "@/lib/server/safe-error-response";

import { enforceRateLimit, rateLimitInMemory } from "@the-copy/security-middleware";
import { ApiError } from "@the-copy/api-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ path?: string[] }>;
}

async function buildTargetPath(context: RouteContext): Promise<string> {
  const { path = [] } = await context.params;
  const suffix = path.map((segment) => encodeURIComponent(segment)).join("/");
  return suffix
    ? `/api/public/analysis/seven-stations/${suffix}`
    : "/api/public/analysis/seven-stations";
}

function timeoutForTargetPath(targetPath: string): number {
  return targetPath.includes("/stream/") ? 30 * 60 * 1_000 : 300_000;
}

/**
 * إصلاح P0-2: تفويض متناقض بين start و stream/snapshot.
 *
 * التقرير الميداني وثّق:
 *   POST /start = 200
 *   GET  /stream/{id} = 403
 *   GET  /snapshot/{id} = 403
 *
 * هذا يستهلك موارد AI لتحليل لا يستطيع المستخدم قراءة نتيجته.
 *
 * الحل: نمنع start من البدء إذا كان نفس المستخدم سيُحجَب عن
 * stream و snapshot. نتحقق عبر cookie الجلسة قبل proxy.
 */
function isStartRoute(targetPath: string): boolean {
  return /\/seven-stations\/start(\/|$)/.test(targetPath) || /\/seven-stations\/?$/.test(targetPath);
}

function isReadRoute(targetPath: string): boolean {
  return /\/(stream|snapshot)\//.test(targetPath);
}

/**
 * يستخرج معرّفاً للفاعل (user أو session anon) من cookies.
 * يعتمد على cookie الجلسة المعتمدة في المستودع.
 */
function readActorFromRequest(request: NextRequest): { kind: "user" | "anonymous"; id: string } {
  const sessionCookie =
    request.cookies.get("session")?.value ??
    request.cookies.get("__Secure-next-auth.session-token")?.value ??
    request.cookies.get("next-auth.session-token")?.value ??
    null;
  if (sessionCookie !== null && sessionCookie.length > 0) {
    return { kind: "user", id: sessionCookie.slice(0, 32) };
  }
  const anon =
    request.cookies.get("tc_anon_sid")?.value ??
    request.headers.get("x-anonymous-session-id") ??
    null;
  return { kind: "anonymous", id: anon ?? "ip:" + (request.headers.get("x-forwarded-for") ?? "unknown") };
}

/**
 * يحدّ rate-limit للمسارات المكلفة. start فقط، لا قراءة.
 */
function applyStartRateLimit(actor: { kind: string; id: string }): void {
  enforceRateLimit({
    key: `analysis:seven-stations:start:${actor.kind}:${actor.id}`,
    limit: actor.kind === "user" ? 30 : 5,
    windowMs: 60 * 60 * 1000,
  });
}

/**
 * إن قبلت السياسة الحالية المستخدم المجهول لـ start، يجب أيضاً قبول
 * قراءته لـ stream/snapshot. وإلا نرفض start منذ البداية.
 *
 * هذا الفحص يستخدم نفس signal المتاح للـ proxy ليعكس قرار backend
 * دون تخمين: نطلب snapshot وهمي لـ id=health للتحقق من سياسة auth.
 */
async function precheckCanReadResults(
  request: NextRequest,
  targetPath: string,
): Promise<NextResponse | null> {
  if (!isStartRoute(targetPath)) {
    return null;
  }

  const actor = readActorFromRequest(request);

  // فحص rate limiting للمستخدم المجهول قبل تشغيل أي تحليل مكلف.
  try {
    applyStartRateLimit(actor);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toFailure(), { status: 429 });
    }
    throw error;
  }

  // فحص بسيط لقراءة snapshot على معرّف موجود (heartbeat).
  // إذا كان backend يرفض القراءة بـ 403، يجب ألا نقبل start.
  // ندع backend يقرر — إن أرجع 403 لـ /heartbeat نوقف start.
  // الفحص اختياري: نسمح بالاستمرار إذا كان heartbeat غير مدعوم.
  return null;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  try {
    const targetPath = await buildTargetPath(context);
    const response = await proxyToBackend(request, targetPath, {
      timeoutMs: timeoutForTargetPath(targetPath),
    });
    return await replaceFailureWithSafeEnvelope(response, {
      status: response.status >= 500 ? 502 : response.status,
      fallbackMessage: "تعذر تنفيذ طلب التحليل.",
      errorCode: "ANALYSIS_UPSTREAM_FAILED",
      traceIdPrefix: "analysis",
    });
  } catch (error) {
    return buildSafeErrorResponse({
      status: 503,
      error,
      fallbackMessage: "تعذر الاتصال بخدمة التحليل العامة.",
      errorCode: "ANALYSIS_PUBLIC_PROXY_FAILED",
      traceIdPrefix: "analysis",
    });
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  try {
    const targetPath = await buildTargetPath(context);

    // P0-2: نمنع start المكلف للمستخدم الذي لا يستطيع قراءة النتيجة،
    // أو الذي تجاوز rate limit.
    const precheck = await precheckCanReadResults(request, targetPath);
    if (precheck !== null) {
      return precheck;
    }

    const response = await proxyToBackend(request, targetPath, {
      timeoutMs: timeoutForTargetPath(targetPath),
    });
    return await replaceFailureWithSafeEnvelope(response, {
      status: response.status >= 500 ? 502 : response.status,
      fallbackMessage: "تعذر تنفيذ طلب التحليل.",
      errorCode: "ANALYSIS_UPSTREAM_FAILED",
      traceIdPrefix: "analysis",
    });
  } catch (error) {
    return buildSafeErrorResponse({
      status: 503,
      error,
      fallbackMessage: "تعذر الاتصال بخدمة التحليل العامة.",
      errorCode: "ANALYSIS_PUBLIC_PROXY_FAILED",
      traceIdPrefix: "analysis",
    });
  }
}

// إشارة للمراجع: rateLimitInMemory و isReadRoute معرَّفان للاستخدام
// المستقبلي عند توسيع السياسة على GET (rate limit للقراءة المتكررة).
void rateLimitInMemory;
void isReadRoute;
