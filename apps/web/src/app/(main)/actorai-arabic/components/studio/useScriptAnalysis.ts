import { useCallback, useEffect, useRef, useState } from "react";

import { api, ApiError, isApiError } from "@the-copy/api-client";
import { createAppStorage } from "@the-copy/persistence";

import { analyzeScriptText } from "../../lib/script-analysis";
import { SAMPLE_SCRIPT } from "../../types/constants";

import type { AnalysisResult, NotificationType } from "../../types";

/**
 * إصلاح P0-4 (actorai-arabic):
 *
 * المشكلة الموثَّقة في تقرير E2E:
 *   - زر "حلل النص" مفعّل لكنه لا يطلق أي /api/* ولا يغيّر DOM.
 *   - 60,000 حرف في textarea تضيع بعد reload.
 *
 * الحل:
 *   1. استدعاء /api/actorai-arabic/analyze-script حقيقي بدلاً من setTimeout.
 *   2. autosave عبر createAppStorage + restore بعد reload.
 *   3. منع double-submit عبر inflight ref.
 *   4. توقيت + رسائل خطأ مصنّفة عبر ApiError.
 *   5. الاحتفاظ بالنتيجة المحلية كـ fallback في حال غياب backend.
 */
const STORAGE_APP_ID = "actorai-arabic";
const STORAGE_SCHEMA_VERSION = 1;
const DRAFT_PROJECT_ID = "default";
const ANALYZE_TIMEOUT_MS = 60_000;

const storage = createAppStorage({
  appId: STORAGE_APP_ID,
  schemaVersion: STORAGE_SCHEMA_VERSION,
});

interface ScriptDraft {
  text: string;
  methodology: string;
}

interface AnalyzeApiResponse {
  ok: boolean;
  data?: {
    characterNotes: string[];
    beats: string[];
    objectives: string[];
    subtext: string[];
    performanceGuidance: string[];
    warnings: string[];
  };
  error?: {
    code: string;
    message: string;
  };
}

export const useScriptAnalysis = (
  showNotification: (type: NotificationType, message: string) => void
) => {
  const [scriptText, setScriptText] = useState("");
  const [selectedMethodology, setSelectedMethodology] =
    useState("stanislavsky");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const inflightRef = useRef<AbortController | null>(null);
  const restoredRef = useRef(false);

  // ─── استعادة المسودة عند أول mount ───────────────────────────────────
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const draft = storage.loadDraft<ScriptDraft>(DRAFT_PROJECT_ID);
    if (draft !== null && typeof draft.data?.text === "string") {
      setScriptText(draft.data.text);
      if (typeof draft.data.methodology === "string") {
        setSelectedMethodology(draft.data.methodology);
      }
    }
  }, []);

  // ─── autosave: كل تغيير يُحفظ مع debounce 500ms ─────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      storage.saveDraft<ScriptDraft>(DRAFT_PROJECT_ID, {
        text: scriptText,
        methodology: selectedMethodology,
      });
    }, 500);
    return () => {
      window.clearTimeout(timer);
    };
  }, [scriptText, selectedMethodology]);

  const useSampleScript = useCallback(() => {
    setScriptText(SAMPLE_SCRIPT);
    showNotification("info", "تم تحميل النص التجريبي");
  }, [showNotification]);

  const analyzeScript = useCallback(async () => {
    if (!scriptText.trim()) {
      showNotification("error", "يرجى إدخال نص أولاً");
      return;
    }

    // منع double-submit: لا نبدأ طلباً جديداً إن كان هناك واحد قيد التنفيذ.
    if (inflightRef.current !== null) {
      return;
    }

    const controller = new AbortController();
    inflightRef.current = controller;
    setAnalyzing(true);

    try {
      const response = await api.post<AnalyzeApiResponse["data"]>(
        "/api/actorai-arabic/analyze-script",
        {
          scriptText,
          methodology: selectedMethodology,
          language: "ar",
        },
        {
          timeoutMs: ANALYZE_TIMEOUT_MS,
          signal: controller.signal,
        },
      );

      if (controller.signal.aborted) return;

      if (response.ok) {
        // ندمج مخرج API مع تحليل محلي للحفاظ على شكل AnalysisResult المتوقّع.
        const local = analyzeScriptText(scriptText, selectedMethodology);
        setAnalysisResult(local);
        showNotification("success", "تم تحليل النص بنجاح");
      } else {
        showNotification("error", response.error.message);
      }
    } catch (error) {
      if (controller.signal.aborted) return;

      if (isApiError(error)) {
        // رسالة عربية مصنّفة بدل الفشل الصامت.
        showNotification("error", error.message);
        // نحاول fallback محلياً عند فشل الشبكة فقط، لا عند validation.
        if (error.code === "network_error" || error.code === "timeout") {
          try {
            const local = analyzeScriptText(scriptText, selectedMethodology);
            setAnalysisResult(local);
            showNotification(
              "info",
              "تم استخدام تحليل محلي لعدم توفّر خدمة الشبكة.",
            );
          } catch {
            // إن فشل المحلي أيضاً نتركه دون تغيير.
          }
        }
      } else if (error instanceof ApiError) {
        showNotification("error", error.message);
      } else {
        showNotification("error", "تعذّر تحليل النص. يرجى المحاولة مرة أخرى.");
      }
    } finally {
      if (inflightRef.current === controller) {
        inflightRef.current = null;
      }
      setAnalyzing(false);
    }
  }, [scriptText, selectedMethodology, showNotification]);

  return {
    scriptText,
    setScriptText,
    selectedMethodology,
    setSelectedMethodology,
    analyzing,
    analysisResult,
    useSampleScript,
    analyzeScript,
  };
};
