"use client";

import { useEffect, useMemo, useState } from "react";

import {
  loadRemoteAppState,
  persistRemoteAppState,
} from "@/lib/app-state-client";

import {
  BUDGET_APP_STATE_ID,
  downloadBlob,
  resolveFilename,
} from "../lib/budget-page-utils";

import type {
  BudgetAnalysis,
  BudgetAnalysisRuntimePayload,
  BudgetDocument,
  BudgetEnvelope,
  BudgetPersistedState,
  BudgetRuntimeMeta,
  BudgetRuntimePayload,
} from "../types";

export function useBudgetStudio() {
  const [title, setTitle] = useState("");
  const [scenario, setScenario] = useState("");
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [budget, setBudget] = useState<BudgetDocument | null>(null);
  const [runtimeMeta, setRuntimeMeta] = useState<BudgetRuntimeMeta | null>(
    null
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [restoringState, setRestoringState] = useState(true);
  const [persistedAt, setPersistedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalLineItems = useMemo(() => {
    if (!budget) return 0;
    return budget.sections.reduce(
      (sectionSum, section) =>
        sectionSum +
        section.categories.reduce(
          (categorySum, category) => categorySum + category.items.length,
          0
        ),
      0
    );
  }, [budget]);

  const persistBudgetState = async (
    nextState: Omit<BudgetPersistedState, "persistedAt">
  ) => {
    const nextPersistedAt = new Date().toISOString();
    await persistRemoteAppState(BUDGET_APP_STATE_ID, {
      ...nextState,
      persistedAt: nextPersistedAt,
    });
    setPersistedAt(nextPersistedAt);
  };

  useEffect(() => {
    let cancelled = false;

    const restoreState = async () => {
      try {
        const savedState =
          await loadRemoteAppState<BudgetPersistedState>(BUDGET_APP_STATE_ID);

        if (cancelled) {
          return;
        }

        if (!savedState) {
          setPersistedAt(null);
          return;
        }

        setTitle(savedState.title || "");
        setScenario(savedState.scenario || "");
        setBudget(savedState.budget);
        setAnalysis(savedState.analysis);
        setRuntimeMeta(savedState.meta);
        setPersistedAt(
          savedState.persistedAt ?? savedState.meta?.generatedAt ?? null
        );
      } catch {
        if (!cancelled) {
          setPersistedAt(null);
        }
      } finally {
        if (!cancelled) {
          setRestoringState(false);
        }
      }
    };

    void restoreState();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAnalyze = async () => {
    if (!scenario.trim()) {
      setError("أدخل السيناريو أولاً لتحليله.");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/budget/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      const payload =
        (await response.json()) as BudgetEnvelope<BudgetAnalysisRuntimePayload>;

      if (!response.ok || !payload.success || !payload.data?.analysis) {
        throw new Error(payload.error ?? "فشل في تحليل السيناريو.");
      }

      setAnalysis(payload.data.analysis);
      if (payload.data.meta) {
        setRuntimeMeta(payload.data.meta);
      }
      await persistBudgetState({
        title,
        scenario,
        budget,
        analysis: payload.data.analysis,
        meta: payload.data.meta ?? runtimeMeta,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "حدث خطأ غير متوقع أثناء التحليل."
      );
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
      const response = await fetch("/api/budget/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          scenario,
        }),
      });
      const payload =
        (await response.json()) as BudgetEnvelope<BudgetRuntimePayload>;

      if (
        !response.ok ||
        !payload.success ||
        !payload.data?.budget ||
        !payload.data.analysis
      ) {
        throw new Error(payload.error ?? "فشل في إنشاء الميزانية.");
      }

      const nextTitle =
        title.trim() || (payload.data.budget.metadata?.title ?? title);

      setBudget(payload.data.budget);
      setAnalysis(payload.data.analysis);
      setRuntimeMeta(payload.data.meta ?? null);
      if (nextTitle !== title) {
        setTitle(nextTitle);
      }

      await persistBudgetState({
        title: nextTitle,
        scenario,
        budget: payload.data.budget,
        analysis: payload.data.analysis,
        meta: payload.data.meta ?? null,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "حدث خطأ غير متوقع أثناء إنشاء الميزانية."
      );
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
      const response = await fetch("/api/budget/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as BudgetEnvelope<never>;
        throw new Error(payload.error ?? "فشل في تصدير ملف الميزانية.");
      }

      const blob = await response.blob();
      downloadBlob(
        blob,
        resolveFilename(
          response,
          `${budget.metadata?.title?.trim() ?? "budget"}.xlsx`
        )
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "حدث خطأ غير متوقع أثناء التصدير."
      );
    } finally {
      setExporting(false);
    }
  };

  return {
    title,
    setTitle,
    scenario,
    setScenario,
    analysis,
    budget,
    runtimeMeta,
    analyzing,
    generating,
    exporting,
    restoringState,
    persistedAt,
    error,
    totalLineItems,
    handleAnalyze,
    handleGenerate,
    handleExport,
  };
}
