import { NextRequest, NextResponse } from "next/server";

import { ApiError } from "@the-copy/api-client";
import {
  ANONYMOUS_SESSION_COOKIE,
  enforceRateLimit,
  generateAnonymousSessionId,
} from "@the-copy/security-middleware";

import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getTargetPath(path: string[]): string {
  return `/api/art-director/${path.join("/")}`;
}

/**
 * إصلاح P0-6: عزل بيانات art-director.
 *
 * التقرير الميداني وثّق:
 *   - إضافة موقع من مجهول تظهر في القائمة العامة لمستخدم آخر.
 *   - قاعدة الإنتاج ملوّثة بـ "قصر الاختبار {timestamp}".
 *
 * حلول هذه الطبقة (proxy في Next.js):
 *   1. كل طلب مجهول يحصل على tc_anon_sid ثابت في cookie.
 *   2. نمرّر anonymousSessionId كـ header إلى backend ليفلتر به.
 *   3. rate limit للكتابات (POST /locations/add, /assets/upload).
 *   4. backend مسؤول عن WHERE clause في DB؛ هذه الطبقة تضمن
 *      وصول معرّف الجلسة بأمان.
 */
function readUserIdFromCookies(request: NextRequest): string | null {
  // اعتماداً على cookie الجلسة الموجودة في المستودع (NextAuth).
  const sessionToken =
    request.cookies.get("__Secure-next-auth.session-token")?.value ??
    request.cookies.get("next-auth.session-token")?.value ??
    null;
  if (typeof sessionToken === "string" && sessionToken.length > 0) {
    // لا نفكّ التوكن هنا — نمرّره فقط إشارةً إلى backend.
    // backend هو من يفك ويعرف user_id الحقيقي.
    return sessionToken.slice(0, 64);
  }
  return null;
}

function readOrCreateAnonymousSessionId(request: NextRequest): {
  id: string;
  isNew: boolean;
} {
  const existing = request.cookies.get(ANONYMOUS_SESSION_COOKIE)?.value;
  if (typeof existing === "string" && existing.length >= 16) {
    return { id: existing, isNew: false };
  }
  return { id: generateAnonymousSessionId(), isNew: true };
}

function isWriteAction(method: string, path: string[]): boolean {
  if (method !== "POST" && method !== "PUT" && method !== "PATCH" && method !== "DELETE") {
    return false;
  }
  const joined = path.join("/").toLowerCase();
  return (
    joined.includes("locations/add") ||
    joined.includes("assets") ||
    joined.includes("upload") ||
    joined.includes("create")
  );
}

async function respond(
  request: NextRequest,
  path: string[]
): Promise<NextResponse> {
  try {
    const userId = readUserIdFromCookies(request);
    const anon = userId === null ? readOrCreateAnonymousSessionId(request) : null;

    // ─── rate limit للكتابات للمجهول قبل proxy ───────────────────────
    if (isWriteAction(request.method, path)) {
      const actorId = userId ?? anon?.id ?? "unknown";
      try {
        enforceRateLimit({
          key: `art-director:write:${userId !== null ? "user" : "anon"}:${actorId}`,
          limit: userId !== null ? 60 : 10,
          windowMs: 60 * 60 * 1000,
        });
      } catch (error) {
        if (error instanceof ApiError) {
          return NextResponse.json(error.toFailure(), { status: 429 });
        }
        throw error;
      }
    }

    // ─── حقن actor headers قبل proxy ──────────────────────────────────
    const augmentedHeaders = new Headers(request.headers);
    if (userId !== null) {
      augmentedHeaders.set("x-actor-kind", "user");
    } else if (anon !== null) {
      augmentedHeaders.set("x-actor-kind", "anonymous");
      augmentedHeaders.set("x-anonymous-session-id", anon.id);
    }

    // نُعيد بناء request بـ headers جديدة لأن NextRequest غير قابل للتعديل.
    const augmentedRequest = new NextRequest(request.url, {
      method: request.method,
      headers: augmentedHeaders,
      body: request.body,
      // @ts-expect-error -- duplex مطلوب لـ ReadableStream في Node 18+.
      duplex: "half",
    });

    const response = await proxyToBackend(augmentedRequest, getTargetPath(path));

    // ─── ضبط cookie للمجهول الجديد ───────────────────────────────────
    if (anon !== null && anon.isNew) {
      response.cookies.set(ANONYMOUS_SESSION_COOKIE, anon.id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env["NODE_ENV"] === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 يوماً
      });
    }
    return response;
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر الاتصال بخدمة art-director");
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return respond(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return respond(request, path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return respond(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return respond(request, path);
}
