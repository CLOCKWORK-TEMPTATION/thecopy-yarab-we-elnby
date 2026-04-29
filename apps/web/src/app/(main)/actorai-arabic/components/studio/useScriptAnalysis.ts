import { useState, useCallback } from "react";

import { analyzeScriptText } from "../../lib/script-analysis";
import { SAMPLE_SCRIPT } from "../../types/constants";

import type { AnalysisResult, NotificationType } from "../../types";

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

    setTimeout(() => {
      setAnalysisResult(analyzeScriptText(scriptText, selectedMethodology));
      setAnalyzing(false);
      showNotification("success", "تم تحليل النص بنجاح");
    }, 2000);
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
