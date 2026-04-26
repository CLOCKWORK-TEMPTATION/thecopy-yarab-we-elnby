/**
 * @module hooks/useSevenStationsAnalysis
 * @description هوك مخصص لإدارة تحليل المحطات السبع للتحليل الدرامي
 *
 * السبب: فصل منطق إدارة الحالة وعمليات الـ API عن مكونات واجهة المستخدم،
 * مما يسهّل الصيانة، الاختبار، وإعادة الاستخدام.
 *
 * يوفر هذا الهوك:
 * - إدارة حالة التحليل (text, status, result, error)
 * - وظيفة تنفيذ التحليل مع التحقق من الصحة
 * - معالجة الأخطاء موحدة مع toast notifications
 */

"use client";

import { useState, useCallback, useMemo } from "react";

import { toast } from "@/hooks/use-toast";
import {
  type AnalysisResult,
  type AnalysisStatus,
  AnalysisRequestSchema,
  AnalysisResultSchema,
  ANALYSIS_ERROR_MESSAGES,
} from "@/types/analysis";

/**
 * واجهة القيم المرتجعة من الهوك
 */
interface UseSevenStationsAnalysisReturn {
  /** النص الحالي للتحليل */
  text: string;
  /** تعيين النص للتحليل */
  setText: (text: string) => void;
  /** حالة التحليل الحالية */
  status: AnalysisStatus;
  /** هل التحليل جاري حالياً */
  isAnalyzing: boolean;
  /** نتيجة التحليل */
  result: AnalysisResult | null;
  /** رسالة الخطأ */
  error: string | null;
  /** تنفيذ التحليل */
  analyze: () => Promise<void>;
  /** إعادة تعيين الحالة */
  reset: () => void;
  /** هل يمكن بدء التحليل */
  canAnalyze: boolean;
}

/**
 * خيارات تهيئة الهوك
 */
interface UseSevenStationsAnalysisOptions {
  /** تفعيل تحليل التدفقات */
  enableFlows?: boolean;
  /** تفعيل RAG للنصوص الطويلة */
  enableRAG?: boolean;
  /** معالج نجاح مخصص */
  onSuccess?: (result: AnalysisResult) => void;
  /** معالج خطأ مخصص */
  onError?: (error: string) => void;
}

/**
 * هوك مخصص لإدارة تحليل المحطات السبع
 *
 * السبب الرئيسي: فصل منطق الأعمال عن واجهة المستخدم يُسهّل:
 * 1. اختبار المنطق بشكل مستقل
 * 2. إعادة استخدام المنطق في مكونات متعددة
 * 3. تبسيط المكونات وجعلها أكثر قابلية للقراءة
 *
 * @param options - خيارات تهيئة الهوك
 * @returns كائن يحتوي على الحالة والدوال
 *
 * @example
 * ```tsx
 * const { text, setText, analyze, result, isAnalyzing } = useSevenStationsAnalysis();
 * ```
 */
export function useSevenStationsAnalysis(
  options: UseSevenStationsAnalysisOptions = {}
): UseSevenStationsAnalysisReturn {
  const { enableFlows = true, enableRAG = true, onSuccess, onError } = options;

  // ==========================================
  // الحالة الداخلية
  // ==========================================

  const [text, setText] = useState("");
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // القيم المحسوبة
  // ==========================================

  /**
   * هل التحليل جاري حالياً
   * السبب: تبسيط التحقق من حالة التحميل
   */
  const isAnalyzing = useMemo(() => status === "loading", [status]);

  /**
   * هل يمكن بدء التحليل
   * السبب: التحقق من إمكانية بدء التحليل
   */
  const canAnalyze = useMemo(
    () => text.trim().length > 0 && !isAnalyzing,
    [text, isAnalyzing]
  );

  // ==========================================
  // معالجة الأخطاء
  // ==========================================

  /**
   * عرض رسالة خطأ موحدة
   * السبب: توحيد تجربة المستخدم عند حدوث أخطاء
   */
  const showError = useCallback(
    (message: string) => {
      setError(message);
      toast({
        variant: "destructive",
        title: "خطأ في التحليل",
        description: message,
      });
      onError?.(message);
    },
    [onError]
  );

  /**
   * عرض رسالة نجاح
   * السبب: إعلام المستخدم بنجاح العملية
   */
  const showSuccess = useCallback(() => {
    toast({
      title: "تم التحليل بنجاح",
      description: "اكتمل تحليل السيناريو عبر المحطات السبع",
    });
  }, []);

  // ==========================================
  // وظائف التحليل
  // ==========================================

  /**
   * تنفيذ التحليل
   * السبب: العملية الرئيسية للهوك - إرسال النص للتحليل
   * يحاول أولاً عبر الخادم، وعند الفشل يقبل أي بيانات صالحة أو يُبلغ بالخطأ
   */
  const analyze = useCallback(async () => {
    // التحقق من صحة المدخلات
    const validationResult = AnalysisRequestSchema.safeParse({
      text,
      enableFlows,
      enableRAG,
    });

    if (!validationResult.success) {
      showError(ANALYSIS_ERROR_MESSAGES.EMPTY_TEXT);
      return;
    }

    // تحديث الحالة
    setStatus("loading");
    setError(null);
    setResult(null);

    try {
      // إرسال الطلب للـ API عبر المسار العام
      const response = await fetch("/api/public/analysis/seven-stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: validationResult.data.text,
          async: false,
        }),
      });

      // التحقق من حالة الاستجابة
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `${ANALYSIS_ERROR_MESSAGES.API_ERROR}: ${response.status}${errorText ? ` — ${errorText.slice(0, 200)}` : ""}`
        );
      }

      // تحليل الاستجابة
      const data = await response.json();

      // قبول أي بيانات تحتوي success أو detailedResults أو stationOutputs
      // بدون رفض صارم عبر Zod (البنية تختلف بين AI و fallback)
      const parseResult = AnalysisResultSchema.safeParse(data);

      if (parseResult.success) {
        setResult(parseResult.data);
      } else {
        // البيانات قد تكون بصيغة pipeline payload أو backend response
        // نقبلها كما هي لأن المكوّنات تتعامل مع الشكلين
        setResult(data as AnalysisResult);
      }

      // حفظ handoff لصفحة التطوير
      try {
        localStorage.setItem("sevenStationsAnalysis", JSON.stringify(data));
        sessionStorage.setItem("stationAnalysisResults", JSON.stringify(data));
      } catch {
        // التخزين قد لا يتوفر
      }

      setStatus("success");
      showSuccess();
      onSuccess?.(data);
    } catch (err) {
      setStatus("error");
      const errorMessage =
        err instanceof Error
          ? err.message
          : ANALYSIS_ERROR_MESSAGES.UNKNOWN_ERROR;
      showError(errorMessage);
    }
  }, [text, enableFlows, enableRAG, onSuccess, showError, showSuccess]);

  /**
   * إعادة تعيين الحالة
   * السبب: تمكين المستخدم من بدء تحليل جديد
   */
  const reset = useCallback(() => {
    setText("");
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  // ==========================================
  // القيم المرتجعة
  // ==========================================

  return {
    text,
    setText,
    status,
    isAnalyzing,
    result,
    error,
    analyze,
    reset,
    canAnalyze,
  };
}
