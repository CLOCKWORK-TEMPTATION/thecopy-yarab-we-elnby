import type { JsonRecord } from "./types";

type PreviousStationsOutput = Partial<
  Record<
    "station1" | "station2" | "station3" | "station4" | "station5",
    JsonRecord
  >
>;

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

export function asJsonRecord(value: unknown): JsonRecord {
  return isJsonRecord(value) ? value : {};
}

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function asJsonNumber(value: unknown, fallback: number): number {
  return Math.min(Math.max(asNumber(value, fallback), 0), 100);
}

export function firstJsonObject(text: string): string | null {
  return /\{[\s\S]*\}/.exec(text)?.[0] ?? null;
}