/**
 * useApi - Hook مخصص لإدارة استدعاءات API
 *
 * @description يوفر هذا الـ Hook واجهة موحدة وآمنة لإجراء استدعاءات API
 * مع معالجة الأخطاء وحالات التحميل والتحقق من البيانات
 */

"use client";

import { useState, useCallback } from "react";
import { z } from "zod";
import type { ApiResponse } from "../types";

/**
 * واجهة حالة الـ Hook
 */
interface UseApiState<T> {
  /** البيانات المسترجعة */
  data: T | null;
  /** حالة التحميل */
  loading: boolean;
  /** رسالة الخطأ إن وجدت */
  error: string | null;
}

/**
 * واجهة خيارات استدعاء API
 */
interface ApiCallOptions<TInput, TOutput> {
  /** نقطة النهاية (Endpoint) */
  endpoint: string;
  /** البيانات المرسلة */
  payload?: TInput;
  /** مخطط Zod للتحقق من الاستجابة (اختياري) */
  responseSchema?: z.ZodType<TOutput>;
}

/**
 * واجهة قيمة الإرجاع من الـ Hook
 */
interface UseApiReturn<T> extends UseApiState<T> {
  /** دالة لتنفيذ الاستدعاء */
  execute: <TInput, TOutput>(
    options: ApiCallOptions<TInput, TOutput>
  ) => Promise<TOutput | null>;
  /** دالة لمسح الحالة */
  reset: () => void;
}

/**
 * Hook لإدارة استدعاءات API
 *
 * @example
 * ```tsx
 * const { data, loading, error, execute } = useApi<PluginOutput>();
 *
 * const handleExecute = async () => {
 *   const result = await execute({
 *     endpoint: '/api/plugins/execute',
 *     payload: { pluginId: 'visual-analyzer', data: {} },
 *     responseSchema: PluginOutputSchema,
 *   });
 *
 *   if (result) {
 *     console.log('نجاح:', result);
 *   }
 * };
 * ```
 */
export function useApi<T = unknown>(): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  /**
   * تنفيذ استدعاء API مع معالجة الأخطاء
   */
  const execute = useCallback(
    async <TInput, TOutput>(
      options: ApiCallOptions<TInput, TOutput>
    ): Promise<TOutput | null> => {
      const { endpoint, payload, responseSchema } = options;

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
        });

        const rawData: unknown = await response.json();

        // التحقق من صحة الاستجابة باستخدام Zod إذا تم توفير المخطط
        if (responseSchema) {
          const validationResult = responseSchema.safeParse(rawData);

          if (!validationResult.success) {
            const errorMessage = validationResult.error.errors
              .map((e) => e.message)
              .join(", ");
            throw new Error(`خطأ في التحقق من البيانات: ${errorMessage}`);
          }

          setState({
            data: validationResult.data as unknown as T,
            loading: false,
            error: null,
          });

          return validationResult.data;
        }

        // إذا لم يتم توفير مخطط، نستخدم البيانات الخام
        const apiResponse = rawData as ApiResponse<TOutput>;

        if (!response.ok || apiResponse.success === false) {
          throw new Error(
            apiResponse.error || `فشل الاستدعاء: ${response.status}`
          );
        }

        setState({
          data: apiResponse.data as unknown as T,
          loading: false,
          error: null,
        });

        return apiResponse.data ?? null;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "حدث خطأ غير متوقع";

        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));

        return null;
      }
    },
    []
  );

  /**
   * مسح حالة الـ Hook
   */
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Hook مبسط لتنفيذ استدعاء API واحد
 *
 * @param endpoint - نقطة النهاية
 * @returns دالة التنفيذ والحالة
 */
export function useApiCall<TInput, TOutput>(
  endpoint: string,
  responseSchema?: z.ZodType<TOutput>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TOutput | null>(null);

  const execute = useCallback(
    async (payload?: TInput): Promise<TOutput | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
        });

        const rawData: unknown = await response.json();

        if (responseSchema) {
          const validationResult = responseSchema.safeParse(rawData);

          if (!validationResult.success) {
            throw new Error("خطأ في التحقق من البيانات");
          }

          setData(validationResult.data);
          setLoading(false);
          return validationResult.data;
        }

        const apiResponse = rawData as ApiResponse<TOutput>;

        if (!response.ok || apiResponse.success === false) {
          throw new Error(apiResponse.error || "فشل الاستدعاء");
        }

        setData(apiResponse.data ?? null);
        setLoading(false);
        return apiResponse.data ?? null;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "حدث خطأ غير متوقع";
        setError(errorMessage);
        setLoading(false);
        return null;
      }
    },
    [endpoint, responseSchema]
  );

  return { execute, loading, error, data };
}

export default useApi;
