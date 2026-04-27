/**
 * @fileoverview هوك مخصص لإدارة حالة التطوير الإبداعي
 *
 * يفصل هذا الهوك منطق إدارة الحالة عن المكون الرسومي
 * لتسهيل الاختبار والصيانة
 *
 * @module development/hooks/useCreativeDevelopment
 */

import { useCallback, useEffect, useReducer } from "react";

import { toText } from "@/ai/gemini-core";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/ai/utils/logger";
import { loadRemoteAppState } from "@/lib/app-state-client";

import {
  CreativeTaskType,
  CREATIVE_TASK_LABELS,
  DEFAULT_AI_SETTINGS,
  type AdvancedAISettings,
  type AIResponseData,
  type AIRequestData,
  type ProcessedInputFile,
  type SevenStationsAnalysis,
  type TaskResults,
  type DevelopmentTaskDefinition,
  type WorkflowTaskTarget,
  submitInputSchema,
} from "../types";
import { normalizeResult } from "../utils/result-normalizer";
import { getTaskById } from "../utils/task-catalog";

// ============================================
// الثوابت
// ============================================

/** الحد الأدنى لطول النص المطلوب */
const MIN_TEXT_LENGTH = 100;

/** المهام التي تتطلب تحديد نطاق الإكمال */
const TASKS_REQUIRING_COMPLETION_SCOPE: CreativeTaskType[] = [
  CreativeTaskType.COMPLETION,
];

/** خيارات تحسين الإكمال */
const COMPLETION_ENHANCEMENT_OPTIONS: CreativeTaskType[] = [
  CreativeTaskType.CHARACTER_VOICE,
  CreativeTaskType.TENSION_OPTIMIZER,
  CreativeTaskType.STYLE_FINGERPRINT,
];

/** ربط مهام واجهة التطوير بمعرفات الوكلاء في الباك إند */
const TASK_TO_BACKEND_AGENT_ID: Record<CreativeTaskType, string> = {
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

interface BrainstormDebatePayload {
  task: string;
  context: {
    brief: string;
    phase: 1 | 2 | 3 | 4 | 5;
    sessionId: string;
  };
  agentIds: string[];
}

interface BrainstormDebateResponse {
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

// ============================================
// أنواع الإجراءات
// ============================================

type ActionType =
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
// الحالة الابتدائية
// ============================================

interface CreativeDevelopmentState {
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

interface AnalysisSnapshot {
  text: string;
  results: Record<string, unknown>;
  analysisId: string | null;
}

const initialState: CreativeDevelopmentState = {
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
// المُختزل (Reducer)
// ============================================

/**
 * مُختزل حالة التطوير الإبداعي
 * يدير جميع تحديثات الحالة بطريقة مركزية
 */
function creativeDevelopmentReducer(
  state: CreativeDevelopmentState,
  action: ActionType
): CreativeDevelopmentState {
  switch (action.type) {
    case "SET_TEXT_INPUT":
      return { ...state, textInput: action.payload };

    case "SET_SELECTED_TASK":
      return {
        ...state,
        selectedTask: action.payload,
        error: null,
        aiResponse: null,
        completionScope:
          action.payload &&
          !TASKS_REQUIRING_COMPLETION_SCOPE.includes(action.payload)
            ? ""
            : state.completionScope,
        selectedCompletionEnhancements:
          action.payload !== CreativeTaskType.COMPLETION
            ? []
            : state.selectedCompletionEnhancements,
      };

    case "SET_SELECTED_CATALOG_TASK":
      // عند اختيار مهمة كتالوج جديدة، نمسح نتيجة الكتالوج السابقة والخطأ
      return {
        ...state,
        selectedCatalogTaskId: action.payload,
        catalogResult: null,
        error: null,
      };

    case "SET_CATALOG_RESULT":
      // تحديث نتيجة كتالوج الأدوات مع الحفاظ على نتائج المهام المتراكمة
      return {
        ...state,
        catalogResult: action.payload.aiResponse,
        taskResults: { ...state.taskResults, ...action.payload.taskResults },
      };

    case "SET_SPECIAL_REQUIREMENTS":
      return { ...state, specialRequirements: action.payload };

    case "SET_ADDITIONAL_INFO":
      return { ...state, additionalInfo: action.payload };

    case "SET_COMPLETION_SCOPE":
      return { ...state, completionScope: action.payload };

    case "TOGGLE_ENHANCEMENT":
      return {
        ...state,
        selectedCompletionEnhancements:
          state.selectedCompletionEnhancements.includes(action.payload)
            ? state.selectedCompletionEnhancements.filter(
                (id) => id !== action.payload
              )
            : [...state.selectedCompletionEnhancements, action.payload],
      };

    case "SET_ANALYSIS_REPORT":
      return { ...state, analysisReport: action.payload };

    case "SET_ANALYSIS_COMPLETE":
      return { ...state, isAnalysisComplete: action.payload };

    case "SET_ANALYSIS_ID":
      return { ...state, analysisId: action.payload };

    case "SET_TASK_RESULTS":
      return { ...state, taskResults: action.payload };

    case "SET_SHOW_REPORT_MODAL":
      return { ...state, showReportModal: action.payload };

    case "SET_ADVANCED_SETTINGS":
      return {
        ...state,
        advancedSettings: { ...state.advancedSettings, ...action.payload },
      };

    case "SET_AI_RESPONSE":
      return { ...state, aiResponse: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "CLEAR_ANALYSIS_DATA":
      return {
        ...state,
        analysisReport: "",
        analysisId: null,
        isAnalysisComplete: false,
        isManualMode: false,
        textInput: "",
        catalogResult: null,
        error: null,
        taskResults: {},
      };

    case "ENABLE_MANUAL_MODE":
      return {
        ...state,
        analysisId: null,
        isManualMode: true,
        isAnalysisComplete:
          state.analysisReport.trim().length > MIN_TEXT_LENGTH,
      };

    case "LOAD_SEVEN_STATIONS":
      return {
        ...state,
        analysisReport: action.payload.finalReport,
        textInput: action.payload.originalText,
        isAnalysisComplete: true,
      };

    case "LOAD_SESSION_ANALYSIS":
      return {
        ...state,
        analysisReport: action.payload.report,
        analysisId: action.payload.id,
        isAnalysisComplete: true,
      };

    default:
      return state;
  }
}

// ============================================
// الهوك الرئيسي
// ============================================

/**
 * هوك إدارة التطوير الإبداعي
 *
 * يوفر جميع الوظائف والحالات اللازمة لصفحة التطوير الإبداعي
 * بما في ذلك إدارة المدخلات، معالجة الطلبات، وعرض النتائج
 *
 * @returns كائن يحتوي على الحالة والإجراءات
 */
export function useCreativeDevelopment() {
  const [state, dispatch] = useReducer(
    creativeDevelopmentReducer,
    initialState
  );
  const { toast } = useToast();

  // ============================================
  // تحميل البيانات المحفوظة
  // ============================================

  useEffect(() => {
    loadSavedAnalysisData();
  }, []);

  /**
   * تحميل بيانات التحليل المحفوظة من localStorage أو sessionStorage
   * يتحقق أولاً من وجود تحليل المحطات السبع ثم من الجلسة
   */
  const loadSavedAnalysisData = useCallback(() => {
    // التحقق من بيانات المحطات السبع
    const sevenStationsData = localStorage.getItem("sevenStationsAnalysis");
    if (sevenStationsData) {
      try {
        const analysisData = JSON.parse(
          sevenStationsData
        ) as SevenStationsAnalysis;
        if (analysisData.finalReport && analysisData.originalText) {
          dispatch({ type: "LOAD_SEVEN_STATIONS", payload: analysisData });

          toast({
            title: "تم استيراد التقرير من نظام المحطات السبع",
            description: `مستوى الثقة: ${(analysisData.confidence * 100).toFixed(1)}%`,
          });

          localStorage.removeItem("sevenStationsAnalysis");
          return;
        }
      } catch (error) {
        console.warn("Failed to restore seven stations analysis", error);
      }
    }

    // التحقق من بيانات الجلسة
    const storedAnalysis = sessionStorage.getItem("stationAnalysisResults");
    const storedId = sessionStorage.getItem("analysisId");

    if (storedAnalysis && storedId) {
      try {
        const analysisData = JSON.parse(storedAnalysis) as {
          stationOutputs?: { station7?: unknown };
        };
        if (analysisData.stationOutputs?.station7) {
          dispatch({
            type: "LOAD_SESSION_ANALYSIS",
            payload: {
              report: JSON.stringify(
                analysisData.stationOutputs.station7,
                null,
                2
              ),
              id: storedId,
            },
          });
          return;
        }
      } catch (error) {
        console.warn("Failed to restore station session analysis", error);
      }
    }

    void loadRemoteAppState<AnalysisSnapshot>("analysis")
      .then((snapshot) => {
        if (!snapshot) {
          return;
        }

        const report = snapshot.results?.["7"];
        if (report && snapshot.analysisId) {
          dispatch({
            type: "LOAD_SESSION_ANALYSIS",
            payload: {
              report: JSON.stringify(report, null, 2),
              id: snapshot.analysisId,
            },
          });
        }

        if (snapshot.text && !state.textInput) {
          dispatch({ type: "SET_TEXT_INPUT", payload: snapshot.text });
        }
      })
      .catch(() => { /* empty */ });

    // التحقق من النص الأصلي المحفوظ
    const storedText = sessionStorage.getItem("originalText");
    if (storedText && !state.textInput) {
      dispatch({ type: "SET_TEXT_INPUT", payload: storedText });
    }

    // استعادة المسودة المحفوظة كملاذ أخير
    if (!state.textInput && !state.analysisReport) {
      try {
        const draft = sessionStorage.getItem("development_draft");
        if (draft) {
          const parsed = JSON.parse(draft) as {
            textInput?: string;
            analysisReport?: string;
            specialRequirements?: string;
            additionalInfo?: string;
            ts?: number;
          };
          // لا تستعيد مسودات أقدم من 24 ساعة
          if (parsed.ts && Date.now() - parsed.ts < 86_400_000) {
            if (parsed.textInput) {
              dispatch({ type: "SET_TEXT_INPUT", payload: parsed.textInput });
            }
            if (parsed.analysisReport) {
              dispatch({
                type: "SET_ANALYSIS_REPORT",
                payload: parsed.analysisReport,
              });
            }
            if (parsed.specialRequirements) {
              dispatch({
                type: "SET_SPECIAL_REQUIREMENTS",
                payload: parsed.specialRequirements,
              });
            }
            if (parsed.additionalInfo) {
              dispatch({
                type: "SET_ADDITIONAL_INFO",
                payload: parsed.additionalInfo,
              });
            }
            toast({
              title: "تم استعادة المسودة",
              description: "تم استعادة المدخلات من الجلسة السابقة",
            });
          }
        }
      } catch {
        // corrupt draft — ignore
      }
    }
  }, [toast, state.textInput, state.analysisReport]);

  // ============================================
  // تحديث حالة اكتمال التحليل
  // ============================================

  useEffect(() => {
    // الأدوات تُفتح عند وجود تقرير تحليل كافٍ أو نص أصلي كافٍ بدون تقرير
    // هذا يمنع حجب الأدوات عن المستخدمين الجدد الذين لم يمروا بمسار التحليل
    const hasReport = state.analysisReport.trim().length > MIN_TEXT_LENGTH;
    const hasDirectText = state.textInput.trim().length > MIN_TEXT_LENGTH;
    const isComplete = hasReport || hasDirectText;
    if (isComplete !== state.isAnalysisComplete) {
      dispatch({ type: "SET_ANALYSIS_COMPLETE", payload: isComplete });
    }
  }, [state.analysisReport, state.textInput, state.isAnalysisComplete]);

  // ============================================
  // الإجراءات
  // ============================================

  /**
   * تحديد المهمة المختارة (المسار الكلاسيكي — 14 مهمة)
   * يعيد ضبط الحالات المرتبطة عند التغيير
   */
  const handleTaskSelect = useCallback((task: CreativeTaskType) => {
    dispatch({ type: "SET_SELECTED_TASK", payload: task });
  }, []);

  /**
   * تحديد المهمة المختارة من كتالوج 27 مهمة
   * يمسح نتيجة الكتالوج السابقة عند التغيير
   */
  const handleCatalogTaskSelect = useCallback((taskId: string) => {
    dispatch({ type: "SET_SELECTED_CATALOG_TASK", payload: taskId });
  }, []);

  /**
   * تبديل تحسين الإكمال
   */
  const handleToggleEnhancement = useCallback(
    (enhancementId: CreativeTaskType) => {
      dispatch({ type: "TOGGLE_ENHANCEMENT", payload: enhancementId });
    },
    []
  );

  /**
   * مسح بيانات التحليل
   */
  const clearAnalysisData = useCallback(() => {
    sessionStorage.removeItem("stationAnalysisResults");
    sessionStorage.removeItem("analysisId");
    sessionStorage.removeItem("originalText");
    dispatch({ type: "CLEAR_ANALYSIS_DATA" });
  }, []);

  /**
   * تحديث إعدادات الذكاء الاصطناعي
   */
  const updateAdvancedSettings = useCallback(
    (settings: Partial<AdvancedAISettings>) => {
      dispatch({ type: "SET_ADVANCED_SETTINGS", payload: settings });
    },
    []
  );

  /**
   * معالجة محتوى الملف المحمل
   */
  const handleFileContent = useCallback(
    (content: string, _filename: string) => {
      dispatch({ type: "SET_TEXT_INPUT", payload: content });
      toast({
        title: "تم تحميل الملف",
        description: "تم استيراد محتوى الملف بنجاح",
      });
    },
    [toast]
  );

  // ============================================
  // محول التنفيذ (ExecutionAdapter) — T017 + T017a
  // ============================================

  /**
   * بناء هدف سير عمل من خطوة واحدة
   */
  const buildSingleStepWorkflow = useCallback(
    (task: DevelopmentTaskDefinition): WorkflowTaskTarget => ({
      type: "custom-workflow",
      name: task.nameAr,
      description: task.description,
      steps: [{ id: task.finalStepId, agentId: task.id, taskType: task.id }],
    }),
    []
  );

  /**
   * تنفيذ مهمة من كتالوج المهام الكامل (T017 + T017a)
   *
   * المسارات بالأولوية:
   *   1. POST /api/development/execute  — مسار مباشر عبر Gemini (لا يحتاج backend)
   *   2. POST /api/brainstorm           — مسار بديل للأوضاع brainstorm
   *   3. POST /api/workflow/execute-custom — مسار بديل للأوضاع workflow
   *
   * بعد نجاح التنفيذ: يُطبِّع النتيجة ويُحدِّث الحالة مباشرةً.
   * عند الفشل: يُظهر رسالة خطأ محددة دون مسح المدخلات.
   */
  const executeTask = useCallback(
    async (taskId: string): Promise<unknown> => {
      const task = getTaskById(taskId);
      if (!task) {
        dispatch({
          type: "SET_ERROR",
          payload: `المهمة "${taskId}" غير موجودة في الكتالوج`,
        });
        return null;
      }

      if (!state.textInput.trim() || state.textInput.trim().length < 20) {
        dispatch({
          type: "SET_ERROR",
          payload: "يرجى إدخال نص درامي (20 حرف على الأقل) قبل تنفيذ المهمة",
        });
        return null;
      }

      const effectiveCompletionScope =
        task.id === "completion"
          ? state.completionScope.trim() ||
            "إكمال المقطع الحالي بشكل متسق مع النص المتاح"
          : "";

      const mergedSpecialRequirements = [
        state.specialRequirements.trim(),
        task.id === "completion"
          ? `نطاق الإكمال المطلوب: ${effectiveCompletionScope}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      dispatch({ type: "SET_ERROR", payload: null });
      dispatch({ type: "SET_LOADING", payload: true });
      logger.info("[development][execute-start]", {
        taskId: task.id,
        mode: task.executionMode,
      });

      try {
        let rawPayload: Record<string, unknown> | null = null;

        // --- المسار الأول: Gemini مباشر (لا يحتاج backend) ---
        try {
          const directResponse = await fetch("/api/development/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              taskId: task.id,
              taskName: task.nameAr,
              originalText: state.textInput,
              analysisReport: state.analysisReport || undefined,
              specialRequirements: mergedSpecialRequirements || undefined,
              additionalInfo: state.additionalInfo || undefined,
            }),
          });

          if (directResponse.ok) {
            const directData = (await directResponse
              .json()
              .catch(() => null)) as Record<string, unknown> | null;
            if (directData?.success && directData.result) {
              rawPayload = directData.result as Record<string, unknown>;
            }
          }
        } catch {
          // المسار المباشر فشل — ننتقل للمسار البديل
        }

        // --- المسار البديل: brainstorm أو workflow (يحتاج backend) ---
        if (!rawPayload) {
          let response: Response;

          if (task.executionMode === "brainstorm") {
            const enhancementAgentIds =
              task.id === "completion"
                ? state.selectedCompletionEnhancements
                    .map((enhancement) => TASK_TO_BACKEND_AGENT_ID[enhancement])
                    .filter((agentId): agentId is string => Boolean(agentId))
                : [];
            const targetAgentIds = Array.from(
              new Set([task.id, ...enhancementAgentIds])
            );

            const parts = [
              `نوع المهمة: ${task.nameAr}`,
              `التوجيه الخاص: ${mergedSpecialRequirements || "بدون توجيه خاص"}`,
              state.additionalInfo
                ? `معلومات إضافية: ${state.additionalInfo}`
                : "",
              "النص الأصلي:",
              state.textInput,
            ].filter(Boolean);

            response = await fetch("/api/brainstorm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({
                task: parts.join("\n\n"),
                context: {
                  brief: [
                    state.analysisReport
                      ? `تقرير التحليل:\n${state.analysisReport}`
                      : "",
                    state.additionalInfo
                      ? `معلومات داعمة:\n${state.additionalInfo}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join("\n\n"),
                  phase: 3,
                  sessionId: state.analysisId ?? `development-${Date.now()}`,
                },
                agentIds: targetAgentIds,
              }),
            });
          } else {
            const workflowConfig: WorkflowTaskTarget =
              task.executionMode === "workflow-single"
                ? buildSingleStepWorkflow(task)
                : (task.backendTarget as WorkflowTaskTarget);

            const workflowContext = {
              originalText: state.textInput,
              analysisReport: state.analysisReport,
              analysisId: state.analysisId,
              specialRequirements: mergedSpecialRequirements,
              additionalInfo: state.additionalInfo,
            };

            const workflowOptions = {
              advancedSettings: state.advancedSettings,
              completionScope: effectiveCompletionScope || undefined,
              selectedCompletionEnhancements:
                state.selectedCompletionEnhancements,
            };

            response = await fetch("/api/workflow/execute-custom", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({
                config: workflowConfig,
                input: {
                  input: state.textInput,
                  text: state.textInput,
                  context: workflowContext,
                  options: workflowOptions,
                  originalText: state.textInput,
                  analysisReport: state.analysisReport,
                  analysisId: state.analysisId,
                  specialRequirements: mergedSpecialRequirements,
                  additionalInfo: state.additionalInfo,
                  advancedSettings: state.advancedSettings,
                },
              }),
            });
          }

          const backendData = (await response
            .json()
            .catch(() => null)) as Record<string, unknown> | null;

          if (response.ok && backendData) {
            rawPayload = backendData;
          }
        }

        if (!rawPayload) {
          dispatch({
            type: "SET_ERROR",
            payload: `فشل تنفيذ "${task.nameAr}". تحقق من إعدادات GEMINI_API_KEY أو اتصال الخادم.`,
          });
          logger.error("[development][execute-no-payload]", {
            taskId: task.id,
            mode: task.executionMode,
          });
          return null;
        }

        // --- تطبيع النتيجة وتحديث الحالة ---
        const normalized = normalizeResult(rawPayload, task);

        const finalText =
          normalized.finalText || normalized.aiResponse.text || "";

        if (!finalText.trim()) {
          dispatch({
            type: "SET_ERROR",
            payload: `نُفِّذت المهمة "${task.nameAr}" لكن لم تُرجع أي محتوى.`,
          });
          logger.warn("[development][execute-empty-output]", {
            taskId: task.id,
            mode: task.executionMode,
          });
          return null;
        }

        // بناء نتيجة المهمة في خريطة التقارير
        const newTaskResult: TaskResults = {
          [task.id]: {
            agentName: task.nameAr,
            agentId: task.id,
            text: finalText,
            confidence: normalized.aiResponse.confidence ?? 0.85,
            timestamp: new Date().toISOString(),
          },
        };

        // إطلاق حدث مدمج: يُحدِّث catalogResult + taskResults في آنٍ واحد
        dispatch({
          type: "SET_CATALOG_RESULT",
          payload: {
            aiResponse: {
              ...normalized.aiResponse,
              text: finalText,
              raw: normalized.aiResponse.raw,
            },
            taskResults: {
              ...state.taskResults,
              ...newTaskResult,
              ...normalized.taskResults,
            },
          },
        });

        toast({
          title: `✅ ${task.nameAr}`,
          description: "تم التنفيذ بنجاح — النتيجة متاحة أدناه",
        });
        logger.info("[development][execute-success]", {
          taskId: task.id,
          mode: task.executionMode,
        });

        return normalized;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "فشل الاتصال بالخادم. يرجى المحاولة مرة أخرى.";
        dispatch({
          type: "SET_ERROR",
          payload: message,
        });
        logger.error("[development][execute-runtime-error]", {
          taskId: task.id,
          mode: task.executionMode,
          message,
        });
        return null;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [state, buildSingleStepWorkflow, toast]
  );

  /**
   * إرسال الطلب للذكاء الاصطناعي (المسار الكلاسيكي — 14 مهمة)
   * يتحقق من صحة المدخلات ويرسل الطلب
   */
  const handleSubmit = useCallback(async () => {
    // التحقق من صحة المدخلات
    const validationResult = submitInputSchema.safeParse({
      textInput: state.textInput,
      selectedTask: state.selectedTask,
      completionScope: state.completionScope,
    });

    if (!validationResult.success) {
      const errorMessage =
        validationResult.error.errors[0]?.message ?? "يرجى التحقق من المدخلات";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      return;
    }

    if (!state.selectedTask || state.textInput.length < MIN_TEXT_LENGTH) {
      dispatch({
        type: "SET_ERROR",
        payload: "يرجى اختيار مهمة وإدخال نص لا يقل عن 100 حرف",
      });
      return;
    }

    if (
      TASKS_REQUIRING_COMPLETION_SCOPE.includes(state.selectedTask) &&
      !state.completionScope.trim()
    ) {
      dispatch({
        type: "SET_ERROR",
        payload: `لهذه المهمة (${CREATIVE_TASK_LABELS[state.selectedTask]}), يرجى تحديد "نطاق الإكمال المطلوب"`,
      });
      return;
    }

    dispatch({ type: "SET_ERROR", payload: null });
    dispatch({ type: "SET_AI_RESPONSE", payload: null });
    dispatch({ type: "SET_LOADING", payload: true });

    // بناء الطلب
    const processedFile: ProcessedInputFile = {
      fileName: "input.txt",
      textContent: state.textInput,
      size: state.textInput.length,
      sizeBytes: state.textInput.length,
    };

    const requestOptions: AIRequestData["options"] = {
      additionalInfo: state.additionalInfo,
      analysisReport: state.analysisReport,
      analysisId: state.analysisId,
    };

    if (TASKS_REQUIRING_COMPLETION_SCOPE.includes(state.selectedTask)) {
      requestOptions.completionScope = state.completionScope;
    }

    if (state.selectedTask === CreativeTaskType.COMPLETION) {
      requestOptions.selectedCompletionEnhancements =
        state.selectedCompletionEnhancements;
    }

    const request: AIRequestData = {
      agent: state.selectedTask,
      prompt: state.specialRequirements,
      context: {
        files: [processedFile],
      },
      options: requestOptions,
    };

    try {
      const primaryAgentId = TASK_TO_BACKEND_AGENT_ID[state.selectedTask];
      if (!primaryAgentId) {
        throw new Error("المهمة المختارة غير مدعومة حالياً في الباك إند");
      }

      const completionAgentIds =
        state.selectedTask === CreativeTaskType.COMPLETION
          ? state.selectedCompletionEnhancements
              .map((task) => TASK_TO_BACKEND_AGENT_ID[task])
              .filter((id): id is string => Boolean(id))
          : [];

      const agentIds = Array.from(
        new Set([primaryAgentId, ...completionAgentIds])
      );

      const taskPromptParts = [
        `نوع المهمة: ${CREATIVE_TASK_LABELS[state.selectedTask]}`,
        `التوجيه الخاص: ${request.prompt || "بدون توجيه خاص"}`,
        state.completionScope
          ? `نطاق الإكمال المطلوب: ${state.completionScope}`
          : "",
        state.additionalInfo ? `معلومات إضافية: ${state.additionalInfo}` : "",
        "النص الأصلي:",
        request.context.files[0]?.textContent ?? "",
      ].filter(Boolean);

      const debatePayload: BrainstormDebatePayload = {
        task: taskPromptParts.join("\n\n"),
        context: {
          brief: [
            state.analysisReport
              ? `تقرير التحليل:\n${state.analysisReport}`
              : "",
            state.additionalInfo
              ? `معلومات داعمة:\n${state.additionalInfo}`
              : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
          phase: 3,
          sessionId: state.analysisId ?? `development-${Date.now()}`,
        },
        agentIds,
      };

      const response = await fetch("/api/brainstorm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(debatePayload),
      });

      const payload = (await response
        .json()
        .catch(() => null)) as BrainstormDebateResponse | null;

      if (!response.ok || !payload?.success) {
        const errorMsg =
          payload?.error ??
          `فشل تنفيذ المهمة عبر الباك إند (رمز الحالة: ${response.status})`;
        throw new Error(errorMsg);
      }

      const finalText =
        payload.result?.finalDecision?.trim() ??
        payload.result?.judgeReasoning?.trim() ??
        payload.result?.proposals
          ?.map((proposal) => proposal.proposal)
          .filter(Boolean)
          .join("\n\n") ??
        "لم يتم إرجاع محتوى من الباك إند";

      const result: AIResponseData = {
        text: finalText,
        raw: finalText,
        confidence: payload.result?.consensus ? 0.9 : 0.7,
        metadata: {
          consensus: payload.result?.consensus,
          proposalsCount: payload.result?.proposals?.length ?? 0,
          selectedAgents: agentIds,
        },
      };

      dispatch({
        type: "SET_AI_RESPONSE",
        payload: result,
      });

      toast({
        title: "تم التحليل بنجاح",
        description: "تم إكمال المهمة عبر الباك إند بنجاح",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع أثناء الإرسال";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      toast({
        variant: "destructive",
        title: "خطأ في التحليل",
        description: errorMessage,
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [state, toast]);

  /**
   * تصدير التقرير كملف نصي
   */
  const exportReport = useCallback(() => {
    if (!state.aiResponse) return;

    const blob = new Blob([toText(state.aiResponse.raw)], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.selectedTask ?? "result"}_report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.aiResponse, state.selectedTask]);

  /**
   * عرض modal التقرير
   */
  const showReport = useCallback(() => {
    dispatch({
      type: "SET_SHOW_REPORT_MODAL",
      payload: state.selectedTask ?? "result",
    });
  }, [state.selectedTask]);

  /**
   * إغلاق modal التقرير
   */
  const closeReport = useCallback(() => {
    dispatch({ type: "SET_SHOW_REPORT_MODAL", payload: null });
  }, []);

  // ============================================
  // التبديل إلى الوضع اليدوي
  // ============================================

  /**
   * تفعيل الوضع اليدوي — يلغي ربط analysisId ويتيح التعديل الحر
   * مع الاحتفاظ بالبيانات المحمّلة كنقطة انطلاق
   */
  const enableManualMode = useCallback(() => {
    dispatch({ type: "ENABLE_MANUAL_MODE" });
    toast({
      title: "الوضع اليدوي",
      description: "يمكنك الآن تعديل النص وتقرير التحليل بحرية",
    });
  }, [toast]);

  // ============================================
  // حفظ المسودة تلقائيًا
  // ============================================

  useEffect(() => {
    if (!state.textInput && !state.analysisReport) return;
    try {
      sessionStorage.setItem(
        "development_draft",
        JSON.stringify({
          textInput: state.textInput,
          analysisReport: state.analysisReport,
          specialRequirements: state.specialRequirements,
          additionalInfo: state.additionalInfo,
          ts: Date.now(),
        })
      );
    } catch {
      // quota exceeded — non-critical
    }
  }, [
    state.textInput,
    state.analysisReport,
    state.specialRequirements,
    state.additionalInfo,
  ]);

  // ============================================
  // حالة الفتح/القفل المحسوبة
  // ============================================

  const unlockStatus: UnlockStatus = (() => {
    const reportLen = state.analysisReport.trim().length;
    const textLen = state.textInput.trim().length;

    // الأدوات مفتوحة عند وجود تقرير تحليل كافٍ أو نص أصلي كافٍ مباشرة
    if (state.isAnalysisComplete) {
      return {
        locked: false,
        reason: "ready" as const,
        reportLength: reportLen,
        minRequired: MIN_TEXT_LENGTH,
        progress: 100,
      };
    }

    // حساب التقدم بناءً على أيٍّ من الحقلين الأقرب للاكتمال
    const bestLen = Math.max(reportLen, textLen);
    const progress = Math.min(
      100,
      Math.round((bestLen / MIN_TEXT_LENGTH) * 100)
    );

    if (bestLen === 0) {
      return {
        locked: true,
        reason: "no-report" as const,
        reportLength: 0,
        minRequired: MIN_TEXT_LENGTH,
        progress: 0,
      };
    }
    return {
      locked: true,
      reason: "short-report" as const,
      reportLength: bestLen,
      minRequired: MIN_TEXT_LENGTH,
      progress,
    };
  })();

  // ============================================
  // دوال المساعدة
  // ============================================

  /**
   * الحصول على تقرير الوكيل للعرض
   */
  const getAgentReport = useCallback(() => {
    if (!state.aiResponse) return null;

    return {
      agentName: state.selectedTask
        ? CREATIVE_TASK_LABELS[state.selectedTask]
        : "التقرير",
      agentId: state.selectedTask ?? "unknown",
      text: toText(state.aiResponse.raw),
      confidence: 1.0,
      timestamp: new Date().toISOString(),
    };
  }, [state.aiResponse, state.selectedTask]);

  /**
   * تنفيذ المهمة المختارة من الكتالوج (selectedCatalogTaskId)
   * مختصر مناسب للاستخدام مع زر "تنفيذ" في واجهة الكتالوج
   */
  const handleCatalogSubmit = useCallback(async () => {
    if (!state.selectedCatalogTaskId) return;
    await executeTask(state.selectedCatalogTaskId);
  }, [state.selectedCatalogTaskId, executeTask]);

  // ============================================
  // القيم المرجعة
  // ============================================

  return {
    // الحالة
    ...state,

    // الثوابت
    creativeTasks: Object.keys(CREATIVE_TASK_LABELS) as CreativeTaskType[],
    taskLabels: CREATIVE_TASK_LABELS,
    tasksRequiringScope: TASKS_REQUIRING_COMPLETION_SCOPE,
    completionEnhancements: COMPLETION_ENHANCEMENT_OPTIONS,

    // تحديث المدخلات
    setTextInput: (value: string) =>
      dispatch({ type: "SET_TEXT_INPUT", payload: value }),
    setSpecialRequirements: (value: string) =>
      dispatch({ type: "SET_SPECIAL_REQUIREMENTS", payload: value }),
    setAdditionalInfo: (value: string) =>
      dispatch({ type: "SET_ADDITIONAL_INFO", payload: value }),
    setCompletionScope: (value: string) =>
      dispatch({ type: "SET_COMPLETION_SCOPE", payload: value }),
    setAnalysisReport: (value: string) =>
      dispatch({ type: "SET_ANALYSIS_REPORT", payload: value }),

    // حالة الفتح/القفل
    unlockStatus,

    // الإجراءات
    handleTaskSelect,
    handleCatalogTaskSelect,
    handleCatalogSubmit,
    handleToggleEnhancement,
    handleSubmit,
    executeTask,
    handleFileContent,
    clearAnalysisData,
    enableManualMode,
    updateAdvancedSettings,
    exportReport,
    showReport,
    closeReport,
    getAgentReport,
  };
}

export default useCreativeDevelopment;
