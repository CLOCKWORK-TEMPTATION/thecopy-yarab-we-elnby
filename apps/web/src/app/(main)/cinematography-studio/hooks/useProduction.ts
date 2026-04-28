/**
 * @fileoverview Hook مخصص لإدارة أدوات أثناء التصوير
 *
 * هذا الـ Hook يوفر جميع الوظائف المطلوبة لمرحلة التصوير الفعلي
 * بما في ذلك تحليل اللقطات وإدارة الإعدادات التقنية.
 * يتضمن معالجة الأخطاء والتحقق من صحة البيانات.
 *
 * @module cinematography-studio/hooks/useProduction
 */

"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "react-hot-toast";

import { publishDiagnostics } from "../lib/diagnostics-bus";
import { createLocalShotAnalysis } from "../lib/local-shot-analysis";
import { resolveAnalysisWinner } from "../lib/resolve-analysis-winner";
import { patchSession, readSession } from "../lib/session-storage";
import { postStudioFormData, postStudioJson } from "../lib/studio-route-client";
import { ShotAnalysisSchema } from "../types";

import { useMediaInputPipeline } from "./useMediaInputPipeline";
import {
  initialAnalysisState,
  initialAssistantState,
  ASSISTANT_REQUEST_TIMEOUT_MS,
  defaultTechnicalSettings,
  getRecommendedColorTemp,
} from "./useProduction-constants";
import {
  type AnalysisState,
  type AssistantState,
  type TechnicalSettings,
  type ValidateShotResponse,
  type ChatResponse,
} from "./useProduction-types";
import {
  REMOTE_ANALYSIS_TIMEOUT_MS,
  normalizeShotAnalysis,
} from "./useProduction-utils";

import type { VisualMood } from "../types";

// ============================================
// الـ Hook الرئيسي
// ============================================

/**
 * Hook مخصص لإدارة أدوات أثناء التصوير
 *
 * يوفر هذا الـ Hook:
 * - تحليل اللقطات بالذكاء الاصطناعي
 * - إدارة الإعدادات التقنية للكاميرا
 * - نظام تحذيرات ذكي
 * - معالجة الأخطاء مع إشعارات Toast
 *
 * @example
 * ```tsx
 * const {
 *   analysis,
 *   isAnalyzing,
 *   handleAnalyzeShot,
 *   technicalSettings
 * } = useProduction("noir");
 * ```
 *
 * @param mood - المود البصري للمشروع
 * @returns كائن يحتوي على الحالة والدوال المساعدة
 */
export function useProduction(mood: VisualMood = "noir") {
  // ============================================
  // الحالة
  // ============================================

  const [analysisState, setAnalysisState] =
    useState<AnalysisState>(initialAnalysisState);
  const [assistantState, setAssistantState] = useState<AssistantState>(
    initialAssistantState
  );
  const [technicalSettings, setTechnicalSettings] = useState<TechnicalSettings>(
    defaultTechnicalSettings
  );
  const mediaInput = useMediaInputPipeline("image");
  const persistenceHydrated = useRef(false);

  // استعادة الإعدادات التقنية وآخر تحليل عند أول تركيب — ثم نسمح بالحفظ.
  useEffect(() => {
    if (persistenceHydrated.current) {
      return;
    }
    persistenceHydrated.current = true;
    const persisted = readSession();
    if (!persisted) {
      return;
    }
    if (persisted.technicalSettings) {
      setTechnicalSettings(persisted.technicalSettings);
    }
    if (persisted.lastAnalysis) {
      setAnalysisState((prev) => ({
        ...prev,
        analysis: persisted.lastAnalysis ?? null,
        source: "local-fallback",
      }));
    }
    if (persisted.lastAssistant?.answer) {
      setAssistantState({
        isLoading: false,
        answer: persisted.lastAssistant.answer,
        lastQuestion: persisted.lastAssistant.question ?? null,
        error: null,
      });
    }
  }, []);

  // حفظ الإعدادات التقنية بعد الهيدرة الأولى.
  useEffect(() => {
    if (!persistenceHydrated.current) {
      return;
    }
    patchSession({ technicalSettings });
  }, [technicalSettings]);

  // حفظ آخر تحليل وآخر إجابة مساعد (نص فقط، بدون وسائط).
  useEffect(() => {
    if (!persistenceHydrated.current) {
      return;
    }
    patchSession({ lastAnalysis: analysisState.analysis });
  }, [analysisState.analysis]);

  useEffect(() => {
    if (!persistenceHydrated.current) {
      return;
    }
    patchSession({
      lastAssistant: assistantState.answer
        ? {
            question: assistantState.lastQuestion,
            answer: assistantState.answer,
          }
        : null,
    });
  }, [assistantState.answer, assistantState.lastQuestion]);

  // نشر حالة المساعد لطبقة التشخيص.
  useEffect(() => {
    publishDiagnostics({
      slice: "assistant",
      data: {
        isLoading: assistantState.isLoading,
        lastQuestion: assistantState.lastQuestion,
        answerLength: assistantState.answer?.length ?? 0,
        error: assistantState.error,
      },
    });
  }, [
    assistantState.answer,
    assistantState.error,
    assistantState.isLoading,
    assistantState.lastQuestion,
  ]);

  // عدّاد إعادة التركيب للتشخيص.
  const productionRenderCount = useRef(0);
  productionRenderCount.current += 1;
  useEffect(() => {
    publishDiagnostics({
      slice: "renderCount",
      data: { production: productionRenderCount.current },
    });
  });

  // ============================================
  // دوال التحليل
  // ============================================

  /**
   * تحليل اللقطة الحالية — مسار متوازٍ
   *
   * يبدأ الطلب البعيد والبديل المحلي معًا.
   * إذا عاد البعيد بنتيجة صالحة قبل المهلة يُعتمد.
   * إذا تأخر أو فشل يُثبَّت البديل المحلي فورًا.
   */
  const handleAnalyzeShot = useCallback(
    async (file?: File | null) => {
      const effectiveFile = file ?? mediaInput.state.analysisFile;

      if (!effectiveFile) {
        toast.error(
          "يرجى اختيار صورة أو فيديو أو التقاط إطار من الكاميرا أولاً"
        );
        return;
      }

      setAnalysisState((prev) => ({
        ...prev,
        isAnalyzing: true,
        error: null,
      }));

      toast.loading("جاري المسح الطيفي للقطة...", { id: "analyzing" });

      // تجهيز البديل المحلي بالتوازي من اللحظة الأولى
      const localPromise = createLocalShotAnalysis(effectiveFile, mood)
        .then((analysis) => {
          const validation = ShotAnalysisSchema.safeParse(analysis);
          return validation.success ? validation.data : null;
        })
        .catch(() => null);

      // الطلب البعيد مع مهلة واضحة
      const formData = new FormData();
      formData.set("image", effectiveFile);

      const remotePromise = postStudioFormData<ValidateShotResponse>(
        "/api/cineai/validate-shot",
        formData,
        {
          timeoutMs: REMOTE_ANALYSIS_TIMEOUT_MS,
          timeoutMessage:
            "انتهت المهلة الزمنية لتحليل اللقطة. سيُستخدم التحليل المحلي.",
        }
      )
        .then((remoteData) => {
          if (!remoteData?.validation) {
            return null;
          }

          const analysis = normalizeShotAnalysis(remoteData.validation);
          const validation = ShotAnalysisSchema.safeParse(analysis);
          return validation.success ? validation.data : null;
        })
        .catch(() => null);

      const winner = await resolveAnalysisWinner({
        remote: remotePromise,
        local: localPromise,
      });

      if (winner?.source === "remote") {
        setAnalysisState((prev) => ({
          ...prev,
          isAnalyzing: false,
          analysis: winner.value,
          source: "remote",
          error: null,
        }));

        if (winner.value.issues.length > 0) {
          toast.success(
            `تم التحليل بنجاح - يوجد ${winner.value.issues.length} ملاحظة`,
            { id: "analyzing" }
          );
        } else {
          toast.success("اللقطة جاهزة للتصوير!", { id: "analyzing" });
        }
        return;
      }

      if (winner?.source === "local-fallback") {
        setAnalysisState((prev) => ({
          ...prev,
          isAnalyzing: false,
          error: null,
          analysis: winner.value,
          source: "local-fallback",
        }));
        toast.success("تم تفعيل التحليل المحلي البديل بنجاح", {
          id: "analyzing",
        });
        return;
      }

      // كلا المسارين فشلا
      setAnalysisState((prev) => ({
        ...prev,
        isAnalyzing: false,
        source: null,
        error: "فشل في تحليل اللقطة من جميع المصادر",
      }));
      toast.error("فشل في تحليل اللقطة", { id: "analyzing" });
    },
    [mediaInput.state.analysisFile, mood]
  );

  /**
   * تحديث سؤال المستخدم
   *
   * @param question - السؤال الجديد
   */
  const setQuestion = useCallback((question: string) => {
    setAnalysisState((prev) => ({
      ...prev,
      question,
    }));
  }, []);

  /**
   * إرسال سؤال للمساعد الذكي.
   *
   * - يضع حالة تحميل داخل لوحة المساعد (لا يعتمد على toast فقط).
   * - يحترم مهلة محددة عبر `postStudioJson`.
   * - عند النجاح: يعرض الإجابة داخل اللوحة ويمسح السؤال الحالي.
   * - عند الفشل: يعرض الخطأ داخل اللوحة ويُبقي السؤال الذي كتبه المستخدم.
   */
  const askAssistant = useCallback(async () => {
    const trimmedQuestion = analysisState.question.trim();

    if (!trimmedQuestion) {
      setAssistantState((prev) => ({
        ...prev,
        error: "يرجى كتابة سؤالك أولاً",
      }));
      return;
    }

    if (assistantState.isLoading) {
      // منع الإرسال المزدوج عبر زر الإدخال أو النقر المتكرر
      return;
    }

    setAssistantState({
      isLoading: true,
      answer: null,
      lastQuestion: trimmedQuestion,
      error: null,
    });

    try {
      const response = await postStudioJson<ChatResponse>(
        "/api/ai/chat",
        {
          message: trimmedQuestion,
          context: {
            assistant: "cinematography-assistant",
            mood,
            latestAnalysis: analysisState.analysis,
          },
        },
        {
          requireCsrf: true,
          timeoutMs: ASSISTANT_REQUEST_TIMEOUT_MS,
          timeoutMessage:
            "انتهت المهلة الزمنية للمساعد. تحقق من الاتصال ثم أعد المحاولة.",
        }
      );

      const answerText = response.data?.response?.trim();

      if (!answerText) {
        throw new Error("لم يصل المساعد بإجابة قابلة للعرض. حاول مرة أخرى.");
      }

      setAssistantState({
        isLoading: false,
        answer: answerText,
        lastQuestion: trimmedQuestion,
        error: null,
      });

      // مسح السؤال فقط بعد نجاح الإرسال
      setAnalysisState((prev) => ({
        ...prev,
        question: "",
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "فشل في إرسال السؤال";
      setAssistantState((prev) => ({
        ...prev,
        isLoading: false,
        answer: null,
        error: message,
      }));
    }
  }, [
    analysisState.analysis,
    analysisState.question,
    assistantState.isLoading,
    mood,
  ]);

  /**
   * مسح آخر إجابة/خطأ من لوحة المساعد دون مسح السؤال الحالي.
   */
  const dismissAssistantResult = useCallback(() => {
    setAssistantState((prev) => ({
      ...prev,
      answer: null,
      error: null,
    }));
  }, []);

  /**
   * إعادة تعيين حالة التحليل
   */
  const resetAnalysis = useCallback(() => {
    setAnalysisState(initialAnalysisState);
    setAssistantState(initialAssistantState);
    mediaInput.clearMedia();
  }, [mediaInput.clearMedia]);

  // ============================================
  // دوال الإعدادات التقنية
  // ============================================

  /**
   * تبديل إعداد Focus Peaking
   */
  const toggleFocusPeaking = useCallback(() => {
    setTechnicalSettings((prev) => ({
      ...prev,
      focusPeaking: !prev.focusPeaking,
    }));
    toast.success(
      technicalSettings.focusPeaking
        ? "تم إيقاف Focus Peaking"
        : "تم تفعيل Focus Peaking"
    );
  }, [technicalSettings.focusPeaking]);

  /**
   * تبديل إعداد False Color
   */
  const toggleFalseColor = useCallback(() => {
    setTechnicalSettings((prev) => ({
      ...prev,
      falseColor: !prev.falseColor,
    }));
    toast.success(
      technicalSettings.falseColor
        ? "تم إيقاف False Color"
        : "تم تفعيل False Color"
    );
  }, [technicalSettings.falseColor]);

  /**
   * تحديث درجة حرارة اللون
   *
   * @param colorTemp - درجة الحرارة بالكلفن
   */
  const setColorTemp = useCallback((colorTemp: number) => {
    if (colorTemp >= 2000 && colorTemp <= 10000) {
      setTechnicalSettings((prev) => ({
        ...prev,
        colorTemp,
      }));
    }
  }, []);

  /**
   * تحديث درجة حرارة اللون من Slider (يأخذ مصفوفة)
   *
   * @param value - القيمة كمصفوفة من الـ Slider
   */
  const setColorTempFromSlider = useCallback(
    (value: number[]) => {
      const temp = value[0] ?? 3200;
      setColorTemp(temp);
    },
    [setColorTemp]
  );

  /**
   * قيمة درجة الحرارة كمصفوفة للـ Slider
   */
  const colorTempValue = useMemo(
    () => [technicalSettings.colorTemp],
    [technicalSettings.colorTemp]
  );

  // ============================================
  // قيم محسوبة
  // ============================================

  /**
   * درجة الحرارة الموصى بها بناءً على المود الحالي
   */
  const recommendedColorTemp = useMemo((): number => {
    return getRecommendedColorTemp(mood);
  }, [mood]);

  /**
   * التحقق من وجود تحليل جاهز
   */
  const hasAnalysis = useMemo((): boolean => {
    return analysisState.analysis !== null;
  }, [analysisState.analysis]);

  /**
   * التحقق من وجود مشاكل في اللقطة
   */
  const hasIssues = useMemo((): boolean => {
    return (analysisState.analysis?.issues.length ?? 0) > 0;
  }, [analysisState.analysis]);

  /**
   * حالة الجاهزية للتصوير
   */
  const isReadyToShoot = useMemo((): boolean => {
    return hasAnalysis && !hasIssues;
  }, [hasAnalysis, hasIssues]);

  // ============================================
  // القيمة المُرجعة
  // ============================================

  return {
    // حالة التحليل
    analysis: analysisState.analysis,
    analysisSource: analysisState.source,
    isAnalyzing: analysisState.isAnalyzing,
    error: analysisState.error,
    question: analysisState.question,

    // دوال التحليل
    handleAnalyzeShot,
    setQuestion,
    askAssistant,
    resetAnalysis,
    dismissAssistantResult,

    // حالة المساعد الذكي
    assistantAnswer: assistantState.answer,
    assistantError: assistantState.error,
    assistantLastQuestion: assistantState.lastQuestion,
    isAssistantLoading: assistantState.isLoading,

    // إدخال الوسائط
    mediaInput,

    // الإعدادات التقنية
    technicalSettings,
    toggleFocusPeaking,
    toggleFalseColor,
    setColorTemp,
    setColorTempFromSlider,
    colorTempValue,

    // قيم محسوبة
    hasAnalysis,
    hasIssues,
    isReadyToShoot,
    recommendedColorTemp,
  };
}

export default useProduction;
