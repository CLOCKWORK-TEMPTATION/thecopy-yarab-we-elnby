import { TaskType } from "../../enums";

import { REAL_AGENTS } from "./agents";

import type { BrainstormAgentDefinition, BrainstormPhase } from "./types";

/**
 * تعريف مراحل العصف الذهني
 */
export interface BrainstormPhaseDefinition {
  id: BrainstormPhase;
  name: string;
  nameEn: string;
  description: string;
  relevantAgents: TaskType[];
  primaryAction: "analyze" | "generate" | "debate" | "decide";
}

/**
 * مراحل العصف الذهني مع الوكلاء المرتبطين
 */
export const BRAINSTORM_PHASES: readonly BrainstormPhaseDefinition[] =
  Object.freeze([
    {
      id: 1,
      name: "الملخص الإبداعي",
      nameEn: "Creative Brief",
      description: "تحديد الفكرة الأولية ووضع الأسس",
      relevantAgents: [
        TaskType.ANALYSIS,
        TaskType.STYLE_FINGERPRINT,
        TaskType.CULTURAL_HISTORICAL_ANALYZER,
        TaskType.TARGET_AUDIENCE_ANALYZER,
      ],
      primaryAction: "analyze",
    },
    {
      id: 2,
      name: "توليد الأفكار",
      nameEn: "Idea Generation",
      description: "إنشاء فكرتين متنافستين مبتكرتين",
      relevantAgents: [
        TaskType.CREATIVE,
        TaskType.COMPLETION,
        TaskType.SCENE_GENERATOR,
        TaskType.CHARACTER_VOICE,
        TaskType.WORLD_BUILDER,
        TaskType.PLOT_PREDICTOR,
      ],
      primaryAction: "generate",
    },
    {
      id: 3,
      name: "المراجعة المستقلة",
      nameEn: "Independent Review",
      description: "تقييم شامل من كل وكيل",
      relevantAgents: [
        TaskType.ANALYSIS,
        TaskType.RHYTHM_MAPPING,
        TaskType.CHARACTER_NETWORK,
        TaskType.DIALOGUE_FORENSICS,
        TaskType.THEMATIC_MINING,
        TaskType.STYLE_FINGERPRINT,
        TaskType.CONFLICT_DYNAMICS,
        TaskType.TENSION_OPTIMIZER,
        TaskType.AUDIENCE_RESONANCE,
        TaskType.CHARACTER_DEEP_ANALYZER,
        TaskType.DIALOGUE_ADVANCED_ANALYZER,
        TaskType.VISUAL_CINEMATIC_ANALYZER,
        TaskType.THEMES_MESSAGES_ANALYZER,
        TaskType.CULTURAL_HISTORICAL_ANALYZER,
        TaskType.LITERARY_QUALITY_ANALYZER,
      ],
      primaryAction: "analyze",
    },
    {
      id: 4,
      name: "المناقشة التنافسية",
      nameEn: "The Tournament",
      description: "نقاش حي بين الوكلاء",
      relevantAgents: [
        TaskType.CREATIVE,
        TaskType.INTEGRATED,
        TaskType.ADAPTIVE_REWRITING,
        TaskType.SCENE_GENERATOR,
        TaskType.CHARACTER_VOICE,
        TaskType.PLOT_PREDICTOR,
        TaskType.TENSION_OPTIMIZER,
      ],
      primaryAction: "debate",
    },
    {
      id: 5,
      name: "القرار النهائي",
      nameEn: "Final Decision",
      description: "اختيار الفكرة الفائزة وتقديم التوصيات",
      relevantAgents: [
        TaskType.INTEGRATED,
        TaskType.COMPLETION,
        TaskType.AUDIENCE_RESONANCE,
        TaskType.PLATFORM_ADAPTER,
        TaskType.PRODUCIBILITY_ANALYZER,
        TaskType.TARGET_AUDIENCE_ANALYZER,
        TaskType.LITERARY_QUALITY_ANALYZER,
        TaskType.RECOMMENDATIONS_GENERATOR,
      ],
      primaryAction: "decide",
    },
  ]);

/**
 * الحصول على تعريف مرحلة معينة
 */
export function getPhaseDefinition(
  phaseId: BrainstormPhase
): BrainstormPhaseDefinition | undefined {
  return BRAINSTORM_PHASES.find((phase) => phase.id === phaseId);
}

/**
 * الحصول على الوكلاء الكاملين لمرحلة معينة
 */
export function getAgentsForPhase(
  phaseId: BrainstormPhase
): readonly BrainstormAgentDefinition[] {
  const phase = getPhaseDefinition(phaseId);
  if (!phase) return [];

  return REAL_AGENTS.filter((agent) =>
    phase.relevantAgents.includes(agent.taskType)
  );
}
