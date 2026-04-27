import { PromptHistoryEntry, PersistedPromptHistoryEntry } from "../types";

export function restorePromptHistory(
  history: PersistedPromptHistoryEntry[] | undefined
): PromptHistoryEntry[] {
  return (history ?? []).map((entry) => ({
    ...entry,
    timestamp: new Date(entry.timestamp),
  }));
}

export function persistPromptHistory(
  history: PromptHistoryEntry[]
): PersistedPromptHistoryEntry[] {
  return history.map((entry) => ({
    ...entry,
    timestamp: entry.timestamp.toISOString(),
  }));
}
