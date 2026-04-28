/**
 * @fileoverview Score calculation helpers for Station 7.
 * Extracted from station7-finalization.ts to keep each file ≤ 500 lines.
 */

import type { Station1Output } from "./station1-text-analysis";
import type { Station2Output } from "./station2-conceptual-analysis";
import type { Station3Output } from "./station3-network-builder";
import type { Station4Output } from "./station4-efficiency-metrics";
import type { Station5Output } from "./station5-dynamic-symbolic-stylistic";
import type { Station6Output } from "./station6-diagnostics-treatment";
import type {
  ScoreMatrix,
  Station7Output,
  StationScoreLike,
} from "./station7-types";

export interface StationScoreInputs {
  station1?: Station1Output;
  station2?: Station2Output;
  station3?: Station3Output;
  station4?: Station4Output;
  station5?: Station5Output;
  station6?: Station6Output;
}

// ---------------------------------------------------------------------------
// Type guard helpers
// ---------------------------------------------------------------------------

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

export function toStationScoreLike(value: unknown): StationScoreLike | null {
  const record = asRecord(value);
  if (!record) return null;

  const score: StationScoreLike = {};
  const confidence = record["confidence"];
  const qualityScore = record["qualityScore"];
  const overallScore = record["overallScore"];

  if (typeof confidence === "number") score.confidence = confidence;
  if (typeof qualityScore === "number") score.qualityScore = qualityScore;
  if (typeof overallScore === "number") score.overallScore = overallScore;

  return score;
}

// ---------------------------------------------------------------------------
// Score matrix
// ---------------------------------------------------------------------------

export function calculateScoreMatrix({
  station1: s1,
  station2: s2,
  station3: s3,
  station4: s4,
  station5: s5,
  station6: s6,
}: StationScoreInputs): ScoreMatrix {
  const foundation = calculateStationScore(s1);
  const conceptual = calculateStationScore(s2);
  const conflictNetwork = calculateStationScore(s3);
  const efficiency = s4?.efficiencyMetrics?.overallEfficiencyScore ?? 0;
  const dynamicSymbolic = calculateStation5Score(s5);
  const diagnostics = s6?.diagnosticsReport?.overallHealthScore ?? 0;

  const weights = {
    foundation: 0.15,
    conceptual: 0.15,
    conflictNetwork: 0.2,
    efficiency: 0.2,
    dynamicSymbolic: 0.15,
    diagnostics: 0.15,
  };

  const overall =
    foundation * weights.foundation +
    conceptual * weights.conceptual +
    conflictNetwork * weights.conflictNetwork +
    efficiency * weights.efficiency +
    dynamicSymbolic * weights.dynamicSymbolic +
    diagnostics * weights.diagnostics;

  return {
    foundation,
    conceptual,
    conflictNetwork,
    efficiency,
    dynamicSymbolic,
    diagnostics,
    overall: Math.round(overall * 100) / 100,
  };
}

export function calculateStationScore(station: unknown): number {
  const stationScore = toStationScoreLike(station);
  if (!stationScore) return 0;
  const scores = [];
  if (typeof stationScore.confidence === "number")
    scores.push(stationScore.confidence);
  if (typeof stationScore.qualityScore === "number")
    scores.push(stationScore.qualityScore);
  if (typeof stationScore.overallScore === "number")
    scores.push(stationScore.overallScore);
  return scores.length > 0
    ? scores.reduce((a, b) => a + b) / scores.length
    : 50;
}

export function calculateStation5Score(s5?: Station5Output): number {
  if (!s5) return 0;
  const scores = [];
  if (s5.symbolicAnalysis?.depthScore)
    scores.push(s5.symbolicAnalysis.depthScore * 10);
  if (s5.symbolicAnalysis?.consistencyScore)
    scores.push(s5.symbolicAnalysis.consistencyScore * 10);
  if (s5.stylisticAnalysis?.toneAssessment?.toneConsistency) {
    scores.push(s5.stylisticAnalysis.toneAssessment.toneConsistency * 10);
  }
  return scores.length > 0
    ? scores.reduce((a, b) => a + b) / scores.length
    : 50;
}

// ---------------------------------------------------------------------------
// Overall assessment helpers
// ---------------------------------------------------------------------------

export function calculateCharacterScore(s3?: Station3Output): number {
  if (!s3?.networkAnalysis) return 50;
  const scores = [];
  if (s3.networkAnalysis.complexity)
    scores.push(s3.networkAnalysis.complexity * 100);
  if (s3.networkAnalysis.balance) scores.push(s3.networkAnalysis.balance * 100);
  return scores.length > 0
    ? scores.reduce((a, b) => a + b) / scores.length
    : 50;
}

export function calculateConflictScore(
  s3?: Station3Output,
  s4?: Station4Output
): number {
  if (!s3 && !s4) return 50;
  const scores = [];
  if (s4?.efficiencyMetrics?.conflictCohesion)
    scores.push(s4.efficiencyMetrics.conflictCohesion * 100);
  if (s3?.networkAnalysis?.density)
    scores.push(s3.networkAnalysis.density * 100);
  return scores.length > 0
    ? scores.reduce((a, b) => a + b) / scores.length
    : 50;
}

export function determineRating(
  score: number
): "Masterpiece" | "Excellent" | "Good" | "Fair" | "Needs Work" {
  if (score >= 90) return "Masterpiece";
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  return "Needs Work";
}

// ---------------------------------------------------------------------------
// Final confidence calculation
// ---------------------------------------------------------------------------

export function calculateFinalConfidence({
  station1: s1,
  station2: s2,
  station3: s3,
  station4: s4,
  station5: s5,
  station6: s6,
}: StationScoreInputs): Station7Output["finalConfidence"] {
  const stationConfidences = new Map<string, number>();

  if (s1?.uncertaintyReport?.confidence)
    stationConfidences.set("station1", s1.uncertaintyReport.confidence);
  if (s2?.metadata?.confidenceScore)
    stationConfidences.set("station2", s2.metadata.confidenceScore);
  if (s3?.uncertaintyReport?.confidence)
    stationConfidences.set("station3", s3.uncertaintyReport.confidence);
  if (s4?.uncertaintyReport?.overallConfidence)
    stationConfidences.set("station4", s4.uncertaintyReport.overallConfidence);
  if (s5?.uncertaintyReport?.overallConfidence)
    stationConfidences.set("station5", s5.uncertaintyReport.overallConfidence);
  if (s6?.uncertaintyReport?.overallConfidence)
    stationConfidences.set("station6", s6.uncertaintyReport.overallConfidence);

  const confidenceValues = Array.from(stationConfidences.values());
  const overallConfidence =
    confidenceValues.length > 0
      ? confidenceValues.reduce((a, b) => a + b) / confidenceValues.length
      : 0.7;

  const epistemicUncertainties: string[] = [];
  const aleatoricUncertainties: string[] = [];
  const resolvableIssues: string[] = [];

  [s1, s3, s4, s5, s6].forEach((station) => {
    if (station?.uncertaintyReport?.uncertainties) {
      station.uncertaintyReport.uncertainties.forEach((uncertainty) => {
        const description = `${uncertainty.aspect}: ${uncertainty.note}`;
        if (uncertainty.type === "epistemic") {
          epistemicUncertainties.push(description);
          if ("reducible" in uncertainty && uncertainty.reducible) {
            resolvableIssues.push(description);
          }
        } else if (uncertainty.type === "aleatoric") {
          aleatoricUncertainties.push(description);
        }
      });
    }
  });

  return {
    overallConfidence: Math.round(overallConfidence * 100) / 100,
    stationConfidences,
    uncertaintyAggregation: {
      epistemicUncertainties: [...new Set(epistemicUncertainties)],
      aleatoricUncertainties: [...new Set(aleatoricUncertainties)],
      resolvableIssues: [...new Set(resolvableIssues)],
    },
  };
}

// ---------------------------------------------------------------------------
// Metadata helpers
// ---------------------------------------------------------------------------

export function extractAgentsUsed({
  station1: s1,
  station3: s3,
  station4: s4,
  station5: s5,
  station6: s6,
}: StationScoreInputs): string[] {
  const agents = new Set<string>();
  [s1, s3, s4, s5, s6].forEach((station) => {
    if (
      station?.metadata?.agentsUsed &&
      Array.isArray(station.metadata.agentsUsed)
    ) {
      station.metadata.agentsUsed.forEach((agent: string) => agents.add(agent));
    }
  });
  return Array.from(agents);
}

export function calculateTotalTokens({
  station4: s4,
}: StationScoreInputs): number {
  let total = 0;
  if (s4?.metadata?.tokensUsed && typeof s4.metadata.tokensUsed === "number") {
    total += s4.metadata.tokensUsed;
  }
  return total;
}
