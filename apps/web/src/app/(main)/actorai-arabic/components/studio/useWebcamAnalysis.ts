import { useState, useCallback, useEffect } from "react";
import type { WebcamAnalysisResult, WebcamSession } from "../../types";
import { useWebcamAnalysis as useWebcamAnalysisEngine } from "../useWebcamAnalysis";

export const useWebcamAnalysis = (showNotification: (type: string, message: string) => void) => {
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamAnalyzing, setWebcamAnalyzing] = useState(false);
  const [webcamAnalysisTime, setWebcamAnalysisTime] = useState(0);
  const [webcamAnalysisResult, setWebcamAnalysisResult] = useState<WebcamAnalysisResult | null>(null);
  const [webcamSessions, setWebcamSessions] = useState<WebcamSession[]>([]);
  const [webcamPermission, setWebcamPermission] = useState<"granted" | "denied" | "pending">("pending");
  const webcamEngine = useWebcamAnalysisEngine();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (webcamAnalyzing) {
      interval = setInterval(() => {
        setWebcamAnalysisTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [webcamAnalyzing]);

  const requestWebcamPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setWebcamPermission("granted");
      showNotification("success", "تم منح إذن الكاميرا");
    } catch (error) {
      setWebcamPermission("denied");
      showNotification("error", "تم رفض إذن الكاميرا");
    }
  }, [showNotification]);

  const stopWebcam = useCallback(() => {
    setWebcamActive(false);
    setWebcamAnalyzing(false);
    setWebcamAnalysisTime(0);
  }, []);

  const startWebcamAnalysis = useCallback(() => {
    if (webcamPermission !== "granted") {
      showNotification("error", "يرجى منح إذن الكاميرا أولاً");
      return;
    }

    setWebcamActive(true);
    setWebcamAnalyzing(true);
    setWebcamAnalysisTime(0);

    // محاكاة تحليل الكاميرا
    setTimeout(() => {
      const result: WebcamAnalysisResult = {
        eyeContact: 85,
        facialExpressions: 78,
        bodyLanguage: 82,
        overallScore: 82,
        feedback: [
          "حافظ على التواصل البصري مع الجمهور",
          "استخدم تعبيرات وجه متنوعة",
          "حافظ على وضعية جسدية مفتوحة",
        ],
      };

      setWebcamAnalysisResult(result);
      setWebcamAnalyzing(false);
      showNotification("success", "تم تحليل الأداء البصري بنجاح");
    }, 3000);
  }, [webcamPermission, showNotification]);

  const stopWebcamAnalysis = useCallback(() => {
    setWebcamAnalyzing(false);
  }, []);

  const getEyeDirectionText = useCallback((direction: string) => {
    const directions: Record<string, string> = {
      center: "👁️ أمام",
      left: "⬅️ يسار",
      right: "➡️ يمين",
      up: "⬆️ أعلى",
      down: "⬇️ أسفل",
    };
    return directions[direction] || direction;
  }, []);

  const getBlinkStatusText = useCallback((status: string) => {
    const statuses: Record<string, string> = {
      normal: "✅ طبيعي",
      frequent: "⚠️ متكرر",
      rare: "ℹ️ نادر",
    };
    return statuses[status] || status;
  }, []);

  const getBlinkStatusColor = useCallback((status: string) => {
    const colors: Record<string, string> = {
      normal: "text-green-600",
      frequent: "text-red-600",
      rare: "text-blue-600",
    };
    return colors[status] || "text-gray-600";
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
    getEyeDirectionText,
    getBlinkStatusText,
    getBlinkStatusColor,
  };
};
