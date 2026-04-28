// Evaluation Utilities

import type {
  PerformanceEvaluation,
  TrainingScenario,
  SkillWeights,
} from "../types";

export const skillWeights: SkillWeights = {
  accuracy: 0.25,
  timing: 0.2,
  technique: 0.3,
  creativity: 0.15,
  safety: 0.1,
};

export function calculateOverallScore(
  metrics: Partial<Record<keyof SkillWeights, number>>
): number {
  const weights = skillWeights;
  return Math.round(
    (metrics.accuracy ?? 70) * weights.accuracy +
      (metrics.timing ?? 70) * weights.timing +
      (metrics.technique ?? 70) * weights.technique +
      (metrics.creativity ?? 70) * weights.creativity +
      (metrics.safety ?? 100) * weights.safety
  );
}

export function generateRecommendations(
  evaluation: PerformanceEvaluation,
  scenario: TrainingScenario
): string[] {
  const recommendations: string[] = [];
  const techniqueScore = evaluation.categoryScores["technique"] ?? 0;
  const accuracyScore = evaluation.categoryScores["accuracy"] ?? 0;
  const timingScore = evaluation.categoryScores["timing"] ?? 0;

  if (techniqueScore < 80) {
    recommendations.push(`Review ${scenario.category} fundamentals`);
  }
  if (accuracyScore < 75) {
    recommendations.push("Practice precision exercises");
  }
  if (timingScore < 75) {
    recommendations.push("Work on time management and pacing");
  }

  if (recommendations.length === 0) {
    recommendations.push("Ready to advance to more challenging scenarios");
  }

  return recommendations;
}

export function suggestNextScenarios(
  currentScenario: TrainingScenario,
  score: number,
  allScenarios: TrainingScenario[]
): string[] {
  const difficultyOrder: (
    | "beginner"
    | "intermediate"
    | "advanced"
    | "expert"
  )[] = ["beginner", "intermediate", "advanced", "expert"];
  const currentDifficultyIndex = difficultyOrder.indexOf(
    currentScenario.difficulty
  );

  let targetDifficulty: "beginner" | "intermediate" | "advanced" | "expert" =
    currentScenario.difficulty;
  if (score >= 85 && currentDifficultyIndex < difficultyOrder.length - 1) {
    const nextDifficulty = difficultyOrder[currentDifficultyIndex + 1];
    if (nextDifficulty) {
      targetDifficulty = nextDifficulty;
    }
  } else if (score < 60 && currentDifficultyIndex > 0) {
    const previousDifficulty = difficultyOrder[currentDifficultyIndex - 1];
    if (previousDifficulty) {
      targetDifficulty = previousDifficulty;
    }
  }

  return allScenarios
    .filter(
      (s) =>
        s.category === currentScenario.category &&
        s.difficulty === targetDifficulty &&
        s.id !== currentScenario.id
    )
    .slice(0, 3)
    .map((s) => s.id);
}
