/**
 * @fileoverview Hook مخصص لإدارة أدوات ما بعد الإنتاج
 *
 * هذا الـ Hook يوفر جميع الوظائف المطلوبة لمرحلة ما بعد الإنتاج
 * بما في ذلك تدريج الألوان، المونتاج، وإعدادات التصدير.
 * يتضمن معالجة الأخطاء والتحقق من صحة البيانات.
 *
 * @module cinematography-studio/hooks/usePostProduction
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";

import { createLocalFootageSummary } from "../lib/local-shot-analysis";
import { resolveAnalysisWinner } from "../lib/resolve-analysis-winner";
import { postStudioFormData, postStudioJson } from "../lib/studio-route-client";
import { ColorTemperatureSchema, ColorPaletteSchema } from "../types";

import { useMediaInputPipeline } from "./useMediaInputPipeline";
import {
  DEFAULT_TEMPERATURE,
  initialColorGradingState,
  initialEditorialState,
  initialFootageState,
  getRecommendedTemperature,
} from "./usePostProduction-constants";
import {
  type SceneType,
  type ColorGradingState,
  type EditorialState,
  type FootageState,
  type ColorGradingResponse,
  type ChatResponse,
  type ValidateShotResponse,
} from "./usePostProduction-types";
import {
  getExportSettingsForPlatform,
  normalizeFootageSummary,
} from "./usePostProduction-utils";

import type { VisualMood, ExportSettings } from "../types";

// ============================================
// الـ Hook الرئيسي
// ============================================

/**
 * Hook مخصص لإدارة أدوات ما بعد الإنتاج
 *
 * يوفر هذا الـ Hook:
 * - إدارة تدريج الألوان وتوليد لوحات الألوان
 * - تحليل إيقاع المونتاج
 * - تحليل المشاهد المصورة
 * - إعدادات التصدير والتسليم
 * - معالجة الأخطاء مع إشعارات Toast
 *
 * @example
 * ```tsx
 * const {
 *   colorPalette,
 *   generateColorPalette,
 *   temperature,
 *   setTemperature
 * } = usePostProduction("noir");
 * ```
 *
 * @param mood - المود البصري للمشروع
 * @returns كائن يحتوي على الحالة والدوال المساعدة
 */
export function usePostProduction(mood: VisualMood = "noir") {
  // ============================================
  // الحالة
  // ============================================

  const [colorGrading, setColorGrading] = useState<ColorGradingState>(
    initialColorGradingState
  );
  const [editorial, setEditorial] = useState<EditorialState>(
    initialEditorialState
  );
  const [footage, setFootage] = useState<FootageState>(initialFootageState);
  const [exportSettings, setExportSettings] = useState<ExportSettings | null>(
    null
  );
  const mediaInput = useMediaInputPipeline("image");

  // ============================================
  // دوال تدريج الألوان
  // ============================================

  /**
   * تحديث نوع المشهد
   *
   * @param sceneType - نوع المشهد الجديد
   */
  const setSceneType = useCallback((sceneType: SceneType) => {
    setColorGrading((prev) => ({
      ...prev,
      sceneType,
    }));
  }, []);

  /**
   * تحديث درجة حرارة اللون
   *
   * @param value - القيمة الجديدة
   */
  const setTemperature = useCallback((value: number[]) => {
    const temperature = value[0] ?? DEFAULT_TEMPERATURE;

    // التحقق من صحة القيمة
    const validation = ColorTemperatureSchema.safeParse(temperature);
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message ?? "قيمة غير صالحة");
      return;
    }

    setColorGrading((prev) => ({
      ...prev,
      temperature,
    }));
  }, []);

  /**
   * توليد لوحة الألوان
   *
   * تقوم هذه الدالة بتوليد لوحة ألوان مناسبة بناءً على:
   * - المود البصري للمشروع
   * - نوع المشهد المحدد
   * - درجة حرارة اللون
   */
  const generateColorPalette = useCallback(async () => {
    try {
      setColorGrading((prev) => ({
        ...prev,
        isGenerating: true,
      }));

      toast.loading("جاري توليد لوحة الألوان...", { id: "palette" });

      // استدعاء API لتوليد لوحة الألوان
      const data = await postStudioJson<ColorGradingResponse>(
        "/api/cineai/color-grading",
        {
          sceneType: colorGrading.sceneType,
          mood,
          temperature: colorGrading.temperature,
        }
      );
      const palette = data.palette ?? [];

      // التحقق من صحة اللوحة
      const validation = ColorPaletteSchema.safeParse(palette);
      if (!validation.success) {
        throw new Error("فشل في توليد لوحة الألوان");
      }

      setColorGrading((prev) => ({
        ...prev,
        isGenerating: false,
        colorPalette: validation.data,
      }));

      toast.success("تم توليد لوحة الألوان بنجاح!", { id: "palette" });
    } catch (error) {
      setColorGrading((prev) => ({
        ...prev,
        isGenerating: false,
      }));

      toast.error(
        error instanceof Error ? error.message : "فشل في توليد لوحة الألوان",
        { id: "palette" }
      );
    }
  }, [mood, colorGrading.sceneType, colorGrading.temperature]);

  // ============================================
  // دوال المونتاج
  // ============================================

  /**
   * تحديث ملاحظات المونتاج
   *
   * @param notes - الملاحظات الجديدة
   */
  const setEditorialNotes = useCallback((notes: string) => {
    setEditorial((prev) => ({
      ...prev,
      notes,
    }));
  }, []);

  /**
   * تحليل إيقاع المونتاج
   */
  const analyzeRhythm = useCallback(async () => {
    if (!editorial.notes.trim()) {
      toast.error("يرجى إدخال ملاحظات المونتاج أولاً");
      return;
    }

    try {
      setEditorial((prev) => ({
        ...prev,
        isAnalyzing: true,
      }));

      toast.loading("جاري تحليل الإيقاع...", { id: "rhythm" });

      // استدعاء API لتحليل إيقاع المونتاج
      const response = await postStudioJson<ChatResponse>(
        "/api/ai/chat",
        {
          message: `حلل إيقاع المونتاج بناءً على هذه الملاحظات وقدم توصيات تقنية:\n${editorial.notes}`,
          context: {
            assistant: "editorial-rhythm-analysis",
            mood,
          },
        },
        { requireCsrf: true }
      );

      toast.success(response.data?.response ?? "تم تحليل الإيقاع بنجاح!", {
        id: "rhythm",
      });

      setEditorial((prev) => ({
        ...prev,
        isAnalyzing: false,
      }));
    } catch (error) {
      setEditorial((prev) => ({
        ...prev,
        isAnalyzing: false,
      }));

      toast.error(
        error instanceof Error ? error.message : "فشل في تحليل الإيقاع",
        { id: "rhythm" }
      );
    }
  }, [editorial.notes, mood]);

  // ============================================
  // دوال تحليل المشاهد
  // ============================================

  /**
   * حد المهلة لمسار التحليل البعيد (ms).
   * يجب أن يسبق مهلة الاختبار الطرفي بهامش آمن.
   */
  const REMOTE_ANALYSIS_TIMEOUT_MS = 12_000;

  /**
   * تحليل المشاهد المرفوعة — مسار متوازٍ
   *
   * يبدأ الطلب البعيد والبديل المحلي معًا.
   * إذا عاد التحليل البعيد بنتيجة صالحة قبل المهلة يُعتمد كمصدر نهائي.
   * إذا تأخر أو فشل أو أعاد حمولة غير صالحة يُثبَّت الملخص المحلي فورًا.
   */
  const analyzeFootage = useCallback(
    async (file: File) => {
      const allComplete: FootageState["analysisStatus"] = {
        exposure: "complete",
        colorConsistency: "complete",
        focusQuality: "complete",
        motionBlur: "complete",
      };

      toast.loading("جاري تحليل الإطار المرجعي...", { id: "analysis" });

      setFootage((prev) => ({
        ...prev,
        analysisStatus: {
          exposure: "analyzing",
          colorConsistency: "analyzing",
          focusQuality: "analyzing",
          motionBlur: "analyzing",
        },
      }));

      // تجهيز البديل المحلي بالتوازي من اللحظة الأولى
      const localPromise = createLocalFootageSummary(file, mood).catch(
        () => null
      );

      // الطلب البعيد مع مهلة واضحة
      const formData = new FormData();
      formData.set("image", file);

      const remotePromise = postStudioFormData<ValidateShotResponse>(
        "/api/cineai/validate-shot",
        formData,
        {
          timeoutMs: REMOTE_ANALYSIS_TIMEOUT_MS,
          timeoutMessage:
            "انتهت المهلة الزمنية لتحليل المشهد. سيُستخدم التحليل المحلي.",
        }
      )
        .then((remoteResult) => {
          if (!remoteResult?.validation) {
            return null;
          }

          return normalizeFootageSummary(remoteResult.validation);
        })
        .catch(() => null);

      const winner = await resolveAnalysisWinner({
        remote: remotePromise,
        local: localPromise,
      });

      if (winner?.source === "remote") {
        setFootage((prev) => ({
          ...prev,
          summary: winner.value,
          analysisSource: "remote",
          error: null,
          analysisStatus: allComplete,
        }));
        toast.success("اكتمل تحليل الإطار المرجعي!", { id: "analysis" });
        toast.success("تم رفع الإطار المرجعي بنجاح!", { id: "upload" });
        return;
      }

      if (winner?.source === "local-fallback") {
        setFootage((prev) => ({
          ...prev,
          summary: winner.value,
          analysisSource: "local-fallback",
          error: null,
          analysisStatus: allComplete,
        }));
        toast.success("تم تفعيل التحليل المحلي البديل للمشاهد", {
          id: "analysis",
        });
        return;
      }

      // كلا المسارين فشلا
      setFootage((prev) => ({
        ...prev,
        analysisSource: null,
        error: "فشل في تحليل الإطار المرجعي من جميع المصادر",
        analysisStatus: initialFootageState.analysisStatus,
      }));
      toast.error("فشل في تحليل الإطار المرجعي", { id: "analysis" });
    },
    [mood]
  );

  /**
   * رفع إطار مرجعي للتحليل
   */
  const uploadFootage = useCallback(
    async (file?: File | null) => {
      const effectiveFile = file ?? mediaInput.state.analysisFile;
      if (!effectiveFile) {
        const message =
          "يرجى اختيار صورة أو فيديو أو التقاط إطار من الكاميرا قبل بدء التحليل.";
        setFootage((prev) => ({
          ...prev,
          error: message,
        }));
        toast.error(message);
        return;
      }

      try {
        setFootage((prev) => ({
          ...prev,
          isUploading: true,
          error: null,
        }));

        toast.loading("جاري رفع الإطار المرجعي...", { id: "upload" });

        await analyzeFootage(effectiveFile);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "فشل في رفع الإطار المرجعي";
        setFootage((prev) => ({
          ...prev,
          error: message,
        }));
        toast.error(message, { id: "upload" });
      } finally {
        setFootage((prev) => ({
          ...prev,
          isUploading: false,
        }));
      }
    },
    [analyzeFootage, mediaInput.state.analysisFile]
  );

  // ============================================
  // دوال التصدير
  // ============================================

  /**
   * إنشاء إعدادات التصدير
   *
   * @param platform - المنصة المستهدفة
   */
  const createExportSettings = useCallback(
    (platform: ExportSettings["platform"]) => {
      const settings = getExportSettingsForPlatform(platform);
      setExportSettings(settings);
      toast.success(`تم إنشاء إعدادات التصدير لـ ${settings.platform}`);
    },
    []
  );

  // ============================================
  // قيم محسوبة
  // ============================================

  /**
   * درجة الحرارة الموصى بها بناءً على المود
   */
  const recommendedTemperature = useMemo((): number => {
    return getRecommendedTemperature(mood);
  }, [mood]);

  /**
   * التحقق من وجود لوحة ألوان
   */
  const hasColorPalette = useMemo((): boolean => {
    return colorGrading.colorPalette.length > 0;
  }, [colorGrading.colorPalette]);

  /**
   * التحقق من اكتمال تحليل المشاهد
   */
  const isFootageAnalysisComplete = useMemo((): boolean => {
    const { analysisStatus } = footage;
    return Object.values(analysisStatus).every(
      (status) => status === "complete"
    );
  }, [footage.analysisStatus]);

  /**
   * قيمة درجة الحرارة للعرض
   */
  const temperatureValue = useMemo(
    () => [colorGrading.temperature],
    [colorGrading.temperature]
  );

  // ============================================
  // القيمة المُرجعة
  // ============================================

  return {
    // تدريج الألوان
    sceneType: colorGrading.sceneType,
    temperature: colorGrading.temperature,
    temperatureValue,
    colorPalette: colorGrading.colorPalette,
    isGeneratingPalette: colorGrading.isGenerating,
    setSceneType,
    setTemperature,
    generateColorPalette,
    hasColorPalette,
    recommendedTemperature,

    // المونتاج
    editorialNotes: editorial.notes,
    isAnalyzingRhythm: editorial.isAnalyzing,
    setEditorialNotes,
    analyzeRhythm,

    // تحليل المشاهد
    isUploadingFootage: footage.isUploading,
    footageAnalysisStatus: footage.analysisStatus,
    footageSummary: footage.summary,
    footageAnalysisSource: footage.analysisSource,
    footageError: footage.error,
    uploadFootage,
    isFootageAnalysisComplete,
    mediaInput,

    // التصدير
    exportSettings,
    createExportSettings,
  };
}

export default usePostProduction;
