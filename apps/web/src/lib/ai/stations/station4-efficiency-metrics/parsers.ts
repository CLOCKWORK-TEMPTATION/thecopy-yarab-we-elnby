import {
  isUnknownRecord,
  stringArrayFromUnknown,
  stringifyUnknown,
} from "@/lib/utils/unknown-values";

import {
  defaultLiteraryQuality,
  defaultProducibility,
  defaultRecommendations,
  defaultRhythm,
} from "./defaults";
import type {
  LiteraryQualityAssessment,
  ProducibilityAnalysis,
  RecommendationBuckets,
  RhythmAnalysis,
} from "./types";

export function parseJsonRecord(text: string): Record<string, unknown> | null {
  const parsed: unknown = JSON.parse(text || "{}");
  return isUnknownRecord(parsed) ? parsed : null;
}

export function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function finiteNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is number => typeof item === "number" && Number.isFinite(item)
  );
}

export function parseLiteraryQuality(text: string): LiteraryQualityAssessment {
  const parsed = parseJsonRecord(text);
  if (!parsed) {
    return defaultLiteraryQuality;
  }

  return {
    overallQuality: finiteNumber(parsed["overallQuality"], 50),
    proseQuality: finiteNumber(parsed["proseQuality"], 50),
    structureQuality: finiteNumber(parsed["structureQuality"], 50),
    characterDevelopmentQuality: finiteNumber(
      parsed["characterDevelopmentQuality"],
      50
    ),
    dialogueQuality: finiteNumber(parsed["dialogueQuality"], 50),
    thematicDepth: finiteNumber(parsed["thematicDepth"], 50),
  };
}

export function parseBudgetEstimate(
  value: unknown
): ProducibilityAnalysis["budgetEstimate"] {
  return value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "very_high"
    ? value
    : "medium";
}

export function parseSeverity(
  value: unknown
): ProducibilityAnalysis["productionChallenges"][number]["severity"] {
  return value === "low" || value === "medium" || value === "high"
    ? value
    : "medium";
}

export function parseProductionChallenges(
  value: unknown
): ProducibilityAnalysis["productionChallenges"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((challenge) => {
    if (!isUnknownRecord(challenge)) {
      return [];
    }

    return [
      {
        type: stringifyUnknown(challenge["type"], "unknown"),
        description: stringifyUnknown(challenge["description"]),
        severity: parseSeverity(challenge["severity"]),
      },
    ];
  });
}

export function parseProducibility(text: string): ProducibilityAnalysis {
  const parsed = parseJsonRecord(text);
  if (!parsed) {
    return defaultProducibility;
  }

  return {
    technicalFeasibility: finiteNumber(parsed["technicalFeasibility"], 5),
    budgetEstimate: parseBudgetEstimate(parsed["budgetEstimate"]),
    productionChallenges: parseProductionChallenges(
      parsed["productionChallenges"]
    ),
    locationRequirements: stringArrayFromUnknown(parsed["locationRequirements"]),
    specialEffectsNeeded:
      typeof parsed["specialEffectsNeeded"] === "boolean"
        ? parsed["specialEffectsNeeded"]
        : false,
    castSize: finiteNumber(parsed["castSize"], 5),
  };
}

export function parsePace(value: unknown): RhythmAnalysis["overallPace"] {
  return value === "very_slow" ||
    value === "slow" ||
    value === "medium" ||
    value === "fast" ||
    value === "very_fast"
    ? value
    : "medium";
}

export function parseActBreakdown(value: unknown): RhythmAnalysis["actBreakdown"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((act) => {
    if (!isUnknownRecord(act)) {
      return [];
    }

    return [
      {
        act: finiteNumber(act["act"], 0),
        averagePace: stringifyUnknown(act["averagePace"], "medium"),
        tensionProgression: finiteNumberArray(act["tensionProgression"]),
      },
    ];
  });
}

export function parseRhythm(text: string): RhythmAnalysis {
  const parsed = parseJsonRecord(text);
  if (!parsed) {
    return defaultRhythm;
  }

  return {
    overallPace: parsePace(parsed["overallPace"]),
    paceVariation: finiteNumber(parsed["paceVariation"], 5),
    sceneLengths: finiteNumberArray(parsed["sceneLengths"]),
    actBreakdown: parseActBreakdown(parsed["actBreakdown"]),
    recommendations: stringArrayFromUnknown(parsed["recommendations"]),
  };
}

export function parseRecommendations(text: string): RecommendationBuckets {
  const parsed = parseJsonRecord(text);
  if (!parsed) {
    return defaultRecommendations;
  }

  return {
    priorityActions: stringArrayFromUnknown(parsed["priorityActions"]),
    quickFixes: stringArrayFromUnknown(parsed["quickFixes"]),
    structuralRevisions: stringArrayFromUnknown(parsed["structuralRevisions"]),
  };
}
