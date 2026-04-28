// CineArchitect AI - Performance Evaluation Service
// خدمة تقييم الأداء

import type {
  PerformanceEvaluation,
  PerformanceMetrics,
  TrainingScenario,
} from "./types";
import {
  PERFORMANCE_WEIGHTS,
  DIFFICULTY_ORDER,
  TRAINING_SCENARIOS,
} from "./constants";

/**
 * Calculates the overall performance score based on metrics.
 */
export function calculateOverallScore(metrics: PerformanceMetrics): number {
  const weights = PERFORMANCE_WEIGHTS;

  return Math.round(
    (metrics.accuracy ?? 70) * weights.accuracy +
      (metrics.timing ?? 70) * weights.timing +
      (metrics.technique ?? 70) * weights.technique +
      (metrics.creativity ?? 70) * weights.creativity +
      (metrics.safety ?? 100) * weights.safety
  );
}

/**
 * Generates a complete performance evaluation.
 */
export function generatePerformanceEvaluation(
  metrics: PerformanceMetrics,
  scenario: TrainingScenario
): PerformanceEvaluation {
  const overallScore = calculateOverallScore(metrics);

  const evaluation: PerformanceEvaluation = {
    overallScore,
    categoryScores: {
      accuracy: metrics.accuracy ?? 70,
      timing: metrics.timing ?? 70,
      technique: metrics.technique ?? 70,
      creativity: metrics.creativity ?? 70,
      safety: metrics.safety ?? 100,
    },
    strengths: [],
    areasForImprovement: [],
    recommendations: [],
    nextScenarios: [],
  };

  // Identify strengths
  if ((metrics.technique ?? 70) >= 80)
    evaluation.strengths.push("Strong technical skills");
  if ((metrics.creativity ?? 70) >= 80)
    evaluation.strengths.push("Creative problem-solving");
  if ((metrics.timing ?? 70) >= 80)
    evaluation.strengths.push("Excellent time management");

  // Identify areas for improvement
  if ((metrics.accuracy ?? 70) < 70)
    evaluation.areasForImprovement.push("Precision and accuracy");
  if ((metrics.technique ?? 70) < 70)
    evaluation.areasForImprovement.push("Technical execution");

  // Generate recommendations
  evaluation.recommendations = generateRecommendations(evaluation, scenario);

  // Suggest next scenarios
  evaluation.nextScenarios = suggestNextScenarios(scenario, overallScore);

  return evaluation;
}

/**
 * Generates personalized recommendations based on performance.
 */
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

/**
 * Suggests next training scenarios based on current performance.
 */
export function suggestNextScenarios(
  currentScenario: TrainingScenario,
  score: number
): string[] {
  const currentDifficultyIndex = DIFFICULTY_ORDER.indexOf(
    currentScenario.difficulty
  );

  let targetDifficulty: "beginner" | "intermediate" | "advanced" | "expert" =
    currentScenario.difficulty;

  if (score >= 85 && currentDifficultyIndex < DIFFICULTY_ORDER.length - 1) {
    const nextDifficulty = DIFFICULTY_ORDER[currentDifficultyIndex + 1];
    if (nextDifficulty) {
      targetDifficulty = nextDifficulty;
    }
  } else if (score < 60 && currentDifficultyIndex > 0) {
    const previousDifficulty = DIFFICULTY_ORDER[currentDifficultyIndex - 1];
    if (previousDifficulty) {
      targetDifficulty = previousDifficulty;
    }
  }

  return TRAINING_SCENARIOS.filter(
    (s) =>
      s.category === currentScenario.category &&
      s.difficulty === targetDifficulty &&
      s.id !== currentScenario.id
  )
    .slice(0, 3)
    .map((s) => s.id);
}
