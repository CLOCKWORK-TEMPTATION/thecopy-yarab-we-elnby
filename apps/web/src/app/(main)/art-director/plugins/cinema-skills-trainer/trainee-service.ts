// CineArchitect AI - Trainee Progress Service
// خدمة تقدم المتدربين

import { DEFAULT_SKILL_LEVELS, TRAINING_SCENARIOS } from "./constants";

import type {
  TraineeProgress,
  CompletedScenario,
  Achievement,
  TrainingScenario,
  TrainingCategory,
} from "./types";

/**
 * Gets or creates a trainee progress record.
 */
export function getOrCreateTraineeProgress(
  traineeId: string,
  traineeName?: string
): TraineeProgress {
  return {
    traineeId,
    name: traineeName ?? "Trainee",
    completedScenarios: [],
    skillLevels: { ...DEFAULT_SKILL_LEVELS },
    totalTrainingHours: 0,
    achievements: [],
    currentStreak: 0,
  };
}

/**
 * Completes a scenario and updates trainee progress.
 */
export function completeScenario(
  progress: TraineeProgress,
  scenario: TrainingScenario,
  score: number,
  timeSpent: number,
  feedback?: string[]
): {
  completed: CompletedScenario;
  skillIncrease: {
    category: TrainingCategory;
    increase: number;
    newLevel: number;
  };
  newAchievements: Achievement[];
  streak: number;
} {
  const completed: CompletedScenario = {
    scenarioId: scenario.id,
    completedAt: new Date(),
    score,
    timeSpent,
    feedback: feedback ?? [],
  };

  progress.completedScenarios.push(completed);
  progress.totalTrainingHours += timeSpent / 60;
  progress.currentStreak++;

  const skillIncrease = Math.round(score / 10);
  progress.skillLevels[scenario.category] = Math.min(
    100,
    (progress.skillLevels[scenario.category] || 0) + skillIncrease
  );

  const newAchievements = generateAchievements(progress, scenario, score);
  progress.achievements.push(...newAchievements);

  return {
    completed,
    skillIncrease: {
      category: scenario.category,
      increase: skillIncrease,
      newLevel: progress.skillLevels[scenario.category],
    },
    newAchievements,
    streak: progress.currentStreak,
  };
}

/**
 * Generates achievements based on performance.
 */
export function generateAchievements(
  progress: TraineeProgress,
  scenario: TrainingScenario,
  score: number
): Achievement[] {
  const newAchievements: Achievement[] = [];

  // First scenario achievement
  if (progress.completedScenarios.length === 1) {
    newAchievements.push({
      id: "first-scenario",
      name: "First Steps",
      nameAr: "الخطوات الأولى",
      earnedAt: new Date(),
      category: "milestone",
    });
  }

  // Perfect performance achievement
  if (score >= 95) {
    newAchievements.push({
      id: `perfect-${scenario.id}`,
      name: "Perfect Performance",
      nameAr: "أداء مثالي",
      earnedAt: new Date(),
      category: "excellence",
    });
  }

  return newAchievements;
}

/**
 * Generates personalized training recommendations.
 */
export function generateTrainingRecommendations(
  progress: TraineeProgress | null
): { scenarioId: string; reason: string }[] {
  const recommendations: { scenarioId: string; reason: string }[] = [];

  if (!progress || progress.completedScenarios.length === 0) {
    recommendations.push(
      { scenarioId: "cam-101", reason: "Start with camera fundamentals" },
      { scenarioId: "light-101", reason: "Learn basic lighting techniques" }
    );
  } else {
    const weakestSkill = Object.entries(progress.skillLevels).sort(
      ([, a], [, b]) => a - b
    )[0];

    if (!weakestSkill) {
      return recommendations;
    }

    const relevantScenarios = TRAINING_SCENARIOS.filter(
      (s) => s.category === weakestSkill[0]
    ).filter(
      (s) => !progress.completedScenarios.find((c) => c.scenarioId === s.id)
    );

    relevantScenarios.slice(0, 2).forEach((s) => {
      recommendations.push({
        scenarioId: s.id,
        reason: `Improve your ${s.category.replace("-", " ")} skills`,
      });
    });
  }

  return recommendations;
}
