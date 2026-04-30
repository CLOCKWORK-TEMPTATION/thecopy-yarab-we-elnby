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
  /** Original budget from last generation (read-only reference) */
  budget: BudgetDocument | null;
  /** Edited budget with user modifications — used for export and save */
  editedBudget: BudgetDocument | null;
  runtimeMeta: BudgetRuntimeMeta | null;
  setTitle: (title: string) => void;
  setBudget: (budget: BudgetDocument | null) => void;
  setAnalysis: (analysis: BudgetAnalysis | null) => void;
  setRuntimeMeta: (meta: BudgetRuntimeMeta | null) => void;
  persistBudgetState: (
    nextState: Omit<BudgetPersistedState, "persistedAt">,
  ) => Promise<void>;
}

export function useBudgetActions({
  title,
  scenario,
  budget,
  editedBudget,
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!scenario.trim()) {
      setError("اكتب وصفًا إنتاجيًا أو سيناريو مختصرًا قبل التحليل.");
      return;
    }

    setAnalyzing(true);
    setError(null);
    try {
      const data = await analyzeBudgetScenario(scenario);
      setAnalysis(data.analysis);
      if (data.meta) setRuntimeMeta(data.meta);
      await persistBudgetState({
        title,
        scenario,
        budget: editedBudget ?? budget,
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
      setError(
        "اكتب وصفًا إنتاجيًا أو سيناريو مختصرًا قبل إنشاء الميزانية.",
      );
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
      if (nextTitle !== title) setTitle(nextTitle);

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
    const targetBudget = editedBudget ?? budget;
    if (!targetBudget) {
      setError(
        "لا توجد ميزانية لتصديرها. أنشئ الميزانية أولاً ثم حاول مرة أخرى.",
      );
      return;
    }

    setExporting(true);
    setError(null);
    try {
      await exportBudgetDocument(targetBudget);
    } catch (caughtError) {
      setError(resolveBudgetActionError(caughtError, "التصدير"));
    } finally {
      setExporting(false);
    }
  };

  const handleSave = async () => {
    const targetBudget = editedBudget ?? budget;
    if (!targetBudget) {
      setError("لا توجد ميزانية للحفظ.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await persistBudgetState({
        title,
        scenario,
        budget: targetBudget,
        analysis: null,
        meta: runtimeMeta,
      });
    } catch (caughtError) {
      setError(resolveBudgetActionError(caughtError, "الحفظ"));
    } finally {
      setSaving(false);
    }
  };

  return {
    analyzing,
    generating,
    exporting,
    saving,
    error,
    handleAnalyze,
    handleGenerate,
    handleExport,
    handleSave,
  };
}

function resolveBudgetActionError(caughtError: unknown, actionName: string) {
  if (caughtError instanceof Error) return caughtError.message;
  return `حدث خطأ غير متوقع أثناء ${actionName}.`;
}
