/**
 * Multi-Agent Orchestrator - Backend
 * Orchestrates multiple agents to work together on complex analysis tasks
 * Includes multi-agent debate system (المرحلة 3)
 * Enhanced with workflow system support
 */

import { logger } from '@/lib/logger';

import { TaskType } from './core/enums';
import { StandardAgentInput, StandardAgentOutput } from './core/types';
import { workflowExecutor } from './core/workflow-executor';
import { getPresetWorkflow, PresetWorkflowName } from './core/workflow-presets';
import { WorkflowConfig, WorkflowStatus } from './core/workflow-types';
import { startDebate } from './debate';
import { DebateConfig } from './debate/types';
import {
  executeAgentsInParallel,
  executeAgentsSequentially,
  getDebateAgents,
  getRecommendedAgentTypes,
} from './orchestrator-helpers';
import { agentRegistry } from './registry';
import { BaseAgent } from './shared/BaseAgent';

export interface OrchestrationInput {
  fullText: string;
  projectName: string;
  taskTypes: TaskType[];
  context?: Record<string, unknown>;
  options?: {
    parallel?: boolean;
    timeout?: number;
    includeMetadata?: boolean;
  };
}

export interface OrchestrationOutput {
  results: Map<TaskType, StandardAgentOutput>;
  summary: {
    totalExecutionTime: number;
    successfulTasks: number;
    failedTasks: number;
    averageConfidence: number;
  };
  metadata?: {
    startedAt: string;
    finishedAt: string;
    tasksExecuted: TaskType[];
  };
}

export class MultiAgentOrchestrator {
  private static instance: MultiAgentOrchestrator;

  private constructor() {}

  public static getInstance(): MultiAgentOrchestrator {
    if (!MultiAgentOrchestrator.instance) {
      MultiAgentOrchestrator.instance = new MultiAgentOrchestrator();
    }
    return MultiAgentOrchestrator.instance;
  }

  /**
   * Execute multiple agents in sequence or parallel
   */
  async executeAgents(input: OrchestrationInput): Promise<OrchestrationOutput> {
    const startTime = Date.now();
    const results = new Map<TaskType, StandardAgentOutput>();
    const { fullText, taskTypes, context, options } = input;

    logger.info(`Starting multi-agent orchestration for ${taskTypes.length} tasks`);

    try {
      if (options?.parallel) {
        await executeAgentsInParallel(fullText, taskTypes, context, results);
      } else {
        await executeAgentsSequentially(fullText, taskTypes, context, results);
      }

      const endTime = Date.now();
      const successfulTasks = Array.from(results.values()).filter(
        (r) => r.confidence > 0.5
      ).length;
      const failedTasks = taskTypes.length - successfulTasks;
      const averageConfidence =
        Array.from(results.values()).reduce((sum, r) => sum + r.confidence, 0) /
        Math.max(results.size, 1);

      const orchestrationOutput: OrchestrationOutput = {
        results,
        summary: { totalExecutionTime: endTime - startTime, successfulTasks, failedTasks, averageConfidence },
      };

      if (options?.includeMetadata) {
        orchestrationOutput.metadata = {
          startedAt: new Date(startTime).toISOString(),
          finishedAt: new Date(endTime).toISOString(),
          tasksExecuted: taskTypes,
        };
      }

      logger.info(`Multi-agent orchestration completed: ${successfulTasks}/${taskTypes.length} successful`);
      return orchestrationOutput;
    } catch (error) {
      logger.error('Multi-agent orchestration failed:', error);
      throw error;
    }
  }

  /**
   * Execute a single agent
   */
  async executeSingleAgent(
    taskType: TaskType,
    input: string,
    context?: Record<string, unknown>
  ): Promise<StandardAgentOutput> {
    const agent = agentRegistry.getAgent(taskType);
    if (!agent) {
      throw new Error(`Agent not found for task type: ${taskType}`);
    }

    const agentInput: StandardAgentInput = {
      input,
      context: context || {},
      options: {
        enableRAG: true,
        enableSelfCritique: true,
        enableConstitutional: true,
        enableUncertainty: true,
        enableHallucination: true,
      },
    };

    return await agent.executeTask(agentInput);
  }

  /**
   * Get recommended agents for a given project type
   */
  getRecommendedAgents(projectType: 'film' | 'series' | 'stage'): TaskType[] {
    return getRecommendedAgentTypes(projectType);
  }

  /**
   * Run a multi-agent debate on a topic
   * المرحلة 3 - Multi-Agent Debate System
   */
  async debateAgents(
    topic: string,
    taskTypes?: TaskType[],
    context?: string,
    config?: Partial<DebateConfig>,
    confidenceThreshold = 0.6
  ): Promise<StandardAgentOutput> {
    logger.info(`Starting multi-agent debate on: ${topic}`);

    try {
      const availableAgents = getDebateAgents(taskTypes);

      if (availableAgents.length === 0) {
        throw new Error('لا توجد وكلاء متاحة للمناظرة');
      }

      logger.info(`Selected ${availableAgents.length} agents for debate`);

      const debateConfig: Partial<DebateConfig> = { confidenceThreshold, ...config };
      const result = await startDebate(topic, availableAgents, context, debateConfig);

      logger.info(`Multi-agent debate completed with confidence: ${result.confidence}`);
      return result;
    } catch (error) {
      logger.error('Multi-agent debate failed:', error);
      return {
        text: `فشلت المناظرة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
        confidence: 0.3,
        notes: ['فشل في إتمام المناظرة'],
        metadata: { debateRounds: 0 },
      };
    }
  }

  /**
   * Execute agents with optional debate
   * If confidence is below threshold, trigger a debate
   */
  async executeWithDebate(
    input: OrchestrationInput,
    enableDebate = true,
    debateConfig?: Partial<DebateConfig>
  ): Promise<OrchestrationOutput> {
    const result = await this.executeAgents(input);

    if (enableDebate && result.summary.averageConfidence < 0.7) {
      logger.info(`Low average confidence (${result.summary.averageConfidence.toFixed(2)}), triggering debate`);

      try {
        const participatingTaskTypes = Array.from(result.results.keys());
        const agents = participatingTaskTypes
          .map(taskType => agentRegistry.getAgent(taskType))
          .filter((agent): agent is BaseAgent => agent !== undefined);

        const debateTopic = `تحسين تحليل المشروع: ${input.projectName}`;
        const debateResult = await startDebate(debateTopic, agents, input.fullText, debateConfig);

        result.results.set(TaskType.INTEGRATED, debateResult);
        result.summary.successfulTasks += 1;
        const allConfidences = Array.from(result.results.values()).map(r => r.confidence);
        result.summary.averageConfidence =
          allConfidences.reduce((sum, c) => sum + c, 0) / allConfidences.length;

        logger.info(`Debate completed, new average confidence: ${result.summary.averageConfidence.toFixed(2)}`);
      } catch (error) {
        logger.error('Debate execution failed:', error);
      }
    }

    return result;
  }

  /**
   * Execute a preset workflow
   */
  async executeWorkflow(
    workflowName: PresetWorkflowName,
    input: StandardAgentInput
  ): Promise<{ status: WorkflowStatus; results: Map<string, unknown>; metrics: unknown }> {
    logger.info(`[Orchestrator] Executing preset workflow: ${workflowName}`);
    const workflow = getPresetWorkflow(workflowName);
    return await workflowExecutor.execute(workflow, input);
  }

  /**
   * Execute a custom workflow configuration
   */
  async executeCustomWorkflow(
    config: WorkflowConfig,
    input: StandardAgentInput
  ): Promise<{ status: WorkflowStatus; results: Map<string, unknown>; metrics: unknown }> {
    logger.info(`[Orchestrator] Executing custom workflow: ${config.name}`);
    return await workflowExecutor.execute(config, input);
  }
}

/**
 * Singleton instance export
 */
export const multiAgentOrchestrator = MultiAgentOrchestrator.getInstance();
