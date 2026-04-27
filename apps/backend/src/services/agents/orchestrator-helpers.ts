/**
 * Orchestrator Helper Functions
 * Extracted from orchestrator.ts to reduce file size
 */

import { logger } from '@/lib/logger';

import { TaskType } from './core/enums';
import { StandardAgentInput, StandardAgentOutput } from './core/types';
import { agentRegistry } from './registry';
import { BaseAgent } from './shared/BaseAgent';

/**
 * Execute agents in parallel
 */
export async function executeAgentsInParallel(
  fullText: string,
  taskTypes: TaskType[],
  context: Record<string, unknown> | undefined,
  results: Map<TaskType, StandardAgentOutput>
): Promise<void> {
  const promises = taskTypes.map(async (taskType) => {
    const agent = agentRegistry.getAgent(taskType);
    if (!agent) {
      logger.warn(`Agent not found for task type: ${taskType}`);
      return;
    }

    try {
      const agentInput: StandardAgentInput = {
        input: fullText,
        context: context ?? {},
        options: {
          enableRAG: true,
          enableSelfCritique: true,
          enableConstitutional: true,
          enableUncertainty: true,
          enableHallucination: true,
        },
      };

      const output = await agent.executeTask(agentInput);
      results.set(taskType, output);
    } catch (error) {
      logger.error(`Agent execution failed for ${taskType}:`, error);
      results.set(taskType, {
        text: 'فشل في تنفيذ التحليل',
        confidence: 0,
        notes: [`خطأ: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`],
      });
    }
  });

  await Promise.all(promises);
}

/**
 * Execute agents sequentially
 */
export async function executeAgentsSequentially(
  fullText: string,
  taskTypes: TaskType[],
  context: Record<string, unknown> | undefined,
  results: Map<TaskType, StandardAgentOutput>
): Promise<void> {
  for (const taskType of taskTypes) {
    const agent = agentRegistry.getAgent(taskType);
    if (!agent) {
      logger.warn(`Agent not found for task type: ${taskType}`);
      continue;
    }

    try {
      const agentInput: StandardAgentInput = {
        input: fullText,
        context: {
          ...(context ?? {}),
          previousResults: Object.fromEntries(results),
        },
        options: {
          enableRAG: true,
          enableSelfCritique: true,
          enableConstitutional: true,
          enableUncertainty: true,
          enableHallucination: true,
        },
      };

      const output = await agent.executeTask(agentInput);
      results.set(taskType, output);

      logger.info(
        `Agent ${taskType} completed with confidence: ${output.confidence}`
      );
    } catch (error) {
      logger.error(`Agent execution failed for ${taskType}:`, error);
      results.set(taskType, {
        text: 'فشل في تنفيذ التحليل',
        confidence: 0,
        notes: [`خطأ: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`],
      });
    }
  }
}

/**
 * Get available agents for debate from registry
 */
export function getDebateAgents(taskTypes?: TaskType[]): BaseAgent[] {
  if (taskTypes && taskTypes.length > 0) {
    return taskTypes
      .map(taskType => agentRegistry.getAgent(taskType))
      .filter((agent): agent is BaseAgent => agent !== undefined);
  }

  const allAgents = agentRegistry.getAllAgents();
  return Array.from(allAgents.values());
}

/**
 * Get recommended agent task types for a project type
 */
export function getRecommendedAgentTypes(
  projectType: 'film' | 'series' | 'stage'
): TaskType[] {
  const commonAgents = [
    TaskType.CHARACTER_DEEP_ANALYZER,
    TaskType.DIALOGUE_ADVANCED_ANALYZER,
    TaskType.THEMES_MESSAGES_ANALYZER,
  ];

  switch (projectType) {
    case 'film':
      return [
        ...commonAgents,
        TaskType.VISUAL_CINEMATIC_ANALYZER,
        TaskType.PRODUCIBILITY_ANALYZER,
        TaskType.TARGET_AUDIENCE_ANALYZER,
      ];
    case 'series':
      return [
        ...commonAgents,
        TaskType.CULTURAL_HISTORICAL_ANALYZER,
        TaskType.TARGET_AUDIENCE_ANALYZER,
      ];
    case 'stage':
      return [
        ...commonAgents,
        TaskType.CULTURAL_HISTORICAL_ANALYZER,
      ];
    default:
      return commonAgents;
  }
}
