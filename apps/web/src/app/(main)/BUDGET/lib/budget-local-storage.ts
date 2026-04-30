import type { BudgetPersistedState } from "../types";

const LS_KEY = "the-copy__budget-studio";
const LS_VERSION = 1;

interface VersionedStore {
  v: number;
  state: BudgetPersistedState;
}

function tryParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveBudgetToLocalStorage(state: BudgetPersistedState): void {
  try {
    const stored: VersionedStore = { v: LS_VERSION, state };
    localStorage.setItem(LS_KEY, JSON.stringify(stored));
  } catch {
    // localStorage full, unavailable, or non-browser environment
  }
}

export function loadBudgetFromLocalStorage(): BudgetPersistedState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const stored = tryParseJson<VersionedStore>(raw);
    if (stored?.v !== LS_VERSION || !stored?.state) return null;
    return stored.state;
  } catch {
    return null;
  }
}

export function clearBudgetFromLocalStorage(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // ignore
  }
}
