"use client";

import { useMemo, useState } from "react";

import { countBudgetLineItems } from "../lib/budget-selectors";

import { useBudgetActions } from "./useBudgetActions";
import { useBudgetItemsEditor } from "./useBudgetItemsEditor";
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
    null,
  );

  // Editor wraps the generated budget and provides item-level mutations
  const editor = useBudgetItemsEditor(budget);

  const totalLineItems = useMemo(
    () => countBudgetLineItems(editor.editedBudget),
    [editor.editedBudget],
  );

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
    saving,
    error,
    handleAnalyze,
    handleGenerate,
    handleExport,
    handleSave,
  } = useBudgetActions({
    title,
    scenario,
    budget,
    editedBudget: editor.editedBudget,
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
    editor,
    runtimeMeta,
    analyzing,
    generating,
    exporting,
    saving,
    restoringState,
    persistedAt,
    error,
    totalLineItems,
    handleAnalyze,
    handleGenerate,
    handleExport,
    handleSave,
  };
}
