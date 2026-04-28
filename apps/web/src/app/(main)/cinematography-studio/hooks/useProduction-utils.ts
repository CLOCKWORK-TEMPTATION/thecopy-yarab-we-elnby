// Utils for useProduction hook

import type { ShotAnalysis } from "../../types";

/**
 * حد المهلة لمسار التحليل البعيد (ms).
 */
export const REMOTE_ANALYSIS_TIMEOUT_MS = 12_000;

export function normalizeShotAnalysis(
  validation:
    | {
        score?: number;
        status?: string;
        exposure?: string;
        composition?: string;
        focus?: string;
        colorBalance?: string;
        suggestions?: string[];
        improvements?: string[];
      }
    | undefined
): ShotAnalysis {
  const issues = [
    ...(validation?.suggestions ?? []),
    ...(validation?.improvements ?? []),
  ].filter((value, index, array) => array.indexOf(value) === index);

  return {
    score: clampScore(validation?.score),
    dynamicRange: validation?.composition ?? validation?.exposure ?? "غير متاح",
    grainLevel: validation?.focus ?? validation?.colorBalance ?? "غير متاح",
    issues,
    exposure: clampScore(validation?.score),
  };
}

export function clampScore(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}