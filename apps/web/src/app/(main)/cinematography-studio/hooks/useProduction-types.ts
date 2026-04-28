// Types for useProduction hook

import type { ShotAnalysis } from "../types";

/**
 * حالة تحليل اللقطة
 */
export interface AnalysisState {
  /** حالة التحليل جارية */
  isAnalyzing: boolean;
  /** نتيجة التحليل */
  analysis: ShotAnalysis | null;
  /** مصدر التحليل الفعلي */
  source: "remote" | "local-fallback" | null;
  /** رسالة الخطأ إن وجدت */
  error: string | null;
  /** سؤال المستخدم للمساعد */
  question: string;
}

/**
 * حالة المساعد الذكي — منفصلة عن حالة التحليل لأن الإجابة والخطأ
 * يجب أن يبقيا داخل لوحة المساعد لا في إشعار toast العابر.
 */
export interface AssistantState {
  isLoading: boolean;
  /** آخر إجابة ناجحة */
  answer: string | null;
  /** آخر سؤال أُرسل بنجاح (لعرضه فوق الإجابة) */
  lastQuestion: string | null;
  /** آخر خطأ */
  error: string | null;
}

/**
 * الإعدادات التقنية للكاميرا
 */
export interface TechnicalSettings {
  /** Focus Peaking */
  focusPeaking: boolean;
  /** False Color */
  falseColor: boolean;
  /** درجة حرارة اللون بالكلفن */
  colorTemp: number;
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

export interface ChatResponse {
  success?: boolean;
  data?: {
    response?: string;
  };
}
