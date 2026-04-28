/**
 * @description مُختزل حالة التطوير الإبداعي.
 * دالة خالصة بلا آثار جانبية — تقبل الحالة الحالية والإجراء وتُعيد الحالة الجديدة.
 */

import {
  type ActionType,
  type CreativeDevelopmentState,
  MIN_TEXT_LENGTH,
  TASKS_REQUIRING_COMPLETION_SCOPE,
} from "./creative-development-types";

/**
 * مُختزل حالة التطوير الإبداعي
 * يدير جميع تحديثات الحالة بطريقة مركزية
 */
export function creativeDevelopmentReducer(
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
          action.payload !== "completion"
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
