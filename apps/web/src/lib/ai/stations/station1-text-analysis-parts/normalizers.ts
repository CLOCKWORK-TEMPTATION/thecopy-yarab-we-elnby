import type { DialogueMetrics } from "./types";

export function normalizeRole(
  role: string
): "protagonist" | "antagonist" | "supporting" | "minor" {
  const normalized = role.toLowerCase();
  if (normalized.includes("protag") || normalized.includes("بطل"))
    return "protagonist";
  if (normalized.includes("antag") || normalized.includes("خصم"))
    return "antagonist";
  if (normalized.includes("support") || normalized.includes("مساعد"))
    return "supporting";
  return "minor";
}

export function normalizeArcType(
  type: string
): "positive" | "negative" | "flat" | "complex" {
  const normalized = type.toLowerCase();
  if (normalized.includes("positive") || normalized.includes("إيجابي"))
    return "positive";
  if (normalized.includes("negative") || normalized.includes("سلبي"))
    return "negative";
  if (normalized.includes("complex") || normalized.includes("معقد"))
    return "complex";
  return "flat";
}

export function normalizeIssues(issues: unknown[]): DialogueMetrics["issues"] {
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

  const asString = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (value === undefined || value === null) return "";
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    // For objects/arrays/symbols, JSON-encode to avoid "[object Object]".
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  };

  return issues
    .filter(
      (i): i is Record<string, unknown> =>
        isRecord(i) &&
        typeof i["type"] === "string" &&
        i["location"] !== undefined &&
        i["location"] !== null
    )
    .map((i) => ({
      type: normalizeIssueType(asString(i["type"])),
      location: asString(i["location"]),
      severity: normalizeSeverity(asString(i["severity"])),
      suggestion: asString(i["suggestion"] ?? ""),
    }));
}

export function normalizeIssueType(
  type: string
):
  | "redundancy"
  | "inconsistency"
  | "exposition_dump"
  | "on_the_nose"
  | "pacing" {
  const normalized = type.toLowerCase();
  if (normalized.includes("redundan")) return "redundancy";
  if (normalized.includes("inconsist")) return "inconsistency";
  if (normalized.includes("exposition")) return "exposition_dump";
  if (normalized.includes("nose")) return "on_the_nose";
  return "pacing";
}

export function normalizeSeverity(severity: string): "low" | "medium" | "high" {
  const normalized = (severity || "").toLowerCase();
  if (normalized.includes("high") || normalized.includes("عالي")) return "high";
  if (normalized.includes("low") || normalized.includes("منخفض")) return "low";
  return "medium";
}

export function normalizePacingSpeed(
  speed: string
): "very_slow" | "slow" | "moderate" | "fast" | "very_fast" {
  const normalized = (speed || "").toLowerCase();
  if (normalized.includes("very_slow") || normalized.includes("بطيء جداً"))
    return "very_slow";
  if (normalized.includes("slow") || normalized.includes("بطيء")) return "slow";
  if (normalized.includes("fast") && normalized.includes("very"))
    return "very_fast";
  if (normalized.includes("fast") || normalized.includes("سريع")) return "fast";
  return "moderate";
}

export function normalizeComplexity(
  complexity: string
): "simple" | "moderate" | "complex" | "highly_complex" {
  const normalized = (complexity || "").toLowerCase();
  if (normalized.includes("highly") || normalized.includes("معقد جداً"))
    return "highly_complex";
  if (normalized.includes("complex") || normalized.includes("معقد"))
    return "complex";
  if (normalized.includes("simple") || normalized.includes("بسيط"))
    return "simple";
  return "moderate";
}

export function normalizeVocabulary(
  vocabulary: string
): "limited" | "standard" | "rich" | "extensive" {
  const normalized = (vocabulary || "").toLowerCase();
  if (normalized.includes("extensive") || normalized.includes("واسع"))
    return "extensive";
  if (normalized.includes("rich") || normalized.includes("ثري")) return "rich";
  if (normalized.includes("limited") || normalized.includes("محدود"))
    return "limited";
  return "standard";
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
