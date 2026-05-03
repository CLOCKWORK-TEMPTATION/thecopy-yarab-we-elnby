// ============================================================================
// خطأ الـ API الموحد
// ============================================================================
// يحوّل أي فشل (شبكة، مهلة، 4xx، 5xx) إلى ApiError مع code مصنّف.

import type { ApiErrorCode, ApiFailure } from "./types.js";

/**
 * استثناء موحد يُرفع من apiFetch عند الفشل.
 * يحمل code مصنّف ورسالة عربية وحالة HTTP إن توفرت.
 */
export class ApiError extends Error {
  public override readonly name = "ApiError";
  public readonly code: ApiErrorCode;
  public readonly status: number | undefined;
  public readonly requestId: string | undefined;
  public readonly details: unknown;

  public constructor(input: {
    code: ApiErrorCode;
    message: string;
    status?: number;
    requestId?: string;
    details?: unknown;
    cause?: unknown;
  }) {
    super(input.message, input.cause !== undefined ? { cause: input.cause } : undefined);
    this.code = input.code;
    this.status = input.status;
    this.requestId = input.requestId;
    this.details = input.details;
  }

  /**
   * يحوّل الخطأ إلى شكل ApiFailure قابل للإرجاع من API route.
   */
  public toFailure(): ApiFailure {
    return {
      ok: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.requestId !== undefined ? { requestId: this.requestId } : {}),
      },
    };
  }
}

/**
 * يُحدد ما إذا كان الخطأ من نوع ApiError.
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * يُحدد ما إذا كان الخطأ ناتجاً عن AbortController.
 */
export function isAbortError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const named = error as { name?: unknown };
  return named.name === "AbortError";
}

/**
 * يُحوّل HTTP status إلى ApiErrorCode مصنّف.
 * هذا الـ mapping متعمّد: 401 لا يمر كـ unknown_error.
 */
export function statusToErrorCode(status: number): ApiErrorCode {
  if (status === 401) {
    return "auth_required";
  }
  if (status === 403) {
    return "forbidden";
  }
  if (status === 404) {
    return "not_found";
  }
  if (status === 409) {
    return "conflict";
  }
  if (status === 422) {
    return "validation_error";
  }
  if (status === 429) {
    return "quota_exceeded";
  }
  if (status >= 500) {
    return "server_error";
  }
  return "unknown_error";
}

/**
 * رسالة عربية افتراضية لكل code.
 * يجوز للـ caller استبدالها برسالة سياقية، لكن يجب ألا تُترك فارغة.
 */
export function defaultArabicMessage(code: ApiErrorCode): string {
  switch (code) {
    case "auth_required":
      return "يلزم تسجيل الدخول لاستكمال هذا الإجراء.";
    case "forbidden":
      return "لا تملك صلاحية تنفيذ هذا الإجراء.";
    case "validation_error":
      return "المدخلات غير صالحة. يرجى مراجعتها.";
    case "not_found":
      return "العنصر المطلوب غير موجود.";
    case "conflict":
      return "تعارض في حالة النظام. يرجى تحديث الصفحة والمحاولة مجدداً.";
    case "timeout":
      return "انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.";
    case "network_error":
      return "تعذّر الاتصال بالخادم. تأكد من اتصالك بالشبكة.";
    case "server_error":
      return "حدث خطأ في الخادم. تم تسجيله ويمكنك المحاولة لاحقاً.";
    case "quota_exceeded":
      return "تجاوزت حد الاستخدام المسموح. يرجى المحاولة لاحقاً.";
    case "model_empty":
      return "لم يرجع النموذج نتيجة قابلة للاستخدام.";
    case "unknown_error":
    default:
      return "حدث خطأ غير متوقع.";
  }
}
