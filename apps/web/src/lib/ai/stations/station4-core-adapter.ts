import type { Station4Output } from "./station4-efficiency-metrics";
import type { Station4Output as CoreStation4Output } from "../core/models/station-4-types";

function normalizeActPace(value: string): "slow" | "medium" | "fast" {
  if (value === "slow" || value === "very_slow") return "slow";
  if (value === "fast" || value === "very_fast") return "fast";
  return "medium";
}

function average(values: number[], fallback: number): number {
  return values.length > 0
    ? values.reduce((total, value) => total + value, 0) / values.length
    : fallback;
}

function estimateShootingDays(station4Output: Station4Output): number {
  const sceneCount = station4Output.rhythmAnalysis.sceneLengths.length;
  return sceneCount > 0
    ? Math.max(1, Math.ceil(sceneCount / 6))
    : Math.max(1, Math.ceil(station4Output.producibilityAnalysis.castSize / 4));
}

export function toCoreStation4Output(
  station4Output: Station4Output
): CoreStation4Output {
  const sceneCount = station4Output.rhythmAnalysis.sceneLengths.length;
  const actCount = Math.max(
    1,
    station4Output.rhythmAnalysis.actBreakdown.length
  );

  return {
    efficiencyMetrics: station4Output.efficiencyMetrics,
    qualityAssessment: station4Output.qualityAssessment,
    producibilityAnalysis: {
      technicalFeasibility:
        station4Output.producibilityAnalysis.technicalFeasibility,
      budgetEstimate: station4Output.producibilityAnalysis.budgetEstimate,
      productionChallenges:
        station4Output.producibilityAnalysis.productionChallenges.map(
          (challenge) => ({
            challenge: challenge.description || challenge.type,
            severity: challenge.severity,
            solution: "مطلوب تقدير إنتاجي تفصيلي لمعالجة هذا التحدي.",
          })
        ),
      locationRequirements:
        station4Output.producibilityAnalysis.locationRequirements,
      specialEffectsNeeded:
        station4Output.producibilityAnalysis.specialEffectsNeeded,
      castSize: station4Output.producibilityAnalysis.castSize,
      shootingDays: estimateShootingDays(station4Output),
    },
    rhythmAnalysis: {
      overallPace: station4Output.rhythmAnalysis.overallPace,
      paceVariation: station4Output.rhythmAnalysis.paceVariation,
      sceneLengths: station4Output.rhythmAnalysis.sceneLengths,
      actBreakdown: station4Output.rhythmAnalysis.actBreakdown.map((act) => ({
        act: act.act,
        pace: normalizeActPace(act.averagePace),
        scenes: Math.max(1, Math.ceil(sceneCount / actCount)),
        pagePercentage: 100 / actCount,
        effectiveness: average(act.tensionProgression, 5),
      })),
      recommendations: station4Output.rhythmAnalysis.recommendations,
    },
    recommendations: station4Output.recommendations,
    metadata: {
      stationId: 4,
      processingTime: station4Output.metadata.analysisTime,
      timestamp: station4Output.metadata.analysisTimestamp,
      version: "1.0.0",
    },
    uncertaintyReport: {
      overallConfidence: station4Output.uncertaintyReport.overallConfidence,
      detailedUncertainties: station4Output.uncertaintyReport.uncertainties.map(
        (uncertainty) => ({
          category: uncertainty.aspect,
          confidence:
            uncertainty.type === "epistemic"
              ? station4Output.uncertaintyReport.overallConfidence
              : station4Output.uncertaintyReport.overallConfidence * 0.9,
          explanation: uncertainty.note,
        })
      ),
    },
  };
}
