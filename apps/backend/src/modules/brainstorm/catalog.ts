import { TaskType } from "@/services/agents/core/enums";
import { agentRegistry } from "@/services/agents/registry";

import { BRAINSTORM_AGENTS_PRIMARY } from "./catalog-agents-primary";
import { BRAINSTORM_AGENTS_SECONDARY } from "./catalog-agents-secondary";
import { BRAINSTORM_PHASES } from "./catalog-types";

import type {
  BrainstormAgentCatalogItem,
  BrainstormAgentCategory,
  BrainstormCatalogStats,
  BrainstormPhase,
  BrainstormPhaseCatalogItem,
} from "./catalog-types";

export type {
  BrainstormAgentCapabilities,
  BrainstormAgentCatalogItem,
  BrainstormAgentCategory,
  BrainstormAgentIcon,
  BrainstormCatalogStats,
  BrainstormPhase,
  BrainstormPhaseCatalogItem,
} from "./catalog-types";
export { BRAINSTORM_PHASES } from "./catalog-types";

const BRAINSTORM_AGENT_CATALOG: readonly BrainstormAgentCatalogItem[] =
  Object.freeze([
    ...BRAINSTORM_AGENTS_PRIMARY,
    ...BRAINSTORM_AGENTS_SECONDARY,
  ]);

export function getBrainstormAgents(): BrainstormAgentCatalogItem[] {
  return BRAINSTORM_AGENT_CATALOG.filter((agent) =>
    agentRegistry.hasAgent(agent.id)
  );
}

const TASK_TYPE_VALUES: readonly string[] = Object.values(TaskType);

function isTaskTypeId(agentId: string): agentId is TaskType {
  return TASK_TYPE_VALUES.includes(agentId);
}

export function getBrainstormAgentById(
  agentId: string
): BrainstormAgentCatalogItem | undefined {
  if (!isTaskTypeId(agentId)) {
    return undefined;
  }

  return getBrainstormAgents().find((agent) => agent.id === agentId);
}

export function getBrainstormPhases(): readonly BrainstormPhaseCatalogItem[] {
  return BRAINSTORM_PHASES;
}

export function getBrainstormAgentsForPhase(
  phase: BrainstormPhase
): BrainstormAgentCatalogItem[] {
  return getBrainstormAgents().filter((agent) =>
    agent.phaseRelevance.includes(phase)
  );
}

export function getBrainstormStats(): BrainstormCatalogStats {
  const agents = getBrainstormAgents();
  const byCategory: Record<BrainstormAgentCategory, number> = {
    core: 0,
    analysis: 0,
    creative: 0,
    predictive: 0,
    advanced: 0,
  };

  let withRAG = 0;
  let withSelfReflection = 0;
  let withMemory = 0;
  let complexitySum = 0;

  for (const agent of agents) {
    byCategory[agent.category] += 1;
    if (agent.capabilities.supportsRAG) withRAG += 1;
    if (agent.capabilities.usesSelfReflection) withSelfReflection += 1;
    if (agent.capabilities.hasMemory) withMemory += 1;
    complexitySum += agent.complexityScore;
  }

  return {
    total: agents.length,
    byCategory,
    withRAG,
    withSelfReflection,
    withMemory,
    averageComplexity: agents.length > 0 ? complexitySum / agents.length : 0,
  };
}
