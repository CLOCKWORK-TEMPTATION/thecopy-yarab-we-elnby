import { useState, useCallback, useEffect } from "react";

import { useWebcamAnalysis } from "../../hooks/useWebcamAnalysis";
import type { WebcamAnalysisResult, WebcamSession } from "../../types";

export const useWebcamAnalysisBridge = (
  showNotification: (type: string, message: string) => void
) => {
  const webcamEngine = useWebcamAnalysis();

  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamAnalyzing, setWebcamAnalyzing] = useState(false);
  const [webcamAnalysisTime, setWebcamAnalysisTime] = useState(0);
  const [webcamAnalysisResult, setWebcamAnalysisResult] =
    useState<WebcamAnalysisResult | null>(null);
  const [webcamSessions, setWebcamSessions] = useState<WebcamSession[]>([]);
  const [webcamPermission, setWebcamPermission] = useState<
    "granted" | "denied" | "pending"
  >("pending");

  useEffect(() => {
    setWebcamActive(webcamEngine.state.isActive);
    setWebcamAnalyzing(webcamEngine.state.isAnalyzing);
    setWebcamAnalysisTime(webcamEngine.state.analysisTime);
    setWebcamAnalysisResult(webcamEngine.state.analysisResult);
    setWebcamSessions(webcamEngine.state.sessions);
    setWebcamPermission(webcamEngine.state.permission);
  }, [webcamEngine.state]);

  const requestWebcamPermission = useCallback(async () => {
    try {
      await webcamEngine.requestPermission();
      showNotification("success", "تم تفعيل الكاميرا بنجاح!");
    } catch {
      showNotification("error", "لم يتم السماح بالوصول للكاميرا");
    }
  }, [showNotification, webcamEngine]);

  const stopWebcam = useCallback(() => {
    webcamEngine.stopWebcam();
    showNotification("info", "تم إيقاف الكاميرا");
  }, [showNotification, webcamEngine]);

  const startWebcamAnalysis = useCallback(() => {
    const result = webcamEngine.startAnalysis();
    if (!result.success) {
      showNotification("error", result.error ?? "يرجى تفعيل الكاميرا أولاً");
      return;
    }
    showNotification("info", "بدأ التحليل البصري... 👁️");
  }, [showNotification, webcamEngine]);

  const stopWebcamAnalysis = useCallback(() => {
    const result = webcamEngine.stopAnalysis();
    if (!result) {
      showNotification("error", "لا توجد بيانات كافية للتحليل");
      return;
    }
    showNotification(
      "success",
      `تم التحليل! النتيجة: ${result.overallScore}/100`
    );
  }, [showNotification, webcamEngine]);

  const getBlinkStatusText = useCallback(
    (status: "normal" | "high" | "low"): string => {
      switch (status) {
        case "high":
          return "مرتفع (قد يدل على توتر)";
        case "low":
          return "منخفض (تركيز عالي)";
        default:
          return "طبيعي";
      }
    },
    []
  );

  const getBlinkStatusColor = useCallback(
    (status: "normal" | "high" | "low"): string => {
      switch (status) {
        case "high":
          return "text-orange-600";
        case "low":
          return "text-blue-600";
        default:
          return "text-green-600";
      }
    },
    []
  );

  const getEyeDirectionText = useCallback((direction: string): string => {
    const directions: Record<string, string> = {
      up: "للأعلى",
      down: "للأسفل",
      left: "لليسار",
      right: "لليمين",
      center: "للمركز",
      audience: "للجمهور",
    };
    return directions[direction] ?? direction;
  }, []);

  return {
    webcamActive,
    webcamAnalyzing,
    webcamAnalysisTime,
    webcamAnalysisResult,
    webcamSessions,
    webcamPermission,
    webcamEngine,
    requestWebcamPermission,
    stopWebcam,
    startWebcamAnalysis,
    stopWebcamAnalysis,
    getBlinkStatusText,
    getBlinkStatusColor,
    getEyeDirectionText,
  };
};
