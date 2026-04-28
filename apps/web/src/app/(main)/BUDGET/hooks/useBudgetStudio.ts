"use client";

import { useMemo, useState } from "react";

import { countBudgetLineItems } from "../lib/budget-selectors";

import { useBudgetActions } from "./useBudgetActions";
import { useBudgetRemoteState } from "./useBudgetRemoteState";

import type {
  BudgetAnalysis,
  BudgetDocument,
  BudgetRuntimeMeta,
} from "../types";

export function useBudgetStudio() {
  const [title, setTitle] = useState("");
  const [scenario, setScenario] = useState("");
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [budget, setBudget] = useState<BudgetDocument | null>(null);
  const [runtimeMeta, setRuntimeMeta] = useState<BudgetRuntimeMeta | null>(
    null
  );

  const totalLineItems = useMemo(() => countBudgetLineItems(budget), [budget]);

  const { restoringState, persistedAt, persistBudgetState } =
    useBudgetRemoteState({
      setTitle,
      setScenario,
      setBudget,
      setAnalysis,
      setRuntimeMeta,
    });

  const {
    analyzing,
    generating,
    exporting,
    error,
    handleAnalyze,
    handleGenerate,
    handleExport,
  } = useBudgetActions({
    title,
    scenario,
    budget,
    runtimeMeta,
    setTitle,
    setBudget,
    setAnalysis,
    setRuntimeMeta,
    persistBudgetState,
  });

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
