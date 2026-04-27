/**
 * usePlugins - Hook مخصص لإدارة الإضافات
 *
 * @description يوفر هذا الـ Hook واجهة موحدة لجلب وإدارة الإضافات من API
 * يتضمن معالجة الأخطاء وحالات التحميل والبيانات الافتراضية
 */

"use client";

import { useState, useEffect, useCallback } from "react";

import { fetchArtDirectorJson } from "../lib/api-client";
import { PluginInfo, PluginsApiResponseSchema } from "../types";

/**
 * واجهة حالة الـ Hook
 */
interface UsePluginsState {
  /** قائمة الإضافات */
  plugins: PluginInfo[];
  /** حالة التحميل */
  loading: boolean;
  /** رسالة الخطأ إن وجدت */
  error: string | null;
}

/**
 * واجهة قيمة الإرجاع من الـ Hook
 */
interface UsePluginsReturn extends UsePluginsState {
  /** دالة لإعادة جلب الإضافات */
  refetch: () => Promise<void>;
}

/**
 * Hook لجلب وإدارة الإضافات
 *
 * @example
 * ```tsx
 * const { plugins, loading, error, refetch } = usePlugins();
 *
 * if (loading) return <Spinner />;
 * if (error) return <ErrorMessage message={error} />;
 *
 * return plugins.map(plugin => <PluginCard key={plugin.id} {...plugin} />);
 * ```
 */
export function usePlugins(): UsePluginsReturn {
  const [state, setState] = useState<UsePluginsState>({
    plugins: [],
    loading: true,
    error: null,
  });

  /**
   * جلب الإضافات من API مع معالجة الأخطاء والتحقق من البيانات
   */
  const fetchPlugins = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const rawData = await fetchArtDirectorJson<unknown>("/plugins");

      // التحقق من صحة البيانات باستخدام Zod
      const validationResult = PluginsApiResponseSchema.safeParse(rawData);

      if (!validationResult.success) {
        setState({
          plugins: [],
          loading: false,
          error: "استجابة الخادم لقائمة الأدوات لا تطابق البنية المتوقعة",
        });
        return;
      }

      const { plugins } = validationResult.data;

      setState({
        plugins: plugins ?? [],
        loading: false,
        error: null,
      });
    } catch (err) {
      setState({
        plugins: [],
        loading: false,
        error:
          err instanceof Error ? err.message : "تعذر تحميل الأدوات من الخادم",
      });
    }
  }, []);

  useEffect(() => {
    setTimeout(() => {}, 0);
  }, [fetchPlugins]);

  return {
    ...state,
    refetch: fetchPlugins,
  };
}

export default usePlugins;
