export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function tryParseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function sanitizeRecommendationList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function hasCompleteMetricSet(
  parsed: Record<string, unknown>
): boolean {
  return [
    "efficiencyMetrics",
    "qualityAssessment",
    "producibilityAnalysis",
    "rhythmAnalysis",
  ].every((key) => isRecord(parsed[key]));
}

export function countRecommendationItems(value: unknown): number {
  if (!isRecord(value)) {
    return 0;
  }

  return ["priorityActions", "quickFixes", "structuralRevisions"].reduce(
    (total, key) =>
      total + sanitizeRecommendationList(value[key]).length,
    0
  );
}
