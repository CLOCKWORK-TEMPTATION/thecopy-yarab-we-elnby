/**
 * @fileoverview هوك مخصص لإدارة حالة التطوير الإبداعي
 *
 * يفصل هذا الهوك منطق إدارة الحالة عن المكون الرسومي
 * لتسهيل الاختبار والصيانة
 *
 * @module development/hooks/useCreativeDevelopment
 */

import { useCallback, useEffect, useReducer, useRef } from "react";

import { toText } from "@/ai/gemini-core";
import { useToast } from "@/hooks/use-toast";

import { CreativeTaskType, CREATIVE_TASK_LABELS } from "../types";

import { executeTaskImpl } from "./creative-development-execute-impl";
import { creativeDevelopmentReducer } from "./creative-development-reducer";
import { loadSavedAnalysisDataImpl } from "./creative-development-storage";
import { handleSubmitImpl } from "./creative-development-submit-impl";
import {
  TASKS_REQUIRING_COMPLETION_SCOPE,
  COMPLETION_ENHANCEMENT_OPTIONS,
  MIN_TEXT_LENGTH,
  initialState,
  type CreativeDevelopmentState,
  type UnlockStatus,
} from "./creative-development-types";

export type { UnlockStatus };

function computeUnlockStatus(
  isAnalysisComplete: boolean,
  analysisReport: string,
  textInput: string
): UnlockStatus {
  const reportLen = analysisReport.trim().length;
  const textLen = textInput.trim().length;

  if (isAnalysisComplete) {
    return {
      locked: false,
      reason: "ready" as const,
      reportLength: reportLen,
      minRequired: MIN_TEXT_LENGTH,
      progress: 100,
    };
  }

  const bestLen = Math.max(reportLen, textLen);
  const progress = Math.min(100, Math.round((bestLen / MIN_TEXT_LENGTH) * 100));

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
}

type AdvancedSettingsUpdate = Partial<
  CreativeDevelopmentState["advancedSettings"]
>;

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
  const initialTextInputRef = useRef(state.textInput);
  const initialAnalysisReportRef = useRef(state.analysisReport);
  const didLoadSavedAnalysisRef = useRef(false);

  // ============================================
  // تحميل البيانات المحفوظة
  // ============================================

  useEffect(() => {
    if (didLoadSavedAnalysisRef.current) return;
    didLoadSavedAnalysisRef.current = true;

    loadSavedAnalysisDataImpl(
      dispatch,
      initialTextInputRef.current,
      initialAnalysisReportRef.current,
      toast
    );
  }, [toast]);

  // ============================================
  // تحديث حالة اكتمال التحليل
  // ============================================

  useEffect(() => {
    const hasReport = state.analysisReport.trim().length > MIN_TEXT_LENGTH;
    const hasDirectText = state.textInput.trim().length > MIN_TEXT_LENGTH;
    const isComplete = hasReport || hasDirectText;
    if (isComplete !== state.isAnalysisComplete) {
      dispatch({ type: "SET_ANALYSIS_COMPLETE", payload: isComplete });
    }
  }, [state.analysisReport, state.textInput, state.isAnalysisComplete]);

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
  // الإجراءات البسيطة
  // ============================================

  const handleTaskSelect = useCallback((task: CreativeTaskType) => {
    dispatch({ type: "SET_SELECTED_TASK", payload: task });
  }, []);

  const handleCatalogTaskSelect = useCallback((taskId: string) => {
    dispatch({ type: "SET_SELECTED_CATALOG_TASK", payload: taskId });
  }, []);

  const handleToggleEnhancement = useCallback(
    (enhancementId: CreativeTaskType) => {
      dispatch({ type: "TOGGLE_ENHANCEMENT", payload: enhancementId });
    },
    []
  );

  const clearAnalysisData = useCallback(() => {
    sessionStorage.removeItem("stationAnalysisResults");
    sessionStorage.removeItem("analysisId");
    sessionStorage.removeItem("originalText");
    dispatch({ type: "CLEAR_ANALYSIS_DATA" });
  }, []);

  const updateAdvancedSettings = useCallback(
    (settings: AdvancedSettingsUpdate) => {
      dispatch({ type: "SET_ADVANCED_SETTINGS", payload: settings });
    },
    []
  );

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

  const enableManualMode = useCallback(() => {
    dispatch({ type: "ENABLE_MANUAL_MODE" });
    toast({
      title: "الوضع اليدوي",
      description: "يمكنك الآن تعديل النص وتقرير التحليل بحرية",
    });
  }, [toast]);

  // ============================================
  // تنفيذ المهام (تفويض للدوال المستخرجة)
  // ============================================

  const executeTask = useCallback(
    async (taskId: string): Promise<unknown> => {
      return executeTaskImpl(
        {
          taskId,
          textInput: state.textInput,
          completionScope: state.completionScope,
          specialRequirements: state.specialRequirements,
          additionalInfo: state.additionalInfo,
          analysisReport: state.analysisReport,
          analysisId: state.analysisId,
          selectedCompletionEnhancements: state.selectedCompletionEnhancements,
          advancedSettings: state.advancedSettings,
          taskResults: state.taskResults,
        },
        dispatch,
        toast
      );
    },
    [
      state.textInput,
      state.completionScope,
      state.specialRequirements,
      state.additionalInfo,
      state.analysisReport,
      state.analysisId,
      state.selectedCompletionEnhancements,
      state.advancedSettings,
      state.taskResults,
      toast,
    ]
  );

  const handleSubmit = useCallback(async () => {
    return handleSubmitImpl(
      {
        textInput: state.textInput,
        selectedTask: state.selectedTask,
        completionScope: state.completionScope,
        selectedCompletionEnhancements: state.selectedCompletionEnhancements,
        specialRequirements: state.specialRequirements,
        additionalInfo: state.additionalInfo,
        analysisReport: state.analysisReport,
        analysisId: state.analysisId,
        advancedSettings: state.advancedSettings,
      },
      dispatch,
      toast
    );
  }, [
    state.textInput,
    state.selectedTask,
    state.completionScope,
    state.selectedCompletionEnhancements,
    state.specialRequirements,
    state.additionalInfo,
    state.analysisReport,
    state.analysisId,
    state.advancedSettings,
    toast,
  ]);

  // ============================================
  // دوال المساعدة
  // ============================================

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

  const showReport = useCallback(() => {
    dispatch({
      type: "SET_SHOW_REPORT_MODAL",
      payload: state.selectedTask ?? "result",
    });
  }, [state.selectedTask]);

  const closeReport = useCallback(() => {
    dispatch({ type: "SET_SHOW_REPORT_MODAL", payload: null });
  }, []);

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

  const handleCatalogSubmit = useCallback(async () => {
    if (!state.selectedCatalogTaskId) return;
    await executeTask(state.selectedCatalogTaskId);
  }, [state.selectedCatalogTaskId, executeTask]);

  // ============================================
  // حالة الفتح/القفل المحسوبة
  // ============================================

  const unlockStatus: UnlockStatus = computeUnlockStatus(
    state.isAnalysisComplete,
    state.analysisReport,
    state.textInput
  );

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
