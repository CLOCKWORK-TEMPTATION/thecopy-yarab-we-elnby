import type {
  BrainstormAgentDefinition,
  BrainstormAgentStats,
  BrainstormCatalog,
  BrainstormPhase,
  BrainstormPhaseDefinition,
} from "../types";

interface BrainstormCatalogApiResponse {
  success: boolean;
  data?: BrainstormCatalog;
  error?: string;
}

export async function fetchBrainstormCatalog(): Promise<BrainstormCatalog> {
  const response = await fetch("/api/brainstorm", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`فشل تحميل كتالوج Brain Storm AI: ${response.status}`);
  }

  const payload = (await response.json()) as BrainstormCatalogApiResponse;

  if (!payload.success || !payload.data) {
    throw new Error(payload.error || "فشل تحميل كتالوج Brain Storm AI");
  }

  return payload.data;
}

export function getAgentsForPhase(
  agents: readonly BrainstormAgentDefinition[],
  phase: BrainstormPhase
): BrainstormAgentDefinition[] {
  return agents.filter((agent) => agent.phaseRelevance.includes(phase));
}

export function getCollaborators(
  agents: readonly BrainstormAgentDefinition[],
  agent: BrainstormAgentDefinition
): BrainstormAgentDefinition[] {
  return agents.filter((candidate) =>
    agent.collaboratesWith.includes(candidate.id)
  );
}

export function getPhaseDefinition(
  phases: readonly BrainstormPhaseDefinition[],
  phase: BrainstormPhase
): BrainstormPhaseDefinition | undefined {
  return phases.find((candidate) => candidate.id === phase);
}

export function buildAgentStats(
  agents: readonly BrainstormAgentDefinition[]
): BrainstormAgentStats {
  const byCategory: BrainstormAgentStats["byCategory"] = {
    core: 0,
    analysis: 0,
    creative: 0,
    predictive: 0,
    advanced: 0,
  };

  let withRAG = 0;
  let withSelfReflection = 0;
  let withMemory = 0;
  let totalComplexity = 0;

  for (const agent of agents) {
    byCategory[agent.category] += 1;
    if (agent.capabilities.supportsRAG) withRAG += 1;
    if (agent.capabilities.usesSelfReflection) withSelfReflection += 1;
    if (agent.capabilities.hasMemory) withMemory += 1;
    totalComplexity += agent.complexityScore;
  }

  return {
    total: agents.length,
    byCategory,
    withRAG,
    withSelfReflection,
    withMemory,
    averageComplexity: agents.length > 0 ? totalComplexity / agents.length : 0,
  };
}
