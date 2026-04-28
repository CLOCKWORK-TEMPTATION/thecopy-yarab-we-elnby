/**
 * @description أنواع وثوابت نظام التطوير الإبداعي.
 * مستقل عن React — لا يحتوي على hooks أو مكونات.
 */

import {
  CreativeTaskType,
  DEFAULT_AI_SETTINGS,
  type AdvancedAISettings,
  type AIResponseData,
  type SevenStationsAnalysis,
  type TaskResults,
} from "../types";

// ============================================
// الثوابت
// ============================================

/** الحد الأدنى لطول النص المطلوب */
export const MIN_TEXT_LENGTH = 100;

/** المهام التي تتطلب تحديد نطاق الإكمال */
export const TASKS_REQUIRING_COMPLETION_SCOPE: CreativeTaskType[] = [
  CreativeTaskType.COMPLETION,
];

/** خيارات تحسين الإكمال */
export const COMPLETION_ENHANCEMENT_OPTIONS: CreativeTaskType[] = [
  CreativeTaskType.CHARACTER_VOICE,
  CreativeTaskType.TENSION_OPTIMIZER,
  CreativeTaskType.STYLE_FINGERPRINT,
];

/** ربط مهام واجهة التطوير بمعرفات الوكلاء في الباك إند */
export const TASK_TO_BACKEND_AGENT_ID: Record<CreativeTaskType, string> = {
  [CreativeTaskType.CREATIVE]: "creative",
  [CreativeTaskType.COMPLETION]: "completion",
  [CreativeTaskType.ADAPTIVE_REWRITING]: "adaptive-rewriting",
  [CreativeTaskType.SCENE_GENERATOR]: "scene-generator",
  [CreativeTaskType.CHARACTER_VOICE]: "character-voice",
  [CreativeTaskType.WORLD_BUILDER]: "world-builder",
  [CreativeTaskType.PLOT_PREDICTOR]: "plot-predictor",
  [CreativeTaskType.TENSION_OPTIMIZER]: "tension-optimizer",
  [CreativeTaskType.RHYTHM_MAPPING]: "rhythm-mapping",
  [CreativeTaskType.CHARACTER_NETWORK]: "character-network",
  [CreativeTaskType.DIALOGUE_FORENSICS]: "dialogue-forensics",
  [CreativeTaskType.THEMATIC_MINING]: "thematic-mining",
  [CreativeTaskType.STYLE_FINGERPRINT]: "style-fingerprint",
  [CreativeTaskType.CONFLICT_DYNAMICS]: "conflict-dynamics",
};

// ============================================
// واجهات API
// ============================================

export interface BrainstormDebatePayload {
  task: string;
  context: {
    brief: string;
    phase: 1 | 2 | 3 | 4 | 5;
    sessionId: string;
  };
  agentIds: string[];
}

export interface BrainstormDebateResponse {
  success: boolean;
  error?: string;
  result?: {
    proposals?: {
      agentId: string;
      proposal: string;
      confidence: number;
    }[];
    consensus?: boolean;
    finalDecision?: string;
    judgeReasoning?: string;
  };
}

export interface AnalysisSnapshot {
  text: string;
  results: Record<string, unknown>;
  analysisId: string | null;
}

// ============================================
// حالة التطوير الإبداعي
// ============================================

export interface CreativeDevelopmentState {
  textInput: string;
  selectedTask: CreativeTaskType | null;
  /** معرف المهمة المختارة من كتالوج 27 مهمة */
  selectedCatalogTaskId: string | null;
  specialRequirements: string;
  additionalInfo: string;
  completionScope: string;
  selectedCompletionEnhancements: CreativeTaskType[];
  analysisReport: string;
  isAnalysisComplete: boolean;
  isManualMode: boolean;
  taskResults: TaskResults;
  showReportModal: string | null;
  analysisId: string | null;
  advancedSettings: AdvancedAISettings;
  aiResponse: AIResponseData | null;
  /** نتيجة آخر تنفيذ من كتالوج الأدوات */
  catalogResult: AIResponseData | null;
  error: string | null;
  isLoading: boolean;
}

export const initialState: CreativeDevelopmentState = {
  textInput: "",
  selectedTask: null,
  selectedCatalogTaskId: null,
  specialRequirements: "",
  additionalInfo: "",
  completionScope: "",
  selectedCompletionEnhancements: [],
  analysisReport: "",
  isAnalysisComplete: false,
  isManualMode: false,
  taskResults: {},
  showReportModal: null,
  analysisId: null,
  advancedSettings: DEFAULT_AI_SETTINGS,
  aiResponse: null,
  catalogResult: null,
  error: null,
  isLoading: false,
};

// ============================================
// أنواع الإجراءات
// ============================================

export type ActionType =
  | { type: "SET_TEXT_INPUT"; payload: string }
  | { type: "SET_SELECTED_TASK"; payload: CreativeTaskType | null }
  | { type: "SET_SELECTED_CATALOG_TASK"; payload: string | null }
  | { type: "SET_SPECIAL_REQUIREMENTS"; payload: string }
  | { type: "SET_ADDITIONAL_INFO"; payload: string }
  | { type: "SET_COMPLETION_SCOPE"; payload: string }
  | { type: "TOGGLE_ENHANCEMENT"; payload: CreativeTaskType }
  | { type: "SET_ANALYSIS_REPORT"; payload: string }
  | { type: "SET_ANALYSIS_COMPLETE"; payload: boolean }
  | { type: "SET_ANALYSIS_ID"; payload: string | null }
  | { type: "SET_TASK_RESULTS"; payload: TaskResults }
  | { type: "SET_SHOW_REPORT_MODAL"; payload: string | null }
  | { type: "SET_ADVANCED_SETTINGS"; payload: Partial<AdvancedAISettings> }
  | { type: "SET_AI_RESPONSE"; payload: AIResponseData | null }
  | {
      type: "SET_CATALOG_RESULT";
      payload: { aiResponse: AIResponseData; taskResults: TaskResults };
    }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "CLEAR_ANALYSIS_DATA" }
  | { type: "ENABLE_MANUAL_MODE" }
  | { type: "LOAD_SEVEN_STATIONS"; payload: SevenStationsAnalysis }
  | { type: "LOAD_SESSION_ANALYSIS"; payload: { report: string; id: string } };

// ============================================
// حالة الفتح/القفل
// ============================================

/**
 * معلومات حالة فتح/قفل الصفحة — تُعاد للمكون الرسومي
 */
export interface UnlockStatus {
  locked: boolean;
  reason: "ready" | "no-report" | "short-report" | "no-text";
  reportLength: number;
  minRequired: number;
  progress: number;
}
