"use client";

import { useState } from "react";

import {
  analyzeBudgetScenario,
  exportBudgetDocument,
  generateBudgetDocument,
} from "../lib/budget-api-client";

import type {
  BudgetAnalysis,
  BudgetDocument,
  BudgetPersistedState,
  BudgetRuntimeMeta,
} from "../types";

interface BudgetActionsConfig {
  title: string;
  scenario: string;
  budget: BudgetDocument | null;
  runtimeMeta: BudgetRuntimeMeta | null;
  setTitle: (title: string) => void;
  setBudget: (budget: BudgetDocument | null) => void;
  setAnalysis: (analysis: BudgetAnalysis | null) => void;
  setRuntimeMeta: (meta: BudgetRuntimeMeta | null) => void;
  persistBudgetState: (
    nextState: Omit<BudgetPersistedState, "persistedAt">
  ) => Promise<void>;
}

export function useBudgetActions({
  title,
  scenario,
  budget,
  runtimeMeta,
  setTitle,
  setBudget,
  setAnalysis,
  setRuntimeMeta,
  persistBudgetState,
}: BudgetActionsConfig) {
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!scenario.trim()) {
      setError("أدخل السيناريو أولاً لتحليله.");
      return;
    }

    setAnalyzing(true);
    setError(null);
    try {
      const data = await analyzeBudgetScenario(scenario);
      setAnalysis(data.analysis);
      if (data.meta) {
        setRuntimeMeta(data.meta);
      }
      await persistBudgetState({
        title,
        scenario,
        budget,
        analysis: data.analysis,
        meta: data.meta ?? runtimeMeta,
      });
    } catch (caughtError) {
      setError(resolveBudgetActionError(caughtError, "التحليل"));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!scenario.trim()) {
      setError("أدخل السيناريو أولاً لإنشاء الميزانية.");
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const data = await generateBudgetDocument({ title, scenario });
      const nextTitle = title.trim() || (data.budget.metadata?.title ?? title);

      setBudget(data.budget);
      setAnalysis(data.analysis);
      setRuntimeMeta(data.meta ?? null);
      if (nextTitle !== title) {
        setTitle(nextTitle);
      }

      await persistBudgetState({
        title: nextTitle,
        scenario,
        budget: data.budget,
        analysis: data.analysis,
        meta: data.meta ?? null,
      });
    } catch (caughtError) {
      setError(resolveBudgetActionError(caughtError, "إنشاء الميزانية"));
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async () => {
    if (!budget) {
      setError("لا توجد ميزانية لتصديرها.");
      return;
    }

    setExporting(true);
    setError(null);
    try {
      await exportBudgetDocument(budget);
    } catch (caughtError) {
      setError(resolveBudgetActionError(caughtError, "التصدير"));
    } finally {
      setExporting(false);
    }
  };

  return {
    analyzing,
    generating,
    exporting,
    error,
    handleAnalyze,
    handleGenerate,
    handleExport,
  };
}

function resolveBudgetActionError(caughtError: unknown, actionName: string) {
  if (caughtError instanceof Error) {
    return caughtError.message;
  }
  return `حدث خطأ غير متوقع أثناء ${actionName}.`;
}
