/**
 * Enhanced Self-Critique Types
 * أنواع محسّنة لنظام النقد الذاتي المتخصص
 */

import { TaskType } from "@core/types";

/**
 * معيار نقد فردي
 */
export interface CritiqueDimension {
  /** اسم البعد */
  name: string;
  /** الوصف */
  description: string;
  /** الوزن (0-1) */
  weight: number;
  /** معايير التقييم */
  rubric: CritiqueLevel[];
}

/**
 * مستويات التقييم
 */
export interface CritiqueLevel {
  /** المستوى */
  level: "excellent" | "good" | "satisfactory" | "needs_improvement" | "poor";
  /** النتيجة */
  score: number;
  /** الوصف */
  description: string;
  /** مؤشرات */
  indicators: string[];
}

/**
 * تكوين معايير النقد لنوع وكيل معين
 */
export interface CritiqueConfiguration {
  /** نوع الوكيل */
  agentType: TaskType;
  /** اسم الوكيل بالعربية */
  agentName: string;
  /** فئة الوكيل */
  category: "core" | "analysis" | "creative" | "predictive" | "advanced";
  /** أبعاد التقييم */
  dimensions: CritiqueDimension[];
  /** العتبات */
  thresholds: {
    /** ممتاز */
    excellent: number;
    /** جيد */
    good: number;
    /** مقبول */
    satisfactory: number;
    /** يحتاج تحسين */
    needsImprovement: number;
  };
  /** الحد الأقصى للدورات */
  maxIterations: number;
  /** تمكين التصحيح التلقائي */
  enableAutoCorrection: boolean;
}

/**
 * نتيجة تقييم البعد الواحد
 */
export interface DimensionScore {
  /** البعد */
  dimension: string;
  /** النتيجة (0-1) */
  score: number;
  /** المستوى */
  level: string;
  /** نقاط القوة */
  strengths: string[];
  /** نقاط الضعف */
  weaknesses: string[];
  /** التحسينات المقترحة */
  suggestions: string[];
}

/**
 * نتيجة النقد المحسّن
 */
export interface EnhancedCritiqueResult {
  /** المخرج الأصلي */
  originalOutput: string;
  /** المخرج المحسّن */
  refinedOutput: string;
  /** تم التحسين؟ */
  improved: boolean;
  /** عدد الدورات */
  iterations: number;
  /** الدرجات لكل بعد */
  dimensionScores: DimensionScore[];
  /** النتيجة الإجمالية */
  overallScore: number;
  /** المستوى الإجمالي */
  overallLevel: "excellent" | "good" | "satisfactory" | "needs_improvement" | "poor";
  /** درجة التحسين */
  improvementScore: number;
  /** ملاحظات النقد */
  critiqueNotes: string[];
  /** خطة التحسين */
  improvementPlan?: Array<{
    priority: "high" | "medium" | "low";
    actions: string[];
    expectedImpact?: string;
  }> | undefined;
}

/**
 * سياق النقد المتقدم
 */
export interface CritiqueContext {
  /** نوع الوكيل */
  taskType: TaskType;
  /** اسم الوكيل */
  agentName: string;
  /** النص الأصلي */
  originalText: string;
  /** السياق الإضافي */
  additionalContext?: Record<string, unknown>;
  /** تقييمات المستخدمين السابقة */
  historicalRatings?: {
    average: number;
    count: number;
    feedback: string[];
  };
}

/**
 * طلب نقد متقدم
 */
export interface CritiqueRequest {
  /** المخرج المراد نقد */
  output: string;
  /** المهمة الأصلية */
  task: string;
  /** سياق النقد */
  context: CritiqueContext;
  /** تكوين مخصص (اختياري) */
  customConfig?: Partial<CritiqueConfiguration>;
}

/**
 * إحصائيات النقد
 */
export interface CritiqueStatistics {
  /** متوسط النتيجة الإجمالية */
  averageOverallScore: number;
  /** أكثر البُعد احتياجاً للتحسين */
  weakestDimension: string;
  /** أفضل البُعد */
  strongestDimension: string;
  /** معدل التحسين */
  improvementRate: number;
  /** عدد التحليلات */
  totalAnalyses: number;
}

/**
 * نوعية النقد
 */
export enum CritiqueStyle {
  /** بناء */
  CONSTRUCTIVE = "constructive",
  /** صارم */
  STRICT = "strict",
  /** تشجيعي */
  ENCOURAGING = "encouraging",
  /** أكاديمي */
  ACADEMIC = "academic",
  /** إبداعي */
  CREATIVE = "creative"
}
