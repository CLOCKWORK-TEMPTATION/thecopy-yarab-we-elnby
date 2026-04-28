/* eslint-disable */
// CineArchitect AI - Cinema Skills Trainer Utilities
// دوال المساعدة للمدرب الافتراضي

import { TRAINING_CATEGORIES, type TrainingCategory } from "./types";

export function isTrainingCategory(value: unknown): value is TrainingCategory {
  return (
    typeof value === "string" &&
    TRAINING_CATEGORIES.includes(value as TrainingCategory)
  );
}

export function createSkillLevels(): Record<TrainingCategory, number> {
  return {
    "camera-operation": 0,
    "lighting-setup": 0,
    "sound-recording": 0,
    directing: 0,
    "set-design": 0,
    "color-grading": 0,
    "visual-effects": 0,
    "production-management": 0,
  };
}

export function getSkillLevel(
  skillLevels: Record<TrainingCategory, number>,
  category: TrainingCategory,
): number {
  return skillLevels[category] ?? 0;
}

export function setSkillLevel(
  skillLevels: Record<TrainingCategory, number>,
  category: TrainingCategory,
  value: number,
): void {
  skillLevels[category] = value;
}

export function incrementCategoryCount(
  counts: Record<TrainingCategory, number>,
  category: TrainingCategory,
): void {
  setSkillLevel(counts, category, getSkillLevel(counts, category) + 1);
}

export function generateRecommendations(
  categoryScores: Record<string, number>,
  category: string,
): string[] {
  const recommendations: string[] = [];
  const techniqueScore = categoryScores["technique"] ?? 0;
  const accuracyScore = categoryScores["accuracy"] ?? 0;
  const timingScore = categoryScores["timing"] ?? 0;

  if (techniqueScore < 80) {
    recommendations.push(`Review ${category} fundamentals`);
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
  currentDifficulty: "beginner" | "intermediate" | "advanced" | "expert",
  currentCategory: string,
  currentId: string,
  score: number,
): { targetDifficulty: typeof currentDifficulty; reason: string } {
  const difficultyOrder: Array<typeof currentDifficulty> = [
    "beginner",
    "intermediate",
    "advanced",
    "expert",
  ];
  const currentDifficultyIndex = difficultyOrder.indexOf(currentDifficulty);

  let targetDifficulty = currentDifficulty;
  let reason = `Continue practicing ${currentCategory} after ${currentId}`;

  if (score >= 85 && currentDifficultyIndex < difficultyOrder.length - 1) {
    targetDifficulty =
      difficultyOrder[currentDifficultyIndex + 1] ?? currentDifficulty;
    reason = "Excellent performance! Move to next level";
  } else if (score < 60 && currentDifficultyIndex > 0) {
    targetDifficulty =
      difficultyOrder[currentDifficultyIndex - 1] ?? currentDifficulty;
    reason = "Review fundamentals before continuing";
  }

  return { targetDifficulty, reason };
}
