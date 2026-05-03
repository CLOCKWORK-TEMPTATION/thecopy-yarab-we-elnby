// ============================================================================
// مساعدات الخادم لإصدار استجابات ApiResponse الموحدة
// ============================================================================
// تستخدم في route handlers (Next.js) لضمان أن كل endpoint يرجّع
// شكلاً واحداً، وأن الفشل لا يتسرب كـ 500 خام مع stack trace.

import { ApiError, defaultArabicMessage } from "./errors.js";
import type { ApiErrorCode, ApiFailure, ApiMeta, ApiSuccess } from "./types.js";

/**
 * يولّد requestId قصير وعشوائي ومناسب للسجلات.
 */
export function generateRequestId(): string {
  // crypto.randomUUID متاح في Node 19+ وفي edge runtime.
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  // fallback مقبول وليس أمنياً.
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * يبني ApiSuccess<TData> مع meta متسقة.
 */
export function apiSuccess<TData>(
  data: TData,
  meta: Partial<ApiMeta> & { startedAt?: number } = {},
): ApiSuccess<TData> {
  const requestId = meta.requestId ?? generateRequestId();
  const durationMs =
    meta.durationMs ?? (meta.startedAt !== undefined ? Date.now() - meta.startedAt : 0);
  return {
    ok: true,
    data,
    meta: {
      requestId,
      durationMs,
      ...(meta.version !== undefined ? { version: meta.version } : {}),
    },
  };
}

/**
 * يبني ApiFailure مع code مصنّف ورسالة عربية.
 */
export function apiFailure(input: {
  code: ApiErrorCode;
  message?: string;
  requestId?: string;
}): ApiFailure {
  return {
    ok: false,
    error: {
      code: input.code,
      message: input.message ?? defaultArabicMessage(input.code),
      ...(input.requestId !== undefined ? { requestId: input.requestId } : {}),
    },
  };
}

/**
 * يحوّل أي خطأ مرفوع داخل route handler إلى ApiFailure.
 * لا يكشف stack trace للمستخدم؛ يسجّله في console للسجل فقط.
 */
export function errorToFailure(error: unknown, requestId?: string): ApiFailure {
  if (error instanceof ApiError) {
    return {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        requestId: error.requestId ?? requestId ?? generateRequestId(),
      },
    };
  }
  // خطأ غير متوقع: نسجّله ولا نكشفه.
  // eslint-disable-next-line no-console
  console.error("[api-client] unexpected server error", { requestId, error });
  return {
    ok: false,
    error: {
      code: "server_error",
      message: defaultArabicMessage("server_error"),
      requestId: requestId ?? generateRequestId(),
    },
  };
}

/**
 * يربط HTTP status بـ code.
 */
export function statusForCode(code: ApiErrorCode): number {
  switch (code) {
    case "auth_required":
      return 401;
    case "forbidden":
      return 403;
    case "validation_error":
      return 422;
    case "not_found":
      return 404;
    case "conflict":
      return 409;
    case "quota_exceeded":
      return 429;
    case "model_empty":
      return 502;
    case "timeout":
      return 504;
    case "network_error":
    case "server_error":
    case "unknown_error":
    default:
      return 500;
  }
}
