/**
 * @fileoverview Hook مخصص لإدارة حالة استوديو التصوير السينمائي
 *
 * هذا الـ Hook يوفر واجهة موحدة لإدارة جميع حالات الاستوديو
 * بما في ذلك المرحلة الحالية، الأداة النشطة، والمود البصري.
 * يستخدم useReducer للتعامل مع الحالات المعقدة بشكل أفضل.
 *
 * @module cinematography-studio/hooks/useCinematographyStudio
 */

"use client";

import { useReducer, useCallback, useMemo } from "react";
import type {
  Phase,
  TabValue,
  VisualMood,
  ViewMode,
  CineStudioState,
} from "../types";
import {
  TAB_VALUE_BY_PHASE,
  PHASE_BY_TAB,
  isValidTabValue,
  isValidVisualMood,
} from "../types";

// ============================================
// أنواع الإجراءات
// ============================================

/**
 * أنواع الإجراءات المتاحة لتحديث حالة الاستوديو
 */
type StudioAction =
  | { type: "SET_PHASE"; payload: Phase }
  | { type: "SET_VISUAL_MOOD"; payload: VisualMood }
  | { type: "SET_ACTIVE_TOOL"; payload: string | null }
  | { type: "SET_ACTIVE_VIEW"; payload: ViewMode }
  | { type: "RESET_TOOL" }
  | { type: "NAVIGATE_TO_PHASE"; payload: { phase: Phase; view: ViewMode } };

// ============================================
// الحالة الابتدائية
// ============================================

/**
 * الحالة الابتدائية للاستوديو
 * تُستخدم عند تهيئة الـ Hook لأول مرة
 */
const initialState: CineStudioState = {
  currentPhase: "pre",
  visualMood: "noir",
  activeTool: null,
  activeView: "dashboard",
};

// ============================================
// المخفض (Reducer)
// ============================================

/**
 * مخفض حالة الاستوديو
 * يتعامل مع جميع الإجراءات ويعيد الحالة الجديدة
 *
 * @param state - الحالة الحالية
 * @param action - الإجراء المراد تنفيذه
 * @returns الحالة الجديدة بعد تطبيق الإجراء
 */
function studioReducer(
  state: CineStudioState,
  action: StudioAction
): CineStudioState {
  switch (action.type) {
    case "SET_PHASE":
      return {
        ...state,
        currentPhase: action.payload,
      };

    case "SET_VISUAL_MOOD":
      return {
        ...state,
        visualMood: action.payload,
      };

    case "SET_ACTIVE_TOOL":
      return {
        ...state,
        activeTool: action.payload,
      };

    case "SET_ACTIVE_VIEW":
      return {
        ...state,
        activeView: action.payload,
      };

    case "RESET_TOOL":
      return {
        ...state,
        activeTool: null,
      };

    case "NAVIGATE_TO_PHASE":
      return {
        ...state,
        currentPhase: action.payload.phase,
        activeView: action.payload.view,
      };

    default:
      return state;
  }
}

// ============================================
// الـ Hook الرئيسي
// ============================================

/**
 * Hook مخصص لإدارة حالة استوديو التصوير السينمائي
 *
 * يوفر هذا الـ Hook:
 * - إدارة مركزية لحالة الاستوديو
 * - دوال محسنة للأداء لتحديث الحالة
 * - قيم محسوبة مشتقة من الحالة
 * - تحقق من صحة البيانات قبل التحديث
 *
 * @example
 * ```tsx
 * const {
 *   state,
 *   setPhase,
 *   setVisualMood,
 *   openTool,
 *   closeTool,
 *   currentTabValue
 * } = useCinematographyStudio();
 * ```
 *
 * @returns كائن يحتوي على الحالة والدوال المساعدة
 */
export function useCinematographyStudio() {
  const [state, dispatch] = useReducer(studioReducer, initialState);

  // ============================================
  // دوال تحديث الحالة (محسنة للأداء)
  // ============================================

  /**
   * تعيين مرحلة الإنتاج الحالية
   *
   * @param phase - المرحلة الجديدة
   */
  const setPhase = useCallback((phase: Phase) => {
    dispatch({ type: "SET_PHASE", payload: phase });
  }, []);

  /**
   * تعيين المود البصري للمشروع
   *
   * @param mood - المود البصري الجديد
   */
  const setVisualMood = useCallback((mood: string) => {
    if (isValidVisualMood(mood)) {
      dispatch({ type: "SET_VISUAL_MOOD", payload: mood });
    }
  }, []);

  /**
   * فتح أداة محددة
   *
   * @param toolId - معرف الأداة
   */
  const openTool = useCallback((toolId: string) => {
    dispatch({ type: "SET_ACTIVE_TOOL", payload: toolId });
  }, []);

  /**
   * إغلاق الأداة الحالية والعودة للوحة التحكم
   */
  const closeTool = useCallback(() => {
    dispatch({ type: "RESET_TOOL" });
  }, []);

  /**
   * تغيير طريقة العرض
   *
   * @param view - طريقة العرض الجديدة
   */
  const setActiveView = useCallback((view: ViewMode) => {
    dispatch({ type: "SET_ACTIVE_VIEW", payload: view });
  }, []);

  /**
   * الانتقال إلى مرحلة محددة مع تغيير العرض
   *
   * @param phase - المرحلة المراد الانتقال إليها
   */
  const navigateToPhase = useCallback((phase: Phase) => {
    dispatch({
      type: "NAVIGATE_TO_PHASE",
      payload: { phase, view: "phases" },
    });
  }, []);

  /**
   * معالجة تغيير علامة التبويب
   *
   * @param value - قيمة علامة التبويب الجديدة
   */
  const handleTabChange = useCallback((value: string) => {
    if (isValidTabValue(value)) {
      const phase = PHASE_BY_TAB[value];
      dispatch({ type: "SET_PHASE", payload: phase });
    }
  }, []);

  // ============================================
  // قيم محسوبة (مشتقة من الحالة)
  // ============================================

  /**
   * قيمة علامة التبويب الحالية بناءً على المرحلة
   */
  const currentTabValue = useMemo((): TabValue => {
    return TAB_VALUE_BY_PHASE[state.currentPhase];
  }, [state.currentPhase]);

  /**
   * التحقق من وجود أداة نشطة
   */
  const hasActiveTool = useMemo((): boolean => {
    return state.activeTool !== null;
  }, [state.activeTool]);

  /**
   * التحقق من كون العرض الحالي هو لوحة التحكم
   */
  const isDashboardView = useMemo((): boolean => {
    return state.activeView === "dashboard";
  }, [state.activeView]);

  /**
   * التحقق من كون العرض الحالي هو المراحل
   */
  const isPhasesView = useMemo((): boolean => {
    return state.activeView === "phases";
  }, [state.activeView]);

  // ============================================
  // القيمة المُرجعة
  // ============================================

  return {
    // الحالة الحالية
    state,

    // خصائص مباشرة من الحالة
    currentPhase: state.currentPhase,
    visualMood: state.visualMood,
    activeTool: state.activeTool,
    activeView: state.activeView,

    // دوال تحديث الحالة
    setPhase,
    setVisualMood,
    openTool,
    closeTool,
    setActiveView,
    navigateToPhase,
    handleTabChange,

    // قيم محسوبة
    currentTabValue,
    hasActiveTool,
    isDashboardView,
    isPhasesView,
  };
}

export default useCinematographyStudio;
