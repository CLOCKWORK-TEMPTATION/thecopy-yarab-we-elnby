// ============================================================================
// طبقة معالجة الأخطاء الموحدة
// ============================================================================
// تمنع الفشل الصامت وتُلزم كل تدفق بحالة loading/error واضحة.
// تصدّر useAsyncOperation الذي هو نواة المنع.

import { useCallback, useRef, useState } from "react";

import {
  ApiError,
  defaultArabicMessage,
  isApiError,
  type ApiErrorCode,
} from "@the-copy/api-client";

/**
 * حالة عملية async.
 */
export type AsyncState<TResult> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: TResult }
  | {
      status: "error";
      error: {
        code: ApiErrorCode;
        message: string;
        requestId: string | undefined;
        retriable: boolean;
      };
    };

/**
 * أكواد قابلة لإعادة المحاولة.
 */
const RETRIABLE_CODES: ReadonlySet<ApiErrorCode> = new Set<ApiErrorCode>([
  "timeout",
  "network_error",
  "server_error",
]);

/**
 * يحوّل أي خطأ إلى شكل قابل للعرض في الواجهة.
 * يضمن وجود code ورسالة عربية ولا يكشف stack.
 */
export function normalizeError(error: unknown): {
  code: ApiErrorCode;
  message: string;
  requestId: string | undefined;
  retriable: boolean;
} {
  if (isApiError(error)) {
    return {
      code: error.code,
      message: error.message,
      requestId: error.requestId,
      retriable: RETRIABLE_CODES.has(error.code),
    };
  }
  return {
    code: "unknown_error",
    message: defaultArabicMessage("unknown_error"),
    requestId: undefined,
    retriable: false,
  };
}

/**
 * Hook يدير حالة async مع منع الفشل الصامت ومنع double-submit.
 *
 * استخدامه يضمن:
 * - الزر يدخل loading عند البدء.
 * - عند النجاح يخرج إلى success أو يعود إلى idle حسب الإعدادات.
 * - عند الفشل يدخل error مع رسالة عربية، ولا يبقى عالقاً في loading.
 * - الضغط المتكرر أثناء loading يُتجاهل (منع double-submit).
 * - cancel يلغي الطلب الحالي عبر AbortController.
 */
export function useAsyncOperation<TArgs extends readonly unknown[], TResult>(
  operation: (signal: AbortSignal, ...args: TArgs) => Promise<TResult>,
  options: {
    /** إذا true يبقى في success بعد الانتهاء؛ وإلا يعود إلى idle. الافتراضي true. */
    keepSuccess?: boolean;
    /** يُستدعى بعد النجاح. */
    onSuccess?: (data: TResult) => void;
    /** يُستدعى بعد الفشل. */
    onError?: (error: ReturnType<typeof normalizeError>) => void;
  } = {},
): {
  state: AsyncState<TResult>;
  isLoading: boolean;
  run: (...args: TArgs) => Promise<TResult | undefined>;
  reset: () => void;
  cancel: () => void;
} {
  const [state, setState] = useState<AsyncState<TResult>>({ status: "idle" });
  const inflightRef = useRef<AbortController | null>(null);
  const keepSuccess = options.keepSuccess ?? true;

  const cancel = useCallback((): void => {
    inflightRef.current?.abort();
    inflightRef.current = null;
  }, []);

  const reset = useCallback((): void => {
    cancel();
    setState({ status: "idle" });
  }, [cancel]);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      // منع double-submit: إذا في loading نعيد undefined.
      if (inflightRef.current !== null) {
        return undefined;
      }

      const controller = new AbortController();
      inflightRef.current = controller;
      setState({ status: "loading" });

      try {
        const data = await operation(controller.signal, ...args);
        if (controller.signal.aborted) {
          return undefined;
        }
        if (keepSuccess) {
          setState({ status: "success", data });
        } else {
          setState({ status: "idle" });
        }
        options.onSuccess?.(data);
        return data;
      } catch (error) {
        if (controller.signal.aborted) {
          return undefined;
        }
        const normalized = normalizeError(error);
        setState({ status: "error", error: normalized });
        options.onError?.(normalized);
        return undefined;
      } finally {
        if (inflightRef.current === controller) {
          inflightRef.current = null;
        }
      }
    },
    [operation, keepSuccess, options],
  );

  return {
    state,
    isLoading: state.status === "loading",
    run,
    reset,
    cancel,
  };
}

/**
 * يبني requestId في الواجهة لربط فشل المستخدم بسجل الخادم.
 */
export function formatErrorForUser(error: ReturnType<typeof normalizeError>): {
  title: string;
  message: string;
  hint: string | undefined;
} {
  const title = (() => {
    switch (error.code) {
      case "auth_required":
        return "تسجيل الدخول مطلوب";
      case "forbidden":
        return "غير مصرّح";
      case "validation_error":
        return "مدخلات غير صالحة";
      case "timeout":
        return "انتهت المهلة";
      case "network_error":
        return "تعذّر الاتصال";
      case "server_error":
        return "خطأ في الخادم";
      case "quota_exceeded":
        return "تجاوز حد الاستخدام";
      case "model_empty":
        return "لا توجد نتيجة";
      case "not_found":
        return "غير موجود";
      default:
        return "خطأ غير متوقع";
    }
  })();

  const hint =
    error.requestId !== undefined && error.requestId.length > 0
      ? `رقم الطلب: ${error.requestId}`
      : undefined;

  return { title, message: error.message, hint };
}

export { ApiError };
