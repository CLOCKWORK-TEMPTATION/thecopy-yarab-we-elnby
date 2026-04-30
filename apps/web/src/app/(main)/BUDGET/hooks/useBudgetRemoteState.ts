"use client";

import { useEffect, useState } from "react";

import {
  loadRemoteAppState,
  persistRemoteAppState,
} from "@/lib/app-state-client";

import {
  loadBudgetFromLocalStorage,
  saveBudgetToLocalStorage,
} from "../lib/budget-local-storage";
import { BUDGET_APP_STATE_ID } from "../lib/budget-page-utils";

import type {
  BudgetAnalysis,
  BudgetDocument,
  BudgetPersistedState,
  BudgetRuntimeMeta,
} from "../types";

const REMOTE_STATE_TIMEOUT_MS = 5000;

interface BudgetRemoteStateConfig {
  setTitle: (title: string) => void;
  setScenario: (scenario: string) => void;
  setBudget: (budget: BudgetDocument | null) => void;
  setAnalysis: (analysis: BudgetAnalysis | null) => void;
  setRuntimeMeta: (meta: BudgetRuntimeMeta | null) => void;
}

async function loadRemoteWithTimeout<T extends object>(
  appId: typeof BUDGET_APP_STATE_ID,
): Promise<T | null> {
  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), REMOTE_STATE_TIMEOUT_MS),
  );
  try {
    const result = await Promise.race([
      loadRemoteAppState<T>(appId).catch(() => null),
      timeout,
    ]);
    return result;
  } catch {
    return null;
  }
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
    nextState: Omit<BudgetPersistedState, "persistedAt">,
  ) => {
    const nextPersistedAt = new Date().toISOString();
    const fullState: BudgetPersistedState = {
      ...nextState,
      persistedAt: nextPersistedAt,
    };

    // Always persist locally first so data is never lost
    saveBudgetToLocalStorage(fullState);
    setPersistedAt(nextPersistedAt);

    // Best-effort remote persist; failures are silent
    try {
      await persistRemoteAppState(BUDGET_APP_STATE_ID, fullState);
    } catch {
      // remote unavailable — local copy already saved
    }
  };

  useEffect(() => {
    let cancelled = false;

    const restoreState = async () => {
      try {
        // Try remote first with a timeout, fall back to localStorage
        const remote =
          await loadRemoteWithTimeout<BudgetPersistedState>(BUDGET_APP_STATE_ID);

        if (cancelled) return;

        const savedState = remote ?? loadBudgetFromLocalStorage();

        if (!savedState) {
          setPersistedAt(null);
          return;
        }

        applyState(savedState);
      } catch {
        if (cancelled) return;
        const localState = loadBudgetFromLocalStorage();
        if (localState) applyState(localState);
      } finally {
        if (!cancelled) setRestoringState(false);
      }
    };

    const applyState = (state: BudgetPersistedState) => {
      setTitle(state.title ?? "");
      setScenario(state.scenario ?? "");
      setBudget(state.budget);
      setAnalysis(state.analysis);
      setRuntimeMeta(state.meta);
      setPersistedAt(state.persistedAt ?? state.meta?.generatedAt ?? null);
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
