// ============================================================================
// عميل الـ API الموحد
// ============================================================================
// يدعم timeout، retry محدود على أخطاء الشبكة، AbortController،
// واستخراج structured error من استجابة الخادم.
// ممنوع منعاً باتاً ابتلاع الفشل أو ترك زر loading عالقاً.

import {
  ApiError,
  defaultArabicMessage,
  isAbortError,
  statusToErrorCode,
} from "./errors.js";
import type { ApiRequestOptions, ApiResponse } from "./types.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_DELAY_MS = 500;

/**
 * ينام عدد ميلي ثانية محدد.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * يُنشئ AbortController يجمع بين signal خارجي ومهلة داخلية.
 */
function createCombinedController(
  externalSignal: AbortSignal | undefined,
  timeoutMs: number,
): { controller: AbortController; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException("Timeout", "AbortError"));
  }, timeoutMs);

  const onExternalAbort = (): void => {
    controller.abort(externalSignal?.reason);
  };

  if (externalSignal !== undefined) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener("abort", onExternalAbort, { once: true });
    }
  }

  const cleanup = (): void => {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  };

  return { controller, cleanup };
}

/**
 * يحاول استخراج رسالة وcode من جسم الاستجابة الفاشلة.
 */
async function extractFailureFromResponse(response: Response): Promise<{
  code: ReturnType<typeof statusToErrorCode>;
  message: string;
  requestId: string | undefined;
  details: unknown;
}> {
  const fallbackCode = statusToErrorCode(response.status);
  const requestId = response.headers.get("x-request-id") ?? undefined;

  try {
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return {
        code: fallbackCode,
        message: defaultArabicMessage(fallbackCode),
        requestId,
        details: undefined,
      };
    }

    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "ok" in body &&
      (body as { ok: unknown }).ok === false &&
      "error" in body
    ) {
      const errorObj = (body as { error: unknown }).error;
      if (typeof errorObj === "object" && errorObj !== null) {
        const code =
          "code" in errorObj && typeof (errorObj as { code: unknown }).code === "string"
            ? ((errorObj as { code: string }).code as ReturnType<typeof statusToErrorCode>)
            : fallbackCode;
        const message =
          "message" in errorObj &&
          typeof (errorObj as { message: unknown }).message === "string"
            ? (errorObj as { message: string }).message
            : defaultArabicMessage(code);
        const bodyRequestId =
          "requestId" in errorObj &&
          typeof (errorObj as { requestId: unknown }).requestId === "string"
            ? (errorObj as { requestId: string }).requestId
            : requestId;
        return {
          code,
          message,
          requestId: bodyRequestId,
          details: "details" in errorObj ? (errorObj as { details: unknown }).details : undefined,
        };
      }
    }
    return {
      code: fallbackCode,
      message: defaultArabicMessage(fallbackCode),
      requestId,
      details: body,
    };
  } catch {
    return {
      code: fallbackCode,
      message: defaultArabicMessage(fallbackCode),
      requestId,
      details: undefined,
    };
  }
}

/**
 * نقطة الدخول الموحّدة لكل طلب HTTP.
 * يرفع ApiError دائماً عند الفشل، ولا يرجع undefined أو null كنجاح.
 */
export async function apiFetch<TData>(
  input: string | URL,
  init: RequestInit = {},
  options: ApiRequestOptions = {},
): Promise<ApiResponse<TData>> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetry = Math.max(0, options.retry ?? 0);
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetry) {
    const { controller, cleanup } = createCombinedController(options.signal, timeoutMs);
    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
        credentials: options.credentials ?? init.credentials ?? "include",
        headers: {
          accept: "application/json",
          ...(init.body !== undefined && init.body !== null
            ? { "content-type": "application/json" }
            : {}),
          ...(init.headers ?? {}),
          ...(options.headers ?? {}),
        },
      });

      if (!response.ok) {
        const failure = await extractFailureFromResponse(response);
        throw new ApiError({
          code: failure.code,
          message: failure.message,
          status: response.status,
          ...(failure.requestId !== undefined ? { requestId: failure.requestId } : {}),
          details: failure.details,
        });
      }

      const text = await response.text();
      // استجابة فارغة تُعتبر model_empty لأن النجاح يتطلب data واضحة.
      if (text.trim().length === 0) {
        throw new ApiError({
          code: "model_empty",
          message: defaultArabicMessage("model_empty"),
          status: response.status,
          ...(response.headers.get("x-request-id") !== null
            ? { requestId: response.headers.get("x-request-id") as string }
            : {}),
        });
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch (parseError) {
        throw new ApiError({
          code: "server_error",
          message: "تعذّر قراءة استجابة الخادم.",
          status: response.status,
          cause: parseError,
        });
      }

      // تحقّق من شكل ApiResponse الموحد.
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "ok" in parsed &&
        typeof (parsed as { ok: unknown }).ok === "boolean"
      ) {
        return parsed as ApiResponse<TData>;
      }

      // استجابة قديمة لا تتبع العقد الموحد — نلفّها بـ ApiSuccess.
      return {
        ok: true,
        data: parsed as TData,
        meta: {
          requestId: response.headers.get("x-request-id") ?? "",
          durationMs: 0,
        },
      };
    } catch (error) {
      cleanup();

      // مهلة من DOMException → timeout مصنّف.
      if (isAbortError(error)) {
        // إذا أُلغي الطلب من signal خارجي، لا نعيد المحاولة.
        if (options.signal?.aborted === true) {
          throw new ApiError({
            code: "timeout",
            message: "تم إلغاء الطلب.",
            cause: error,
          });
        }
        lastError = new ApiError({
          code: "timeout",
          message: defaultArabicMessage("timeout"),
          cause: error,
        });
      } else if (error instanceof ApiError) {
        // أخطاء HTTP الواضحة لا نعيد المحاولة عليها — فقط أخطاء الشبكة.
        if (
          error.code === "network_error" ||
          error.code === "timeout" ||
          error.code === "server_error"
        ) {
          lastError = error;
        } else {
          throw error;
        }
      } else {
        lastError = new ApiError({
          code: "network_error",
          message: defaultArabicMessage("network_error"),
          cause: error,
        });
      }

      attempt += 1;
      if (attempt > maxRetry) {
        break;
      }
      await sleep(retryDelayMs * attempt);
      continue;
    } finally {
      cleanup();
    }
  }

  if (lastError instanceof ApiError) {
    throw lastError;
  }
  throw new ApiError({
    code: "unknown_error",
    message: defaultArabicMessage("unknown_error"),
    cause: lastError,
  });
}

/**
 * مساعدات اختصارية للأفعال الشائعة.
 */
export const api = {
  get<TData>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<TData>> {
    return apiFetch<TData>(url, { method: "GET" }, options);
  },
  post<TData>(
    url: string,
    body: unknown,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<TData>> {
    return apiFetch<TData>(url, { method: "POST", body: JSON.stringify(body) }, options);
  },
  put<TData>(
    url: string,
    body: unknown,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<TData>> {
    return apiFetch<TData>(url, { method: "PUT", body: JSON.stringify(body) }, options);
  },
  patch<TData>(
    url: string,
    body: unknown,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<TData>> {
    return apiFetch<TData>(url, { method: "PATCH", body: JSON.stringify(body) }, options);
  },
  delete<TData>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<TData>> {
    return apiFetch<TData>(url, { method: "DELETE" }, options);
  },
};
