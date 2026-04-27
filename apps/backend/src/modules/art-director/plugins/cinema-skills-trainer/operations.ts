/* eslint-disable */
// CineArchitect AI - Cinema Skills Trainer Operations
// عمليات المدرب الافتراضي

import type { PluginOutput } from "../../types";
import type { TrainingScenario } from "./types";
import {
  trainingScenarios,
  vrEquipment,
  traineeProgress,
} from "./constants";
import {
  createSkillLevels,
  getSkillLevel,
  setSkillLevel,
  incrementCategoryCount,
  generateRecommendations,
  suggestNextScenarios,
} from "./utils";

export function listScenariosOperation(data: {
  category?: import("./types").TrainingCategory;
  difficulty?: string;
}): PluginOutput {
  let scenarios = [...trainingScenarios];

  if (data.category) {
    scenarios = scenarios.filter((s) => s.category === data.category);
  }
  if (data.difficulty) {
    scenarios = scenarios.filter((s) => s.difficulty === data.difficulty);
  }

  const categoryCounts = createSkillLevels();
  trainingScenarios.forEach((s) => {
    incrementCategoryCount(categoryCounts, s.category);
  });

  return {
    success: true,
    data: {
      scenarios: scenarios.map((s) => ({
        id: s.id,
        name: s.name,
        nameAr: s.nameAr,
        category: s.category,
        difficulty: s.difficulty,
        duration: s.duration,
        vrRequired: s.vrRequired,
      })),
      totalScenarios: scenarios.length,
      categoryCounts,
      message: "Training scenarios retrieved",
      messageAr: "تم استرجاع سيناريوهات التدريب",
    },
  };
}

export function getEquipmentOperation(data: {
  type?: string;
  equipmentId?: string;
}): PluginOutput {
  if (data.equipmentId) {
    const equipment = vrEquipment.find((e) => e.id === data.equipmentId);
    if (!equipment) {
      return { success: false, error: "Equipment not found" };
    }

    return {
      success: true,
      data: {
        equipment: equipment as unknown as Record<string, unknown>,
        message: "Equipment details retrieved",
        messageAr: "تم استرجاع تفاصيل المعدات",
      },
    };
  }

  let equipment = [...vrEquipment];
  if (data.type) {
    equipment = equipment.filter((e) => e.type === data.type);
  }

  return {
    success: true,
    data: {
      equipment: equipment.map((e) => ({
        id: e.id,
        name: e.name,
        nameAr: e.nameAr,
        type: e.type,
        interactionCount: e.interactions.length,
      })),
      totalEquipment: equipment.length,
      message: "VR equipment catalog retrieved",
      messageAr: "تم استرجاع كتالوج معدات الواقع الافتراضي",
    },
  };
}

export function simulateEquipmentOperation(data: {
  equipmentId: string;
  action: string;
  parameters?: Record<string, unknown>;
}): PluginOutput {
  const equipment = vrEquipment.find((e) => e.id === data.equipmentId);
  if (!equipment) {
    return { success: false, error: "Equipment not found" };
  }

  if (!equipment.interactions.includes(data.action)) {
    return {
      success: false,
      error: `Invalid action. Available actions: ${equipment.interactions.join(", ")}`,
    };
  }

  const tutorial = equipment.tutorials.find((t) => t.action === data.action);

  return {
    success: true,
    data: {
      equipmentId: equipment.id,
      action: data.action,
      result: "Action simulated successfully",
      feedback: tutorial
        ? {
            step: tutorial.step,
            title: tutorial["title"],
            titleAr: tutorial.titleAr,
            nextAction: equipment.tutorials[tutorial.step]?.action || "complete",
          }
        : null,
      vrSimulationUrl: `/vr/simulate/${equipment.id}/${data.action}`,
      message: "Equipment interaction simulated",
      messageAr: "تم محاكاة التفاعل مع المعدات",
    },
  };
}

export interface EvaluationMetrics {
  accuracy?: number;
  timing?: number;
  technique?: number;
  creativity?: number;
  safety?: number;
}

export function evaluatePerformanceOperation(
  scenario: TrainingScenario,
  metrics: EvaluationMetrics
): {
  overallScore: number;
  categoryScores: Record<string, number>;
  strengths: string[];
  areasForImprovement: string[];
  nextScenarios: string[];
} {
  const weights = {
    accuracy: 0.25,
    timing: 0.2,
    technique: 0.3,
    creativity: 0.15,
    safety: 0.1,
  };

  const overallScore = Math.round(
    (metrics.accuracy || 70) * weights.accuracy +
      (metrics.timing || 70) * weights.timing +
      (metrics.technique || 70) * weights.technique +
      (metrics.creativity || 70) * weights.creativity +
      (metrics.safety || 100) * weights.safety
  );

  const categoryScores = {
    accuracy: metrics.accuracy || 70,
    timing: metrics.timing || 70,
    technique: metrics.technique || 70,
    creativity: metrics.creativity || 70,
    safety: metrics.safety || 100,
  };

  const strengths: string[] = [];
  if ((metrics.technique || 70) >= 80) strengths.push("Strong technical skills");
  if ((metrics.creativity || 70) >= 80)
    strengths.push("Creative problem-solving");
  if ((metrics.timing || 70) >= 80)
    strengths.push("Excellent time management");

  const areasForImprovement: string[] = [];
  if ((metrics.accuracy || 70) < 70)
    areasForImprovement.push("Precision and accuracy");
  if ((metrics.technique || 70) < 70)
    areasForImprovement.push("Technical execution");

  const { targetDifficulty } = suggestNextScenarios(
    scenario.difficulty,
    scenario.category,
    scenario.id,
    overallScore
  );

  const nextScenarios = trainingScenarios
    .filter(
      (s) =>
        s.category === scenario.category &&
        s.difficulty === targetDifficulty &&
        s.id !== scenario.id
    )
    .slice(0, 3)
    .map((s) => s.id);

  return {
    overallScore,
    categoryScores,
    strengths,
    areasForImprovement,
    nextScenarios,
  };
}

export function getProgressOperation(traineeId: string): PluginOutput {
  const progress = traineeProgress.get(traineeId);
  if (!progress) {
    return {
      success: true,
      data: {
        message: "No training progress found",
        messageAr: "لم يتم العثور على تقدم في التدريب",
        progress: null,
      },
    };
  }

  return {
    success: true,
    data: {
      progress: {
        traineeId: progress.traineeId,
        name: progress.name,
        completedScenariosCount: progress.completedScenarios.length,
        skillLevels: progress.skillLevels,
        totalTrainingHours: progress.totalTrainingHours,
        achievementsCount: progress.achievements.length,
        currentStreak: progress.currentStreak,
      },
      recentActivity: progress.completedScenarios.slice(-5).reverse(),
      achievements: progress.achievements,
      message: "Training progress retrieved",
      messageAr: "تم استرجاع تقدم التدريب",
    },
  };
}

export function getRecommendationsOperation(traineeId: string): PluginOutput {
  const progress = traineeProgress.get(traineeId);

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

    if (weakestSkill) {
      const relevantScenarios = trainingScenarios
        .filter((s) => s.category === weakestSkill[0])
        .filter(
          (s) =>
            !progress.completedScenarios.find((c) => c.scenarioId === s.id)
        );

      relevantScenarios.slice(0, 2).forEach((s) => {
        recommendations.push({
          scenarioId: s.id,
          reason: `Improve your ${s.category.replace("-", " ")} skills`,
        });
      });
    }
  }

  return {
    success: true,
    data: {
      recommendations,
      basedOn: progress ? "skill analysis" : "new trainee path",
      message: "Personalized recommendations generated",
      messageAr: "تم توليد توصيات مخصصة",
    },
  };
}

export function getOrCreateTraineeProgress(
  traineeId: string,
  traineeName?: string
): import("./types").TraineeProgress {
  let progress = traineeProgress.get(traineeId);
  if (!progress) {
    progress = {
      traineeId,
      name: traineeName || "Trainee",
      completedScenarios: [],
      skillLevels: createSkillLevels(),
      totalTrainingHours: 0,
      achievements: [],
      currentStreak: 0,
    };
    traineeProgress.set(traineeId, progress);
  }
  return progress;
}

export function updateSkillLevel(
  progress: import("./types").TraineeProgress,
  category: import("./types").TrainingCategory,
  score: number
): { skillIncrease: number; newSkillLevel: number } {
  const skillIncrease = Math.round(score / 10);
  const newSkillLevel = Math.min(
    100,
    getSkillLevel(progress.skillLevels, category) + skillIncrease
  );
  setSkillLevel(progress.skillLevels, category, newSkillLevel);
  return { skillIncrease, newSkillLevel };
}
