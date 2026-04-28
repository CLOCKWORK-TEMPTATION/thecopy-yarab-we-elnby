/**
 * @description منطق تحميل بيانات التحليل المحفوظة من localStorage/sessionStorage.
 * دالة خالصة (لا hooks) — تقبل dispatch وبيانات الحالة الحالية كمعاملات.
 */

import { loadRemoteAppState } from "@/lib/app-state-client";

import type { SevenStationsAnalysis } from "../types";
import type { ActionType, AnalysisSnapshot } from "./creative-development-types";

type ToastFn = (options: { title?: string; description?: string; variant?: "default" | "destructive" }) => void;

/**
 * تحميل بيانات التحليل المحفوظة من localStorage أو sessionStorage.
 * يتحقق أولاً من وجود تحليل المحطات السبع ثم من الجلسة ثم من الخادم البعيد.
 */
export function loadSavedAnalysisDataImpl(
  dispatch: React.Dispatch<ActionType>,
  currentTextInput: string,
  currentAnalysisReport: string,
  toast: ToastFn
): void {
  // التحقق من بيانات المحطات السبع
  const sevenStationsData = localStorage.getItem("sevenStationsAnalysis");
  if (sevenStationsData) {
    try {
      const analysisData = JSON.parse(sevenStationsData) as SevenStationsAnalysis;
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
            report: JSON.stringify(analysisData.stationOutputs.station7, null, 2),
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
      if (!snapshot) return;

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

      if (snapshot.text && !currentTextInput) {
        dispatch({ type: "SET_TEXT_INPUT", payload: snapshot.text });
      }
    })
    .catch(() => { /* empty */ });

  // التحقق من النص الأصلي المحفوظ
  const storedText = sessionStorage.getItem("originalText");
  if (storedText && !currentTextInput) {
    dispatch({ type: "SET_TEXT_INPUT", payload: storedText });
  }

  // استعادة المسودة المحفوظة كملاذ أخير
  if (!currentTextInput && !currentAnalysisReport) {
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
            dispatch({ type: "SET_ANALYSIS_REPORT", payload: parsed.analysisReport });
          }
          if (parsed.specialRequirements) {
            dispatch({ type: "SET_SPECIAL_REQUIREMENTS", payload: parsed.specialRequirements });
          }
          if (parsed.additionalInfo) {
            dispatch({ type: "SET_ADDITIONAL_INFO", payload: parsed.additionalInfo });
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
}
