import { useState, useCallback } from "react";
import type { AnalysisResult } from "../../types";
import { SAMPLE_SCRIPT } from "../../types/constants";

export const useScriptAnalysis = (
  showNotification: (type: string, message: string) => void
) => {
  const [scriptText, setScriptText] = useState("");
  const [selectedMethodology, setSelectedMethodology] =
    useState("stanislavsky");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );

  const useSampleScript = useCallback(() => {
    setScriptText(SAMPLE_SCRIPT);
    showNotification("info", "تم تحميل النص التجريبي");
  }, [showNotification]);

  const analyzeScript = useCallback(() => {
    if (!scriptText.trim()) {
      showNotification("error", "يرجى إدخال نص أولاً");
      return;
    }

    setAnalyzing(true);

    // محاكاة تحليل النص
    setTimeout(() => {
      const result: AnalysisResult = {
        summary: "النص يعكس صراع داخلي عميق بين الرغبة والواجب",
        keyEmotions: ["حزن", "أمل", "غضب", "خوف"],
        characterArc: "يبدأ الشخصية مترددة وتنتهي بقرار حاسم",
        suggestedActions: [
          "التركيز على التغير في نبرة الصوت",
          "استخدام حركات جسدية دقيقة",
          "إضافة وقفات استراتيجية",
        ],
        difficulty: "متوسطة",
        estimatedTime: "3-4 دقائق",
      };

      setAnalysisResult(result);
      setAnalyzing(false);
      showNotification("success", "تم تحليل النص بنجاح");
    }, 2000);
  }, [scriptText, showNotification]);

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
