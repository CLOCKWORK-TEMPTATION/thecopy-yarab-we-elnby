/**
 * Specialized Critique Configurations
 * معايير نقد متخصصة لكل نوع من أنواع الوكلاء
 */

import { TaskType } from "@core/types";
import type { CritiqueConfiguration } from "./critiqueTypes";
import {
  COMMON_DIMENSIONS,
  CHARACTER_ANALYSIS_DIMENSIONS,
  DIALOGUE_ANALYSIS_DIMENSIONS,
  PLOT_ANALYSIS_DIMENSIONS,
} from "./critiqueDimensions";
import {
  CHARACTER_NETWORK_DIMENSIONS,
  CONFLICT_DYNAMICS_DIMENSIONS,
} from "./critiqueAgentDimensions";

// Re-export types for convenience
export type {
  CritiqueConfiguration, CritiqueDimension, CritiqueRequest,
  CritiqueContext, EnhancedCritiqueResult, DimensionScore
} from "./critiqueTypes";

// Re-export dimensions for consumers
export {
  COMMON_DIMENSIONS, CHARACTER_ANALYSIS_DIMENSIONS,
  DIALOGUE_ANALYSIS_DIMENSIONS, PLOT_ANALYSIS_DIMENSIONS,
} from "./critiqueDimensions";

/** تكوينات النقد لكل نوع وكيل */
export const CRITIQUE_CONFIGURATIONS: Map<TaskType, CritiqueConfiguration> =
  new Map([
    [TaskType.CHARACTER_DEEP_ANALYZER, {
      agentType: TaskType.CHARACTER_DEEP_ANALYZER, agentName: "محلل الشخصية العميق",
      category: "advanced", dimensions: CHARACTER_ANALYSIS_DIMENSIONS,
      thresholds: { excellent: 0.85, good: 0.7, satisfactory: 0.55, needsImprovement: 0.4 },
      maxIterations: 3, enableAutoCorrection: true
    }],
    [TaskType.CHARACTER_NETWORK, {
      agentType: TaskType.CHARACTER_NETWORK, agentName: "محلل شبكة الشخصيات",
      category: "analysis", dimensions: CHARACTER_NETWORK_DIMENSIONS,
      thresholds: { excellent: 0.85, good: 0.7, satisfactory: 0.55, needsImprovement: 0.4 },
      maxIterations: 3, enableAutoCorrection: true
    }],
    [TaskType.DIALOGUE_ADVANCED_ANALYZER, {
      agentType: TaskType.DIALOGUE_ADVANCED_ANALYZER, agentName: "محلل الحوار المتقدم",
      category: "advanced", dimensions: DIALOGUE_ANALYSIS_DIMENSIONS,
      thresholds: { excellent: 0.85, good: 0.7, satisfactory: 0.55, needsImprovement: 0.4 },
      maxIterations: 3, enableAutoCorrection: true
    }],
    [TaskType.DIALOGUE_FORENSICS, {
      agentType: TaskType.DIALOGUE_FORENSICS, agentName: "محلل الحوار الجنائي",
      category: "analysis", dimensions: DIALOGUE_ANALYSIS_DIMENSIONS,
      thresholds: { excellent: 0.8, good: 0.65, satisfactory: 0.5, needsImprovement: 0.35 },
      maxIterations: 2, enableAutoCorrection: true
    }],
    [TaskType.PLOT_PREDICTOR, {
      agentType: TaskType.PLOT_PREDICTOR, agentName: "التنبؤ بالحبكة",
      category: "predictive", dimensions: PLOT_ANALYSIS_DIMENSIONS,
      thresholds: { excellent: 0.85, good: 0.7, satisfactory: 0.55, needsImprovement: 0.4 },
      maxIterations: 3, enableAutoCorrection: true
    }],
    [TaskType.CONFLICT_DYNAMICS, {
      agentType: TaskType.CONFLICT_DYNAMICS, agentName: "محلل ديناميكيات الصراع",
      category: "analysis", dimensions: CONFLICT_DYNAMICS_DIMENSIONS,
      thresholds: { excellent: 0.85, good: 0.7, satisfactory: 0.55, needsImprovement: 0.4 },
      maxIterations: 3, enableAutoCorrection: true
    }],
    [TaskType.ANALYSIS, {
      agentType: TaskType.ANALYSIS, agentName: "التحليل الأساسي",
      category: "core",
      dimensions: [COMMON_DIMENSIONS["accuracy"]!, COMMON_DIMENSIONS["depth"]!, COMMON_DIMENSIONS["clarity"]!],
      thresholds: { excellent: 0.8, good: 0.65, satisfactory: 0.5, needsImprovement: 0.35 },
      maxIterations: 2, enableAutoCorrection: true
    }]
  ]);

/** الحصول على تكوين النقد لنوع وكيل معين */
export function getCritiqueConfiguration(taskType: TaskType): CritiqueConfiguration | null {
  if (CRITIQUE_CONFIGURATIONS.has(taskType)) return CRITIQUE_CONFIGURATIONS.get(taskType)!;

  const typeStr = taskType.toString().toLowerCase();
  if (typeStr.includes("character") || typeStr.includes("شخصية")) {
    return CRITIQUE_CONFIGURATIONS.get(TaskType.CHARACTER_DEEP_ANALYZER)!;
  }
  if (typeStr.includes("dialogue") || typeStr.includes("حوار")) {
    return CRITIQUE_CONFIGURATIONS.get(TaskType.DIALOGUE_ADVANCED_ANALYZER)!;
  }
  if (typeStr.includes("plot") || typeStr.includes("حبكة") || typeStr.includes("صراع")) {
    return CRITIQUE_CONFIGURATIONS.get(TaskType.PLOT_PREDICTOR)!;
  }
  return CRITIQUE_CONFIGURATIONS.get(TaskType.ANALYSIS)!;
}

/** الحصول على جميع التكوينات */
export function getAllCritiqueConfigurations(): CritiqueConfiguration[] {
  return Array.from(CRITIQUE_CONFIGURATIONS.values());
}
