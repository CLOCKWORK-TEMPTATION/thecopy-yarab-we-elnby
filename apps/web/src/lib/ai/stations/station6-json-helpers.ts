/**
 * @fileoverview JSON parsing helpers for Station 6 — Diagnostics & Treatment.
 * Extracted from station6-diagnostics-treatment.ts to keep file ≤ 600 lines.
 */

import type { JsonRecord } from "./station6-types";

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
