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

import React, { useState, useCallback, useMemo } from "react";
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
  REMOTE_ANALYSIS_TIMEOUT_MS,
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
// دالة مساعدة لتحليل المشاهد
// ============================================

async function runFootageAnalysis(
  file: File,
  mood: VisualMood,
  setFootage: React.Dispatch<React.SetStateAction<FootageState>>,
  initialFootageState: FootageState
): Promise<void> {
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

  const localPromise = createLocalFootageSummary(file, mood).catch(() => null);

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
      if (!remoteResult?.validation) return null;
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
    toast.success("تم تفعيل التحليل المحلي البديل للمشاهد", { id: "analysis" });
    return;
  }

  setFootage((prev) => ({
    ...prev,
    analysisSource: null,
    error: "فشل في تحليل الإطار المرجعي من جميع المصادر",
    analysisStatus: initialFootageState.analysisStatus,
  }));
  toast.error("فشل في تحليل الإطار المرجعي", { id: "analysis" });
}

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

  /**
   * تحديث نوع المشهد
   */
  const setSceneType = useCallback((sceneType: SceneType) => {
    setColorGrading((prev) => ({
      ...prev,
      sceneType,
    }));
  }, []);

  /**
   * تحديث درجة حرارة اللون
   */
  const setTemperature = useCallback((value: number[]) => {
    const temperature = value[0] ?? DEFAULT_TEMPERATURE;

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
   */
  const generateColorPalette = useCallback(async () => {
    try {
      setColorGrading((prev) => ({
        ...prev,
        isGenerating: true,
      }));

      toast.loading("جاري توليد لوحة الألوان...", { id: "palette" });

      const data = await postStudioJson<ColorGradingResponse>(
        "/api/cineai/color-grading",
        {
          sceneType: colorGrading.sceneType,
          mood,
          temperature: colorGrading.temperature,
        }
      );
      const palette = data.palette ?? [];

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

  /**
   * تحديث ملاحظات المونتاج
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

  /**
   * تحليل المشاهد المرفوعة — مسار متوازٍ
   */
  const analyzeFootage = useCallback(
    async (file: File) => {
      await runFootageAnalysis(file, mood, setFootage, initialFootageState);
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

  /**
   * إنشاء إعدادات التصدير
   */
  const createExportSettings = useCallback(
    (platform: ExportSettings["platform"]) => {
      const settings = getExportSettingsForPlatform(platform);
      setExportSettings(settings);
      toast.success(`تم إنشاء إعدادات التصدير لـ ${settings.platform}`);
    },
    []
  );

  const recommendedTemperature = useMemo((): number => {
    return getRecommendedTemperature(mood);
  }, [mood]);

  const hasColorPalette = useMemo((): boolean => {
    return colorGrading.colorPalette.length > 0;
  }, [colorGrading.colorPalette]);

  const isFootageAnalysisComplete = useMemo((): boolean => {
    const { analysisStatus } = footage;
    return Object.values(analysisStatus).every(
      (status) => status === "complete"
    );
  }, [footage]);

  const temperatureValue = useMemo(
    () => [colorGrading.temperature],
    [colorGrading.temperature]
  );

  return {
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

    editorialNotes: editorial.notes,
    isAnalyzingRhythm: editorial.isAnalyzing,
    setEditorialNotes,
    analyzeRhythm,

    isUploadingFootage: footage.isUploading,
    footageAnalysisStatus: footage.analysisStatus,
    footageSummary: footage.summary,
    footageAnalysisSource: footage.analysisSource,
    footageError: footage.error,
    uploadFootage,
    isFootageAnalysisComplete,
    mediaInput,

    exportSettings,
    createExportSettings,
  };
}

export default usePostProduction;
