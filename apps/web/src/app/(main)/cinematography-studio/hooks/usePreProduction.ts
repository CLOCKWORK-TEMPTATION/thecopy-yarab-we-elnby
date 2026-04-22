/**
 * @fileoverview Hook مخصص لإدارة أدوات ما قبل الإنتاج
 *
 * هذا الـ Hook يوفر جميع الوظائف المطلوبة لمرحلة ما قبل الإنتاج
 * بما في ذلك توليد الرؤية البصرية وإدارة إعدادات المشهد.
 * يتضمن معالجة الأخطاء والتحقق من صحة البيانات باستخدام Zod.
 *
 * @module cinematography-studio/hooks/usePreProduction
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import type { VisualMood, VisualGenerationResult } from "../types";
import { ScenePromptSchema } from "../types";
import { postStudioJson } from "../lib/studio-route-client";

// ============================================
// واجهات الحالة الداخلية
// ============================================

/**
 * حالة مولد الرؤية البصرية
 */
interface GeneratorState {
  /** وصف المشهد المُدخل */
  prompt: string;
  /** نسبة الغموض والظلال */
  darkness: number;
  /** نسبة الفوضى البصرية */
  complexity: number;
  /** حالة التوليد جارية */
  isGenerating: boolean;
  /** النتيجة الأخيرة */
  result: VisualGenerationResult | null;
  /** رسالة الخطأ إن وجدت */
  error: string | null;
}

interface ShotSuggestionResponse {
  success?: boolean;
  data?: {
    suggestion?: string;
    sceneDescription?: string;
    shotType?: string;
  };
}

// ============================================
// الثوابت
// ============================================

/**
 * القيم الافتراضية للإعدادات
 */
const DEFAULT_DARKNESS = 50;
const DEFAULT_COMPLEXITY = 30;

/**
 * الحالة الابتدائية للمولد
 */
const initialGeneratorState: GeneratorState = {
  prompt: "",
  darkness: DEFAULT_DARKNESS,
  complexity: DEFAULT_COMPLEXITY,
  isGenerating: false,
  result: null,
  error: null,
};

// ============================================
// الـ Hook الرئيسي
// ============================================

/**
 * Hook مخصص لإدارة أدوات ما قبل الإنتاج
 *
 * يوفر هذا الـ Hook:
 * - إدارة حالة مولد الرؤية البصرية
 * - التحقق من صحة المدخلات باستخدام Zod
 * - معالجة الأخطاء مع إشعارات Toast
 * - دوال محسنة للأداء
 *
 * @example
 * ```tsx
 * const {
 *   prompt,
 *   setPrompt,
 *   handleGenerate,
 *   isGenerating,
 *   result
 * } = usePreProduction("noir");
 * ```
 *
 * @param mood - المود البصري للمشروع
 * @returns كائن يحتوي على الحالة والدوال المساعدة
 */
export function usePreProduction(mood: VisualMood = "noir") {
  // ============================================
  // الحالة
  // ============================================

  const [state, setState] = useState<GeneratorState>(initialGeneratorState);

  // ============================================
  // دوال تحديث الحالة
  // ============================================

  /**
   * تحديث وصف المشهد
   *
   * @param prompt - الوصف الجديد
   */
  const setPrompt = useCallback((prompt: string) => {
    setState((prev) => ({
      ...prev,
      prompt,
      error: null, // مسح الخطأ عند التحديث
    }));
  }, []);

  /**
   * تحديث نسبة الغموض والظلال
   *
   * @param value - القيمة الجديدة (0-100)
   */
  const setDarkness = useCallback((value: number[]) => {
    const darkness = value[0] ?? DEFAULT_DARKNESS;
    setState((prev) => ({
      ...prev,
      darkness,
    }));
  }, []);

  /**
   * تحديث نسبة الفوضى البصرية
   *
   * @param value - القيمة الجديدة (0-100)
   */
  const setComplexity = useCallback((value: number[]) => {
    const complexity = value[0] ?? DEFAULT_COMPLEXITY;
    setState((prev) => ({
      ...prev,
      complexity,
    }));
  }, []);

  /**
   * إعادة تعيين الحالة للقيم الافتراضية
   */
  const reset = useCallback(() => {
    setState(initialGeneratorState);
  }, []);

  // ============================================
  // دالة التوليد الرئيسية
  // ============================================

  /**
   * توليد الرؤية البصرية للمشهد
   *
   * تقوم هذه الدالة بـ:
   * 1. التحقق من صحة المدخلات
   * 2. إظهار إشعار بدء العملية
   * 3. استدعاء خدمة اقتراح اللقطات الفعلية
   * 4. معالجة الأخطاء وإظهار الإشعارات المناسبة
   */
  const handleGenerate = useCallback(async () => {
    // التحقق من صحة المدخلات
    const validation = ScenePromptSchema.safeParse({
      prompt: state.prompt,
      darkness: state.darkness,
      complexity: state.complexity,
    });

    if (!validation.success) {
      const errorMessage =
        validation.error.errors[0]?.message ?? "بيانات غير صالحة";
      setState((prev) => ({ ...prev, error: errorMessage }));
      toast.error(errorMessage);
      return;
    }

    // التحقق من وجود وصف
    if (!state.prompt.trim()) {
      toast.error("يرجى إدخال وصف للمشهد أولاً");
      return;
    }

    try {
      // بدء عملية التوليد
      setState((prev) => ({
        ...prev,
        isGenerating: true,
        error: null,
      }));

      toast.loading("جاري توليد اقتراح اللقطة...", { id: "generating" });

      const shotType = getShotTypeRecommendation(
        state.complexity,
        state.darkness
      );

      const data = await postStudioJson<ShotSuggestionResponse>(
        "/api/cineai/generate-shots",
        {
          sceneDescription: state.prompt,
          shotType,
        },
        { requireCsrf: true }
      );

      const suggestionText = data.data?.suggestion?.trim();
      if (!suggestionText) {
        throw new Error("لم تُرجع الخدمة اقتراحًا صالحًا للّقطة.");
      }

      // تحويل استجابة الـ API إلى الشكل المطلوب
      const result: VisualGenerationResult = {
        id: `gen_${Date.now()}`,
        suggestionText,
        shotType,
        lens: getLensRecommendation(mood, state.complexity),
        lighting: getLightingRecommendation(mood, state.darkness),
        angle: getAngleRecommendation(mood, state.complexity),
        createdAt: new Date(),
      };

      setState((prev) => ({
        ...prev,
        isGenerating: false,
        result,
      }));

      toast.success("تم توليد اقتراح اللقطة بنجاح!", { id: "generating" });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء توليد اقتراح اللقطة";

      setState((prev) => ({
        ...prev,
        isGenerating: false,
        error: errorMessage,
      }));

      toast.error(errorMessage, { id: "generating" });
    }
  }, [state.prompt, state.darkness, state.complexity, mood]);

  // ============================================
  // قيم محسوبة
  // ============================================

  /**
   * التحقق من صلاحية الوصف للتوليد
   */
  const canGenerate = useMemo((): boolean => {
    return state.prompt.trim().length >= 10 && !state.isGenerating;
  }, [state.prompt, state.isGenerating]);

  /**
   * قيم الإعدادات للعرض
   */
  const settings = useMemo(
    () => ({
      darkness: [state.darkness],
      complexity: [state.complexity],
    }),
    [state.darkness, state.complexity]
  );

  // ============================================
  // القيمة المُرجعة
  // ============================================

  return {
    // الحالة
    prompt: state.prompt,
    darkness: settings.darkness,
    complexity: settings.complexity,
    isGenerating: state.isGenerating,
    result: state.result,
    error: state.error,

    // دوال التحديث
    setPrompt,
    setDarkness,
    setComplexity,
    reset,

    // دالة التوليد
    handleGenerate,

    // قيم محسوبة
    canGenerate,
  };
}

// ============================================
// دوال مساعدة
// ============================================

/**
 * الحصول على توصية العدسة بناءً على المود والتعقيد
 */
function getLensRecommendation(mood: VisualMood, complexity: number): string {
  const lensMap: Record<VisualMood, string[]> = {
    noir: ["35mm Anamorphic", "50mm Prime", "24mm Wide"],
    realistic: ["50mm Prime", "85mm Portrait", "35mm Standard"],
    surreal: ["14mm Ultra Wide", "Macro Lens", "Tilt-Shift"],
    vintage: ["50mm f/1.4", "28mm Classic", "135mm Telephoto"],
  };

  const lenses = lensMap[mood];
  const index = Math.min(Math.floor(complexity / 35), lenses.length - 1);
  return lenses[index] ?? lenses[0] ?? "50mm Prime";
}

/**
 * تحديد نوع اللقطة المطلوب من واجهة توليد الاقتراح
 */
function getShotTypeRecommendation(
  complexity: number,
  darkness: number
): string {
  if (complexity >= 70) {
    return "wide";
  }

  if (darkness >= 65) {
    return "close-up";
  }

  return "medium";
}

/**
 * الحصول على توصية الإضاءة بناءً على المود والغموض
 */
function getLightingRecommendation(mood: VisualMood, darkness: number): string {
  const lightingMap: Record<VisualMood, string[]> = {
    noir: ["Low-Key / Chiaroscuro", "Single Source", "Hard Shadows"],
    realistic: ["Natural Light", "Soft Diffused", "Practical Lights"],
    surreal: ["Colored Gels", "Multiple Sources", "Rim Light"],
    vintage: ["Golden Hour", "Tungsten Warm", "Soft Window Light"],
  };

  const lightings = lightingMap[mood];
  const index = Math.min(Math.floor(darkness / 35), lightings.length - 1);
  return lightings[index] ?? lightings[0] ?? "Natural Light";
}

/**
 * الحصول على توصية زاوية الكاميرا بناءً على المود والتعقيد
 */
function getAngleRecommendation(mood: VisualMood, complexity: number): string {
  const angleMap: Record<VisualMood, string[]> = {
    noir: ["Dutch Angle (Low)", "High Angle", "Extreme Close-up"],
    realistic: ["Eye Level", "Over the Shoulder", "Medium Shot"],
    surreal: ["Bird's Eye", "Worm's Eye", "360° Pan"],
    vintage: ["Three-Quarter", "Profile Shot", "Two-Shot"],
  };

  const angles = angleMap[mood];
  const index = Math.min(Math.floor(complexity / 35), angles.length - 1);
  return angles[index] ?? angles[0] ?? "Eye Level";
}

export default usePreProduction;
