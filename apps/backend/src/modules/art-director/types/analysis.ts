/**
 * CineArchitect AI - Analysis & Report Types
 * أنواع التحليل والتقارير
 */

// ==================== Analysis Types ====================
// أنواع التحليل والتقارير

/**
 * واجهة نتيجة التحليل البصري
 */
export interface VisualAnalysisResult {
  consistent: boolean;
  issues: VisualIssue[];
  suggestions: string[];
  score: number;
}

/**
 * واجهة مشكلة بصرية
 */
export interface VisualIssue {
  type: "color" | "lighting" | "continuity" | "costume" | "prop";
  severity: "low" | "medium" | "high";
  description: string;
  descriptionAr: string;
  location: string;
  suggestion: string;
}

/**
 * واجهة نتيجة الترجمة
 */
export interface TranslationResult {
  original: string;
  translated: string;
  sourceLanguage: string;
  targetLanguage: string;
  context: string;
  alternatives?: string[];
}

/**
 * واجهة تحليل المخاطر
 */
export interface RiskAnalysis {
  overallRisk: "low" | "medium" | "high";
  risks: Risk[];
  mitigations: Mitigation[];
  contingencyPlans: ContingencyPlan[];
}

/**
 * واجهة الخطر
 */
export interface Risk {
  id: string;
  type:
    | "financial"
    | "logistical"
    | "weather"
    | "safety"
    | "legal"
    | "technical";
  description: string;
  descriptionAr: string;
  probability: number;
  impact: number;
  score: number;
}

/**
 * واجهة التخفيف
 */
export interface Mitigation {
  riskId: string;
  action: string;
  actionAr: string;
  responsible: string;
  deadline?: Date;
}

/**
 * واجهة خطة الطوارئ
 */
export interface ContingencyPlan {
  riskId: string;
  trigger: string;
  actions: string[];
  resources: string[];
}
