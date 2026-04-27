/**
 * Brainstorm Agent Registry
 * سجل وكلاء العصف الذهني
 *
 * يوفر واجهة موحدة للوصول إلى جميع الوكلاء الحقيقيين
 * لاستخدامها في صفحة brainstorm
 *
 * Barrel re-exports فقط — التنفيذ موزّع على ملفات داخل brainstorm-agent-registry/
 */

export type {
  BrainstormAgentDefinition,
  BrainstormAgentCapabilities,
  AgentCategory,
  AgentIcon,
  BrainstormPhase,
} from "./brainstorm-agent-registry/types";

export {
  REAL_AGENTS,
  CORE_AGENTS,
  ANALYSIS_AGENTS,
  CREATIVE_AGENTS,
  PREDICTIVE_AGENTS,
  ADVANCED_AGENTS,
} from "./brainstorm-agent-registry/agents";

export {
  getAllAgents,
  getAgentById,
  getAgentByTaskType,
  getAgentsByCategory,
  getAgentsByPhase,
  getAnalysisAgents,
  getCreativeAgents,
  getPredictiveAgents,
  getCollaborators,
  getEnhancers,
} from "./brainstorm-agent-registry/queries";

export {
  BRAINSTORM_PHASES,
  getPhaseDefinition,
  getAgentsForPhase,
} from "./brainstorm-agent-registry/phases";
export type { BrainstormPhaseDefinition } from "./brainstorm-agent-registry/phases";

export { getAgentStats } from "./brainstorm-agent-registry/stats";
export type { AgentStats } from "./brainstorm-agent-registry/stats";
