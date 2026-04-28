"use client";

import type { VisualIssue, VisualAnalysisData } from "./types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isVisualIssue(value: unknown): value is VisualIssue {
  if (!isRecord(value)) return false;

  return (
    typeof value["type"] === "string" &&
    (value["severity"] === "low" ||
      value["severity"] === "medium" ||
      value["severity"] === "high")
  );
}

export function isVisualAnalysisData(value: unknown): value is VisualAnalysisData {
  if (!isRecord(value)) return false;

  return (
    typeof value["consistent"] === "boolean" &&
    typeof value["score"] === "number" &&
    Array.isArray(value["issues"]) &&
    value["issues"].every(isVisualIssue) &&
    Array.isArray(value["suggestions"]) &&
    value["suggestions"].every((item) => typeof item === "string")
  );
}
