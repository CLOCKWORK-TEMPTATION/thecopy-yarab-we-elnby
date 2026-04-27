import { REAL_AGENTS } from "./agents";

import type { AgentCategory } from "./types";

/**
 * إحصائيات الوكلاء
 */
export interface AgentStats {
  total: number;
  byCategory: Record<AgentCategory, number>;
  withRAG: number;
  withSelfReflection: number;
  withMemory: number;
  averageComplexity: number;
}

/**
 * حساب إحصائيات الوكلاء
 */
export function getAgentStats(): AgentStats {
  const stats: AgentStats = {
    total: REAL_AGENTS.length,
    byCategory: {
      core: 0,
      analysis: 0,
      creative: 0,
      predictive: 0,
      advanced: 0,
    },
    withRAG: 0,
    withSelfReflection: 0,
    withMemory: 0,
    averageComplexity: 0,
  };

  let complexitySum = 0;

  for (const agent of REAL_AGENTS) {
    stats.byCategory[agent.category]++;

    if (agent.capabilities.supportsRAG) stats.withRAG++;
    if (agent.capabilities.usesSelfReflection) stats.withSelfReflection++;
    if (agent.capabilities.hasMemory) stats.withMemory++;

    complexitySum += agent.complexityScore;
  }

  stats.averageComplexity = complexitySum / REAL_AGENTS.length;

  return stats;
}
