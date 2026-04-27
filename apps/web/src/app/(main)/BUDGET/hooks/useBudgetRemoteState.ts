"use client";

import { useEffect, useState } from "react";

import {
  loadRemoteAppState,
  persistRemoteAppState,
} from "@/lib/app-state-client";

import { BUDGET_APP_STATE_ID } from "../lib/budget-page-utils";

import type {
  BudgetAnalysis,
  BudgetDocument,
  BudgetPersistedState,
  BudgetRuntimeMeta,
} from "../types";

interface BudgetRemoteStateConfig {
  setTitle: (title: string) => void;
  setScenario: (scenario: string) => void;
  setBudget: (budget: BudgetDocument | null) => void;
  setAnalysis: (analysis: BudgetAnalysis | null) => void;
  setRuntimeMeta: (meta: BudgetRuntimeMeta | null) => void;
}

export function useBudgetRemoteState({
  setTitle,
  setScenario,
  setBudget,
  setAnalysis,
  setRuntimeMeta,
}: BudgetRemoteStateConfig) {
  const [restoringState, setRestoringState] = useState(true);
  const [persistedAt, setPersistedAt] = useState<string | null>(null);

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

        if (cancelled) return;
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
  }, [setAnalysis, setBudget, setRuntimeMeta, setScenario, setTitle]);

  return {
    restoringState,
    persistedAt,
    persistBudgetState,
  };
}
