/**
 * usePlugins - Hook مخصص لإدارة الإضافات
 *
 * @description يوفر هذا الـ Hook واجهة موحدة لجلب وإدارة الإضافات من API
 * يتضمن معالجة الأخطاء وحالات التحميل والبيانات الافتراضية
 */

"use client";

import { useState, useEffect, useCallback } from "react";

import { toolConfigs, type ToolId } from "../core/toolConfigs";
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

const LOCAL_PLUGIN_META: Record<ToolId, Pick<PluginInfo, "name" | "nameAr">> = {
  "visual-analyzer": {
    name: "Visual Consistency Analyzer",
    nameAr: "محلل الاتساق البصري الذكي",
  },
  "terminology-translator": {
    name: "Cinema Terminology Translator",
    nameAr: "مترجم المصطلحات السينمائية متعدد اللغات",
  },
  "budget-optimizer": {
    name: "Budget Optimizer",
    nameAr: "محسّن الموارد والميزانية الذكي",
  },
  "lighting-simulator": {
    name: "Lighting Simulator",
    nameAr: "محاكي الإضاءة الذكي",
  },
  "risk-analyzer": {
    name: "Risk Analyzer",
    nameAr: "محلل المخاطر الذكي",
  },
  "production-readiness-report": {
    name: "Production Readiness Report",
    nameAr: "منشئ تقرير جاهزية الإنتاج",
  },
  "creative-inspiration": {
    name: "Creative Inspiration Assistant",
    nameAr: "المساعد الإبداعي للإلهام البصري",
  },
  "location-coordinator": {
    name: "Location Coordinator",
    nameAr: "منسّق المواقع والديكورات الذكي",
  },
  "set-reusability": {
    name: "Set Reusability Optimizer",
    nameAr: "محسّن إعادة استخدام الديكورات",
  },
  "productivity-analyzer": {
    name: "Productivity Analyzer",
    nameAr: "محلل الأداء والإنتاجية",
  },
  "documentation-generator": {
    name: "Documentation Generator",
    nameAr: "مولد التوثيق التلقائي",
  },
  "mr-previz-studio": {
    name: "Mixed Reality Previz Studio",
    nameAr: "استوديو التصور المسبق بالواقع المختلط",
  },
  "virtual-set-editor": {
    name: "Virtual Set Editor",
    nameAr: "محرر الديكورات الافتراضي في الموقع",
  },
  "cinema-skills-trainer": {
    name: "Cinema Skills Trainer",
    nameAr: "المدرب الافتراضي للمهارات السينمائية",
  },
  "immersive-concept-art": {
    name: "Immersive Concept Art Studio",
    nameAr: "استوديو الفن المفاهيمي الغامر",
  },
  "virtual-production-engine": {
    name: "Virtual Production Engine",
    nameAr: "محرك الإنتاج الافتراضي والتصور المسبق",
  },
};

const LOCAL_PLUGINS: PluginInfo[] = Object.keys(toolConfigs).map((toolId) => {
  const id = toolId as ToolId;
  const meta = LOCAL_PLUGIN_META[id] ?? {
    name: id,
    nameAr: id,
  };

  return {
    id,
    name: meta.name,
    nameAr: meta.nameAr,
    category: "ai-analytics",
  };
});

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
          plugins: LOCAL_PLUGINS,
          loading: false,
          error:
            "استجابة الخادم لقائمة الأدوات غير صالحة، تم تشغيل الكتالوج المحلي",
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
        plugins: LOCAL_PLUGINS,
        loading: false,
        error:
          err instanceof Error
            ? `${err.message} تم تشغيل الكتالوج المحلي.`
            : "تعذر تحميل الأدوات من الخادم، تم تشغيل الكتالوج المحلي.",
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) {
        void fetchPlugins();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fetchPlugins]);

  return {
    ...state,
    refetch: fetchPlugins,
  };
}

export default usePlugins;
