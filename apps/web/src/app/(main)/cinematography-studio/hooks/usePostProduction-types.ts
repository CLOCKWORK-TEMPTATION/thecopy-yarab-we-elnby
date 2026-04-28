// Types for usePostProduction hook

import type { FootageAnalysisSummary } from "../../../types";

/**
 * نوع المشهد للتدريج اللوني
 */
export type SceneType =
  | "morning"
  | "night"
  | "indoor"
  | "outdoor"
  | "happy"
  | "sad"
  | null;

/**
 * حالة تدريج الألوان
 */
export interface ColorGradingState {
  /** نوع المشهد المحدد */
  sceneType: SceneType;
  /** درجة حرارة اللون بالكلفن */
  temperature: number;
  /** لوحة الألوان المولدة */
  colorPalette: string[];
  /** حالة التوليد جارية */
  isGenerating: boolean;
}

/**
 * حالة المونتاج
 */
export interface EditorialState {
  /** ملاحظات المونتاج */
  notes: string;
  /** حالة التحليل جارية */
  isAnalyzing: boolean;
}

/**
 * حالة تحليل المشاهد
 */
export interface FootageState {
  /** حالة الرفع جارية */
  isUploading: boolean;
  /** رسالة الخطأ */
  error: string | null;
  /** ملخص التحليل */
  summary: FootageAnalysisSummary | null;
  /** مصدر التحليل الحالي */
  analysisSource: "remote" | "local-fallback" | null;
  /** حالة التحليل */
  analysisStatus: {
    exposure: "pending" | "analyzing" | "complete";
    colorConsistency: "pending" | "analyzing" | "complete";
    focusQuality: "pending" | "analyzing" | "complete";
    motionBlur: "pending" | "analyzing" | "complete";
  };
}

export interface ColorGradingResponse {
  success?: boolean;
  palette?: string[];
}

export interface ChatResponse {
  success?: boolean;
  data?: {
    response?: string;
  };
}

export interface ValidateShotResponse {
  success?: boolean;
  validation?: {
    score?: number;
    status?: string;
    exposure?: string;
    composition?: string;
    focus?: string;
    colorBalance?: string;
    suggestions?: string[];
    improvements?: string[];
  };
}
