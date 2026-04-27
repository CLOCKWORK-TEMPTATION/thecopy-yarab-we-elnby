import { TaskType } from "../../enums";

import { REAL_AGENTS } from "./agents";

import type {
  AgentCategory,
  BrainstormAgentDefinition,
  BrainstormPhase,
} from "./types";

/**
 * الحصول على جميع الوكلاء
 */
export function getAllAgents(): readonly BrainstormAgentDefinition[] {
  return REAL_AGENTS;
}

/**
 * الحصول على وكيل بواسطة المعرف
 */
export function getAgentById(
  id: string
): BrainstormAgentDefinition | undefined {
  return REAL_AGENTS.find((agent) => agent.id === id);
}

/**
 * الحصول على وكيل بواسطة TaskType
 */
export function getAgentByTaskType(
  taskType: TaskType
): BrainstormAgentDefinition | undefined {
  return REAL_AGENTS.find((agent) => agent.taskType === taskType);
}

/**
 * الحصول على الوكلاء حسب الفئة
 */
export function getAgentsByCategory(
  category: AgentCategory
): readonly BrainstormAgentDefinition[] {
  return REAL_AGENTS.filter((agent) => agent.category === category);
}

/**
 * الحصول على الوكلاء المرتبطين بمرحلة معينة
 */
export function getAgentsByPhase(
  phase: BrainstormPhase
): readonly BrainstormAgentDefinition[] {
  return REAL_AGENTS.filter((agent) => agent.phaseRelevance.includes(phase));
}

/**
 * الحصول على الوكلاء الذين يمكنهم التحليل
 */
export function getAnalysisAgents(): readonly BrainstormAgentDefinition[] {
  return REAL_AGENTS.filter((agent) => agent.capabilities.canAnalyze);
}

/**
 * الحصول على الوكلاء الذين يمكنهم التوليد
 */
export function getCreativeAgents(): readonly BrainstormAgentDefinition[] {
  return REAL_AGENTS.filter((agent) => agent.capabilities.canGenerate);
}

/**
 * الحصول على الوكلاء الذين يمكنهم التنبؤ
 */
export function getPredictiveAgents(): readonly BrainstormAgentDefinition[] {
  return REAL_AGENTS.filter((agent) => agent.capabilities.canPredict);
}

/**
 * الحصول على المتعاونين لوكيل معين
 */
export function getCollaborators(
  agentId: string
): readonly BrainstormAgentDefinition[] {
  const agent = getAgentById(agentId);
  if (!agent) return [];

  return REAL_AGENTS.filter((a) => agent.collaboratesWith.includes(a.taskType));
}

/**
 * الحصول على الوكلاء الذين يعززون وكيلاً معيناً
 */
export function getEnhancers(
  agentId: string
): readonly BrainstormAgentDefinition[] {
  const agent = getAgentById(agentId);
  if (!agent) return [];

  return REAL_AGENTS.filter((a) => a.enhances.includes(agent.taskType));
}
