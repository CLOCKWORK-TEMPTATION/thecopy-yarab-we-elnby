// Constants for useProduction hook

import type {
  AnalysisState,
  AssistantState,
  TechnicalSettings,
} from "./useProduction-types";
import type { VisualMood } from "../../types";

/**
 * الحالة الابتدائية للتحليل
 */
export const initialAnalysisState: AnalysisState = {
  isAnalyzing: false,
  analysis: null,
  source: null,
  error: null,
  question: "",
};

export const initialAssistantState: AssistantState = {
  isLoading: false,
  answer: null,
  lastQuestion: null,
  error: null,
};

/** حد المهلة لطلب المساعد الذكي (ms). */
export const ASSISTANT_REQUEST_TIMEOUT_MS = 15_000;

/**
 * الإعدادات التقنية الافتراضية
 */
export const defaultTechnicalSettings: TechnicalSettings = {
  focusPeaking: true,
  falseColor: false,
  colorTemp: 3200,
};

/**
 * درجة الحرارة الموصى بها بناءً على المود الحالي
 */
export const getRecommendedColorTemp = (mood: VisualMood): number => {
  const moodDefaults: Record<VisualMood, number> = {
    noir: 3200,
    realistic: 5600,
    surreal: 4500,
    vintage: 3800,
  };
  return moodDefaults[mood];
};
