// Constants for usePostProduction hook

import type { VisualMood, ExportSettings } from "../../types";
import type { ColorGradingState, EditorialState, FootageState } from "./usePostProduction-types";

/**
 * درجة الحرارة الافتراضية
 */
export const DEFAULT_TEMPERATURE = 5500;

/**
 * الحالة الابتدائية لتدريج الألوان
 */
export const initialColorGradingState: ColorGradingState = {
  sceneType: null,
  temperature: DEFAULT_TEMPERATURE,
  colorPalette: [],
  isGenerating: false,
};

/**
 * الحالة الابتدائية للمونتاج
 */
export const initialEditorialState: EditorialState = {
  notes: "",
  isAnalyzing: false,
};

/**
 * الحالة الابتدائية لتحليل المشاهد
 */
export const initialFootageState: FootageState = {
  isUploading: false,
  error: null,
  summary: null,
  analysisSource: null,
  analysisStatus: {
    exposure: "pending",
    colorConsistency: "pending",
    focusQuality: "pending",
    motionBlur: "pending",
  },
};

/**
 * حد المهلة لمسار التحليل البعيد (ms).
 * يجب أن يسبق مهلة الاختبار الطرفي بهامش آمن.
 */
export const REMOTE_ANALYSIS_TIMEOUT_MS = 12_000;

/**
 * درجة الحرارة الموصى بها بناءً على المود
 */
export const getRecommendedTemperature = (mood: VisualMood): number => {
  const moodDefaults: Record<VisualMood, number> = {
    noir: 3200,
    realistic: 5600,
    surreal: 4500,
    vintage: 3800,
  };
  return moodDefaults[mood];
};