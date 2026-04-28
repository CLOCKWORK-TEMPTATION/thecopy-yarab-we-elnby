// Progress Management Utilities

import type {
  TraineeProgress,
  CompletedScenario,
  Achievement,
  TrainingCategory,
} from "../types";

export const traineeProgress = new Map<string, TraineeProgress>();

export function createInitialProgress(
  traineeId: string,
  traineeName: string
): TraineeProgress {
  return {
    traineeId,
    name: traineeName,
    completedScenarios: [],
    skillLevels: {
      "camera-operation": 0,
      "lighting-setup": 0,
      "sound-recording": 0,
      directing: 0,
      "set-design": 0,
      "color-grading": 0,
      "visual-effects": 0,
      "production-management": 0,
    },
    totalTrainingHours: 0,
    achievements: [],
    currentStreak: 0,
  };
}

export function updateSkillLevel(
  progress: TraineeProgress,
  category: TrainingCategory,
  score: number
): { increase: number; newLevel: number } {
  const skillIncrease = Math.round(score / 10);
  const newLevel = Math.min(
    100,
    (progress.skillLevels[category] || 0) + skillIncrease
  );
  progress.skillLevels[category] = newLevel;
  return { increase: skillIncrease, newLevel };
}

export function generateAchievements(
  progress: TraineeProgress,
  scenarioId: string,
  score: number
): Achievement[] {
  const newAchievements: Achievement[] = [];

  if (progress.completedScenarios.length === 1) {
    newAchievements.push({
      id: "first-scenario",
      name: "First Steps",
      nameAr: "الخطوات الأولى",
      earnedAt: new Date(),
      category: "milestone",
    });
  }
  if (score >= 95) {
    newAchievements.push({
      id: `perfect-${scenarioId}`,
      name: "Perfect Performance",
      nameAr: "أداء مثالي",
      earnedAt: new Date(),
      category: "excellence",
    });
  }

  return newAchievements;
}

export function completeScenario(
  progress: TraineeProgress,
  scenarioId: string,
  score: number,
  timeSpent: number,
  feedback: string[] = []
): CompletedScenario {
  const completed: CompletedScenario = {
    scenarioId,
    completedAt: new Date(),
    score,
    timeSpent,
    feedback,
  };

  progress.completedScenarios.push(completed);
  progress.totalTrainingHours += timeSpent / 60;
  progress.currentStreak++;

  return completed;
}
