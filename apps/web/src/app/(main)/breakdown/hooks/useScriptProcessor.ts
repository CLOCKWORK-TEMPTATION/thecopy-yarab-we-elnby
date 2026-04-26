/**
 * @fileoverview خطاف معالجة السيناريو
 *
 * هذا الخطاف يفصل منطق معالجة السيناريو عن المكون الرئيسي.
 *
 * السبب: نقل المنطق المعقد لمعالجة السيناريو إلى خطاف مخصص
 * يجعل الكود أكثر قابلية للاختبار والصيانة، ويحافظ على
 * مكون App نظيفاً ومركزاً على العرض.
 */

import { useState, useCallback } from "react";

import { logError } from "../config";
import {
  bootstrapBreakdownProject,
  parseBreakdownProject,
} from "../infrastructure/platform-client";
import { validateScriptSegmentResponse } from "../schemas";
import { Scene } from "../types";

/**
 * نوع رسالة الخطأ
 */
interface ScriptError {
  message: string;
  code:
    | "EMPTY_SCRIPT"
    | "API_ERROR"
    | "PARSE_ERROR"
    | "VALIDATION_ERROR"
    | "NO_SCENES";
}

/**
 * نتيجة عملية معالجة السيناريو
 */
interface ProcessResult {
  success: boolean;
  scenes?: Scene[];
  error?: ScriptError;
}

/**
 * حالة الخطاف
 */
interface UseScriptProcessorState {
  /** السيناريو مكتمل المعالجة */
  scenes: Scene[];
  /** حالة التحميل */
  isSegmenting: boolean;
  /** رسالة الخطأ الحالية */
  error: ScriptError | null;
  /** العرض الحالي */
  view: "input" | "results";
}

/**
 * دوال الخطاف
 */
interface UseScriptProcessorActions {
  /** يعالج نص السيناريو ويقسمه إلى مشاهد */
  processScript: (scriptText: string) => Promise<ProcessResult>;
  /** يعيد تعيين الحالة للبدء من جديد */
  reset: () => void;
  /** يمسح رسالة الخطأ */
  clearError: () => void;
}

type UseScriptProcessorReturn = UseScriptProcessorState &
  UseScriptProcessorActions;

/**
 * خطاف معالجة السيناريو
 *
 * يوفر واجهة موحدة لمعالجة نصوص السيناريو وتقسيمها إلى مشاهد.
 * يتولى إدارة حالة التحميل والأخطاء بشكل مركزي.
 *
 * @returns حالة ودوال معالجة السيناريو
 *
 * @example
 * ```tsx
 * const { scenes, isSegmenting, error, processScript, reset } = useScriptProcessor();
 *
 * const handleSubmit = async () => {
 *   const result = await processScript(scriptText);
 *   if (!result.success) {
 *     showToast('error', result.error.message);
 *   }
 * };
 * ```
 */
export function useScriptProcessor(): UseScriptProcessorReturn {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [error, setError] = useState<ScriptError | null>(null);
  const [view, setView] = useState<"input" | "results">("input");

  /**
   * يعالج نص السيناريو
   *
   * السبب: نفصل منطق التحقق والتحويل عن واجهة المستخدم
   * لتسهيل الاختبار ومعالجة الأخطاء بشكل موحد
   */
  const processScript = useCallback(
    async (scriptText: string): Promise<ProcessResult> => {
      // التحقق من النص الفارغ
      if (!scriptText.trim()) {
        const error: ScriptError = {
          message: "الرجاء إدخال نص السيناريو",
          code: "EMPTY_SCRIPT",
        };
        setError(error);
        return { success: false, error };
      }

      setIsSegmenting(true);
      setError(null);

      try {
        // تقسيم السيناريو عبر الباك إند بدلاً من Gemini مباشرة
        const bootstrap = await bootstrapBreakdownProject(scriptText);
        const response = await parseBreakdownProject(
          bootstrap.projectId,
          scriptText
        );

        // التحقق من صحة الاستجابة باستخدام Zod
        const validationResult = validateScriptSegmentResponse(response);

        if (!validationResult.success) {
          const error: ScriptError = {
            message: `خطأ في تنسيق البيانات: ${validationResult.error}`,
            code: "VALIDATION_ERROR",
          };
          logError(
            "useScriptProcessor.processScript",
            new Error(validationResult.error)
          );
          setError(error);
          return { success: false, error };
        }

        const { scenes: rawScenes } = validationResult.data;

        // تحويل المشاهد الخام إلى الشكل المطلوب
        const formattedScenes: Scene[] = rawScenes.map((scene, index) => ({
          id: index + 1,
          header: scene.header,
          content: scene.content,
          isAnalyzed: false,
          versions: [],
        }));

        // التحقق من وجود مشاهد
        if (formattedScenes.length === 0) {
          const error: ScriptError = {
            message:
              "لم يتم اكتشاف أي مشاهد في السيناريو. تأكد من تنسيق السيناريو.",
            code: "NO_SCENES",
          };
          setError(error);
          return { success: false, error };
        }

        setScenes(formattedScenes);
        setView("results");
        return { success: true, scenes: formattedScenes };
      } catch (err) {
        logError("useScriptProcessor.processScript", err);

        const errorMessage =
          err instanceof Error ? err.message : "خطأ غير معروف";
        const error: ScriptError = {
          message: `خطأ في معالجة السيناريو: ${errorMessage}`,
          code: "API_ERROR",
        };

        setError(error);
        return { success: false, error };
      } finally {
        setIsSegmenting(false);
      }
    },
    []
  );

  /**
   * يعيد تعيين الحالة
   */
  const reset = useCallback(() => {
    setView("input");
    setScenes([]);
    setError(null);
  }, []);

  /**
   * يمسح رسالة الخطأ
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    scenes,
    isSegmenting,
    error,
    view,
    processScript,
    reset,
    clearError,
  };
}

export type { ScriptError, ProcessResult, UseScriptProcessorReturn };
