// CineArchitect AI - Virtual Cinema Skills Trainer
// المدرب الافتراضي للمهارات السينمائية

import { v4 as uuidv4 } from "uuid";
import { logger } from "@/lib/logger";
import { Plugin, PluginInput, PluginOutput } from "../../types";

import type {
  TrainingScenario,
  TrainingCategory,
  CompletedScenario,
  Achievement,
  PerformanceEvaluation,
} from "./types";

import { trainingScenarios } from "./data/scenarios";
import { vrEquipment } from "./data/equipment";
import {
  traineeProgress,
  createInitialProgress,
  updateSkillLevel,
  generateAchievements,
  completeScenario as completeScenarioUtil,
} from "./utils/progress";
import {
  calculateOverallScore,
  generateRecommendations,
  suggestNextScenarios,
} from "./utils/evaluation";

export class CinemaSkillsTrainer implements Plugin {
  id = "cinema-skills-trainer";
  name = "Virtual Cinema Skills Trainer";
  nameAr = "المدرب الافتراضي للمهارات السينمائية";
  version = "1.0.0";
  description =
    "Interactive VR and AI-powered training platform for cinema skills";
  descriptionAr = "منصة تدريبية تفاعلية باستخدام VR والذكاء الاصطناعي";
  category = "learning" as const;

  initialize(): void {
    logger.info(
      `[${this.name}] Initialized with ${trainingScenarios.length} training scenarios`
    );
  }

  execute(input: PluginInput): PluginOutput {
    const data = input.data as unknown;
    switch (input.type) {
      case "list-scenarios":
        return this.listScenarios(input.data);
      case "start-scenario":
        return this.startScenario(
          data as Parameters<CinemaSkillsTrainer["startScenario"]>[0]
        );
      case "get-equipment":
        return this.getEquipment(input.data);
      case "simulate-equipment":
        return this.simulateEquipment(
          data as Parameters<CinemaSkillsTrainer["simulateEquipment"]>[0]
        );
      case "evaluate-performance":
        return this.evaluatePerformance(
          data as Parameters<CinemaSkillsTrainer["evaluatePerformance"]>[0]
        );
      case "get-progress":
        return this.getProgress(
          data as Parameters<CinemaSkillsTrainer["getProgress"]>[0]
        );
      case "complete-scenario":
        return this.completeScenario(
          data as Parameters<CinemaSkillsTrainer["completeScenario"]>[0]
        );
      case "get-recommendations":
        return this.getRecommendations(
          data as Parameters<CinemaSkillsTrainer["getRecommendations"]>[0]
        );
      case "create-custom-scenario":
        return this.createCustomScenario(
          data as Parameters<CinemaSkillsTrainer["createCustomScenario"]>[0]
        );
      default:
        return { success: false, error: `Unknown operation: ${input.type}` };
    }
  }

  private listScenarios(data: {
    category?: TrainingCategory;
    difficulty?: string;
  }): PluginOutput {
    let scenarios = [...trainingScenarios];

    if (data.category) {
      scenarios = scenarios.filter((s) => s.category === data.category);
    }
    if (data.difficulty) {
      scenarios = scenarios.filter((s) => s.difficulty === data.difficulty);
    }

    const categoryCounts: Record<string, number> = {};
    trainingScenarios.forEach((s) => {
      categoryCounts[s.category] = (categoryCounts[s.category] ?? 0) + 1;
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

  private startScenario(data: {
    scenarioId: string;
    traineeId: string;
    traineeName?: string;
  }): PluginOutput {
    const scenario = trainingScenarios.find((s) => s.id === data.scenarioId);
    if (!scenario) {
      return { success: false, error: "Scenario not found" };
    }

    let progress = traineeProgress.get(data.traineeId);
    if (!progress) {
      progress = createInitialProgress(data.traineeId, data.traineeName ?? "Trainee");
      traineeProgress.set(data.traineeId, progress);
    }

    const relevantEquipment = vrEquipment.filter((e) =>
      scenario.equipment.some((eq) =>
        e.name.toLowerCase().includes(eq.toLowerCase())
      )
    );

    return {
      success: true,
      data: {
        scenario: scenario as unknown as Record<string, unknown>,
        vrSessionUrl: `/vr/training/${scenario.id}/${data.traineeId}`,
        equipment: relevantEquipment.map((e) => ({
          id: e.id,
          name: e.name,
          nameAr: e.nameAr,
          type: e.type,
        })),
        objectives: scenario.objectives,
        estimatedDuration: scenario.duration,
        aiCoach: {
          enabled: scenario.aiAssisted,
          features: [
            "real-time-feedback",
            "mistake-detection",
            "performance-tips",
          ],
        },
        message: "Training scenario started",
        messageAr: "تم بدء سيناريو التدريب",
      },
    };
  }

  private getEquipment(data: {
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

  private simulateEquipment(data: {
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
              title: tutorial.title,
              titleAr: tutorial.titleAr,
              nextAction:
                equipment.tutorials[tutorial.step]?.action ?? "complete",
            }
          : null,
        vrSimulationUrl: `/vr/simulate/${equipment.id}/${data.action}`,
        message: "Equipment interaction simulated",
        messageAr: "تم محاكاة التفاعل مع المعدات",
      },
    };
  }

  private evaluatePerformance(data: {
    traineeId: string;
    scenarioId: string;
    metrics: {
      accuracy?: number;
      timing?: number;
      technique?: number;
      creativity?: number;
      safety?: number;
    };
  }): PluginOutput {
    const scenario = trainingScenarios.find((s) => s.id === data.scenarioId);
    if (!scenario) {
      return { success: false, error: "Scenario not found" };
    }

    const overallScore = calculateOverallScore(data.metrics);

    const metrics = data.metrics;
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

    if ((metrics.technique ?? 70) >= 80)
      evaluation.strengths.push("Strong technical skills");
    if ((metrics.creativity ?? 70) >= 80)
      evaluation.strengths.push("Creative problem-solving");
    if ((metrics.timing ?? 70) >= 80)
      evaluation.strengths.push("Excellent time management");

    if ((metrics.accuracy ?? 70) < 70)
      evaluation.areasForImprovement.push("Precision and accuracy");
    if ((metrics.technique ?? 70) < 70)
      evaluation.areasForImprovement.push("Technical execution");

    evaluation.recommendations = generateRecommendations(evaluation, scenario);
    evaluation.nextScenarios = suggestNextScenarios(scenario, overallScore, trainingScenarios);

    return {
      success: true,
      data: {
        evaluation: evaluation as unknown as Record<string, unknown>,
        passed: overallScore >= 70,
        certificate:
          overallScore >= 85
            ? {
                available: true,
                name: `${scenario.name} Proficiency`,
                level: overallScore >= 95 ? "distinction" : "proficient",
              }
            : null,
        message: "Performance evaluated",
        messageAr: "تم تقييم الأداء",
      },
    };
  }

  private getProgress(data: { traineeId: string }): PluginOutput {
    const progress = traineeProgress.get(data.traineeId);
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

  private completeScenario(data: {
    traineeId: string;
    scenarioId: string;
    score: number;
    timeSpent: number;
    feedback?: string[];
  }): PluginOutput {
    const scenario = trainingScenarios.find((s) => s.id === data.scenarioId);
    if (!scenario) {
      return { success: false, error: "Scenario not found" };
    }

    let progress = traineeProgress.get(data.traineeId);
    if (!progress) {
      progress = createInitialProgress(data.traineeId, "Trainee");
      traineeProgress.set(data.traineeId, progress);
    }

    const completed = completeScenarioUtil(
      progress,
      data.scenarioId,
      data.score,
      data.timeSpent,
      data.feedback
    );

    const skillUpdate = updateSkillLevel(progress, scenario.category, data.score);
    const newAchievements = generateAchievements(progress, data.scenarioId, data.score);
    progress.achievements.push(...newAchievements);

    return {
      success: true,
      data: {
        completed: completed as unknown as Record<string, unknown>,
        skillIncrease: {
          category: scenario.category,
          increase: skillUpdate.increase,
          newLevel: skillUpdate.newLevel,
        },
        newAchievements,
        streak: progress.currentStreak,
        message: "Scenario completed",
        messageAr: "تم إكمال السيناريو",
      },
    };
  }

  private getRecommendations(data: { traineeId: string }): PluginOutput {
    const progress = traineeProgress.get(data.traineeId);

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
        return {
          success: true,
          data: {
            recommendations,
            basedOn: "skill analysis",
            message: "Personalized recommendations generated",
            messageAr: "تم توليد توصيات مخصصة",
          },
        };
      }

      const relevantScenarios = trainingScenarios
        .filter((s) => s.category === weakestSkill[0])
        .filter(
          (s) => !progress.completedScenarios.find((c) => c.scenarioId === s.id)
        );

      relevantScenarios.slice(0, 2).forEach((s) => {
        recommendations.push({
          scenarioId: s.id,
          reason: `Improve your ${s.category.replace("-", " ")} skills`,
        });
      });
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

  private createCustomScenario(data: {
    name: string;
    nameAr: string;
    category: TrainingCategory;
    difficulty: TrainingScenario["difficulty"];
    objectives: string[];
    equipment: string[];
    duration: number;
  }): PluginOutput {
    const customScenario: TrainingScenario = {
      id: `custom-${uuidv4().substring(0, 8)}`,
      name: data.name,
      nameAr: data.nameAr,
      category: data.category,
      difficulty: data.difficulty,
      duration: data.duration,
      objectives: data.objectives,
      equipment: data.equipment,
      vrRequired: true,
      aiAssisted: true,
    };

    trainingScenarios.push(customScenario);

    return {
      success: true,
      data: {
        scenario: customScenario as unknown as Record<string, unknown>,
        message: "Custom training scenario created",
        messageAr: "تم إنشاء سيناريو تدريب مخصص",
      },
    };
  }

  shutdown(): void {
    traineeProgress.clear();
    logger.info(`[${this.name}] Shut down`);
  }
}

export const cinemaSkillsTrainer = new CinemaSkillsTrainer();
