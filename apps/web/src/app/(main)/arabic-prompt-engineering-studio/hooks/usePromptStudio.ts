import {
  analyzePrompt,
  comparePrompts,
  generateEnhancementSuggestions,
  PromptAnalysis,
  PromptTemplate,
} from "@the-copy/prompt-engineering";
import * as React from "react";

import {
  loadRemoteAppState,
  persistRemoteAppState,
} from "@/lib/app-state-client";

import { PromptHistoryEntry, PromptEngineeringSnapshot } from "../types";
import { restorePromptHistory, persistPromptHistory } from "../utils/history";

export function usePromptStudio() {
  const [prompt, setPrompt] = React.useState("");
  const [analysis, setAnalysis] = React.useState<PromptAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("editor");
  const [selectedTemplate, setSelectedTemplate] =
    React.useState<PromptTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = React.useState<
    Record<string, string>
  >({});
  const [promptHistory, setPromptHistory] = React.useState<
    PromptHistoryEntry[]
  >([]);
  const [comparePrompt1, setComparePrompt1] = React.useState("");
  const [comparePrompt2, setComparePrompt2] = React.useState("");
  const [comparisonResult, setComparisonResult] = React.useState<ReturnType<
    typeof comparePrompts
  > | null>(null);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [isRemoteStateReady, setIsRemoteStateReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    void loadRemoteAppState<PromptEngineeringSnapshot>(
      "arabic-prompt-engineering-studio"
    )
      .then((snapshot) => {
        if (cancelled || !snapshot) {
          return;
        }

        setPrompt(snapshot.prompt ?? "");
        setAnalysis(snapshot.analysis ?? null);
        setActiveTab(snapshot.activeTab ?? "editor");
        setSelectedTemplate(snapshot.selectedTemplate ?? null);
        setTemplateVariables(snapshot.templateVariables ?? {});
        setPromptHistory(restorePromptHistory(snapshot.promptHistory));
        setComparePrompt1(snapshot.comparePrompt1 ?? "");
        setComparePrompt2(snapshot.comparePrompt2 ?? "");
        setComparisonResult(snapshot.comparisonResult ?? null);
        setSuggestions(snapshot.suggestions ?? []);
      })
      .catch((error: unknown) => {
        void error;
      })
      .finally(() => {
        if (!cancelled) {
          setIsRemoteStateReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!isRemoteStateReady) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistRemoteAppState<PromptEngineeringSnapshot>(
        "arabic-prompt-engineering-studio",
        {
          prompt,
          analysis,
          activeTab,
          selectedTemplate,
          templateVariables,
          promptHistory: persistPromptHistory(promptHistory),
          comparePrompt1,
          comparePrompt2,
          comparisonResult,
          suggestions,
        }
      ).catch((error: unknown) => {
        void error;
      });
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeTab,
    analysis,
    comparePrompt1,
    comparePrompt2,
    comparisonResult,
    isRemoteStateReady,
    prompt,
    promptHistory,
    selectedTemplate,
    suggestions,
    templateVariables,
  ]);

  const handleAnalyze = React.useCallback(() => {
    if (!prompt.trim()) return;

    setIsAnalyzing(true);

    setTimeout(() => {
      try {
        const result = analyzePrompt(prompt);
        setAnalysis(result);
        setSuggestions(generateEnhancementSuggestions(prompt));

        setPromptHistory((prev) => [
          { prompt, timestamp: new Date(), score: result.metrics.overallScore },
          ...prev.slice(0, 9),
        ]);
      } catch {
        setAnalysis(null);
        setSuggestions([]);
      }
      setIsAnalyzing(false);
    }, 500);
  }, [prompt]);

  const handleCopy = React.useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
  }, []);

  return {
    prompt,
    setPrompt,
    analysis,
    setAnalysis,
    isAnalyzing,
    activeTab,
    setActiveTab,
    selectedTemplate,
    setSelectedTemplate,
    templateVariables,
    setTemplateVariables,
    promptHistory,
    setPromptHistory,
    comparePrompt1,
    setComparePrompt1,
    comparePrompt2,
    setComparePrompt2,
    comparisonResult,
    setComparisonResult,
    suggestions,
    setSuggestions,
    handleAnalyze,
    handleCopy,
  };
}
