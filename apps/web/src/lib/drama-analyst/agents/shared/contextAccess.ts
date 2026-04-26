import type { StandardAgentInput } from "./standardAgentPattern";

export type AgentContext = Record<string, unknown>;

export function asAgentContext(
  context: StandardAgentInput["context"]
): AgentContext {
  return typeof context === "object" && context !== null ? context : {};
}

export function readString(
  context: AgentContext,
  key: string,
  fallback = ""
): string {
  const value = context[key];
  return typeof value === "string" ? value : fallback;
}

export function readStringArray(context: AgentContext, key: string): string[] {
  const value = context[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function readRecord(
  context: AgentContext,
  key: string
): Record<string, unknown> {
  const value = context[key];
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readRecordArray(
  context: AgentContext,
  key: string
): Record<string, unknown>[] {
  const value = context[key];
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && !Array.isArray(item)
      )
    : [];
}

export function recordString(
  record: Record<string, unknown>,
  key: string,
  fallback = ""
): string {
  const value = record[key];
  return typeof value === "string" ? value : fallback;
}

export function recordText(
  record: Record<string, unknown>,
  key: string
): string | null {
  const value = record[key];
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return null;
}
