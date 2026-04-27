import type { Station3Output } from "../station3-network-builder";
import type {
  EfficiencyMetrics,
  LiteraryQualityAssessment,
  ProducibilityAnalysis,
} from "./types";

export function calculateGiniCoefficient(
  conflictNetwork: Station3Output["conflictNetwork"]
): number {
  // Simplified Gini coefficient calculation for character involvement
  const characterInvolvement: number[] = [];

  // Count conflicts per character
  for (const [characterId] of conflictNetwork.characters) {
    let involvementCount = 0;

    // Count direct conflicts
    for (const [, conflict] of conflictNetwork.conflicts) {
      if (conflict.involvedCharacters.includes(characterId)) {
        involvementCount++;
      }
    }

    characterInvolvement.push(involvementCount);
  }

  // Sort values
  characterInvolvement.sort((a, b) => a - b);

  // Calculate Gini coefficient
  const n = characterInvolvement.length;
  if (n === 0) return 0;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (2 * (i + 1) - n - 1) * characterInvolvement[i]!;
  }

  const totalInvolvement = characterInvolvement.reduce((a, b) => a + b, 0);

  if (totalInvolvement === 0) return 0;

  return sum / (n * totalInvolvement);
}

export function calculateEfficiencyMetrics(
  conflictNetwork: Station3Output["conflictNetwork"]
): EfficiencyMetrics {
  // Calculate basic metrics from the conflict network
  const charactersCount = conflictNetwork.characters.size;
  const relationshipsCount = conflictNetwork.relationships.size;
  const conflictsCount = conflictNetwork.conflicts.size;

  // Calculate efficiency scores
  const characterEfficiency = Math.min(
    100,
    Math.max(0, 100 - (charactersCount - 7) * 5)
  );
  const relationshipEfficiency = Math.min(
    100,
    Math.max(0, 100 - (relationshipsCount - charactersCount * 1.5) * 3)
  );
  const conflictEfficiency = Math.min(
    100,
    Math.max(0, 100 - (conflictsCount - charactersCount * 0.8) * 4)
  );

  // Calculate narrative efficiency
  const narrativeEfficiency = {
    characterEfficiency,
    relationshipEfficiency,
    conflictEfficiency,
  };

  // Calculate overall efficiency score
  const overallEfficiencyScore =
    characterEfficiency * 0.3 +
    relationshipEfficiency * 0.3 +
    conflictEfficiency * 0.4;

  // Determine overall rating
  let overallRating: "Excellent" | "Good" | "Fair" | "Poor" | "Critical";
  if (overallEfficiencyScore >= 80) overallRating = "Excellent";
  else if (overallEfficiencyScore >= 60) overallRating = "Good";
  else if (overallEfficiencyScore >= 40) overallRating = "Fair";
  else if (overallEfficiencyScore >= 20) overallRating = "Poor";
  else overallRating = "Critical";

  // Calculate conflict cohesion (simplified)
  const conflictCohesion = Math.min(
    1,
    Math.max(0, conflictsCount / charactersCount)
  );

  // Calculate dramatic balance
  const dramaticBalance = {
    balanceScore: Math.min(
      1,
      Math.max(0, 1 - Math.abs(1 - conflictsCount / charactersCount))
    ),
    characterInvolvementGini: calculateGiniCoefficient(conflictNetwork),
  };

  // Calculate narrative density
  const narrativeDensity =
    (conflictsCount + relationshipsCount) / charactersCount;

  // Calculate redundancy metrics
  const redundancyMetrics = {
    characterRedundancy: Math.max(0, (charactersCount - 7) / charactersCount),
    relationshipRedundancy: Math.max(
      0,
      (relationshipsCount - charactersCount * 1.5) / relationshipsCount
    ),
    conflictRedundancy: Math.max(
      0,
      (conflictsCount - charactersCount * 0.8) / conflictsCount
    ),
  };

  return {
    overallEfficiencyScore,
    overallRating,
    conflictCohesion,
    dramaticBalance,
    narrativeEfficiency,
    narrativeDensity,
    redundancyMetrics,
  };
}

export function calculateCommercialPotential(
  literaryQuality: LiteraryQualityAssessment,
  producibility: ProducibilityAnalysis
): number {
  // Simplified commercial potential calculation
  const literaryScore = literaryQuality.overallQuality;
  const technicalScore = producibility.technicalFeasibility * 10;

  // Budget factor (medium budget is optimal)
  let budgetScore = 50;
  if (producibility.budgetEstimate === "low") budgetScore = 40;
  else if (producibility.budgetEstimate === "medium") budgetScore = 70;
  else if (producibility.budgetEstimate === "high") budgetScore = 60;
  else if (producibility.budgetEstimate === "very_high") budgetScore = 30;

  // Cast size factor (5-10 is optimal)
  let castScore: number;
  if (producibility.castSize <= 5) castScore = 40;
  else if (producibility.castSize <= 10) castScore = 70;
  else if (producibility.castSize <= 15) castScore = 60;
  else castScore = 30;

  return Math.round(
    literaryScore * 0.4 +
      technicalScore * 0.2 +
      budgetScore * 0.2 +
      castScore * 0.2
  );
}
