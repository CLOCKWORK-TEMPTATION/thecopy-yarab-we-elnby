/**
 * Workflow Executor - Executes multi-agent workflows with dependency management
 */

import { logger } from '@/lib/logger';
import { StandardAgentInput, StandardAgentOutput } from './types';
import {
  WorkflowConfig,
  WorkflowContext,
  WorkflowStage,
  WorkflowStep,
  WorkflowStatus,
  AgentDependency,
  AgentStatus,
  AgentExecutionResult,
  WorkflowMetrics,
  WorkflowEvent,
} from './workflow-types';
import { agentRegistry } from '../registry';
import { calculateWorkflowMetrics, buildExecutionPlan } from './workflow-metrics-helpers';

export class WorkflowExecutor {
  private listeners: Map<string, Array<(event: WorkflowEvent) => void>> = new Map();

  private createContext(config: WorkflowConfig, input: StandardAgentInput): WorkflowContext {
    return {
      workflowId: config.id,
      input,
      results: new Map(),
      sharedData: new Map(),
      metadata: {
        startedAt: new Date(),
        totalSteps: config.steps.length,
        completedSteps: 0,
        failedSteps: 0,
      },
    };
  }

  private buildResult(status: WorkflowStatus, context: WorkflowContext): {
    status: WorkflowStatus;
    results: Map<string, AgentExecutionResult>;
    metrics: WorkflowMetrics;
  } {
    return { status, results: context.results, metrics: this.calculateMetrics(context) };
  }

  /**
   * Execute a workflow
   */
  async execute(
    config: WorkflowConfig,
    input: StandardAgentInput
  ): Promise<{
    status: WorkflowStatus;
    results: Map<string, AgentExecutionResult>;
    metrics: WorkflowMetrics;
  }> {
    const context = this.createContext(config, input);
    logger.info(`[Workflow] Starting workflow: ${config.name} (${config.id})`);

    try {
      const plan = this.buildExecutionPlan(config);
      for (const stage of plan.stages) {
        await this.executeStage(stage, config, context);
      }
      context.metadata.completedAt = new Date();

      logger.info(`[Workflow] Completed workflow: ${config.name}`);
      this.emit({ type: 'workflow-completed', workflowId: config.id, timestamp: new Date(), data: { metrics: this.calculateMetrics(context) } });

      return this.buildResult(WorkflowStatus.COMPLETED, context);
    } catch (error) {
      logger.error('[Workflow] Failed to execute workflow:', error);
      this.emit({ type: 'workflow-failed', workflowId: config.id, timestamp: new Date(), data: { error } });

      return this.buildResult(WorkflowStatus.FAILED, context);
    }
  }

  /**
   * Build execution plan from workflow config (delegated to helper)
   */
  private buildExecutionPlan(config: WorkflowConfig) {
    return buildExecutionPlan(config);
  }

  /**
   * Execute a workflow stage
   */
  private async executeStage(
    stage: WorkflowStage,
    config: WorkflowConfig,
    context: WorkflowContext
  ): Promise<void> {
    logger.info(`[Workflow] Executing stage ${stage.stageNumber} with ${stage.steps.length} steps`);

    if (stage.canRunInParallel) {
      // Execute steps in parallel
      const promises = stage.steps.map((step) =>
        this.executeStep(step, config, context)
      );
      await Promise.all(promises);
    } else {
      // Execute steps sequentially
      for (const step of stage.steps) {
        await this.executeStep(step, config, context);
      }
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: WorkflowStep,
    config: WorkflowConfig,
    context: WorkflowContext
  ): Promise<void> {
    const startTime = new Date();

    logger.info(`[Workflow] Executing step: ${step.id} (${step.agentId})`);
    this.emit({ type: 'step-started', workflowId: config.id, stepId: step.id, timestamp: startTime });

    try {
      if (!this.checkDependencies(step, context)) {
        this.handleUnmetDependencies(step, context, startTime);
        return;
      }

      const { output, retryCount } = await this.runStepWithRetries(step, config, context);
      const endTime = new Date();

      this.recordStepSuccess(step, config, context, output, startTime, endTime, retryCount);
    } catch (error) {
      this.recordStepFailure(step, config, context, error, startTime);

      if (config.errorHandling === 'strict' && !step.skipOnError) {
        throw error;
      }
    }
  }

  /**
   * Handle unmet dependencies for a step
   */
  private handleUnmetDependencies(
    step: WorkflowStep, context: WorkflowContext, startTime: Date
  ): void {
    if (step.skipOnError) {
      logger.warn(`[Workflow] Skipping step ${step.id} due to unmet dependencies`);
      context.results.set(step.id, {
        agentId: step.agentId, taskType: step.taskType,
        status: AgentStatus.SKIPPED, startTime, endTime: new Date(),
      });
      return;
    }
    throw new Error(`Dependencies not met for step ${step.id}`);
  }

  /**
   * Run a step with retry logic
   */
  // eslint-disable-next-line complexity
  private async runStepWithRetries(
    step: WorkflowStep, config: WorkflowConfig, context: WorkflowContext
  ): Promise<{ output: StandardAgentOutput; retryCount: number }> {
    const agent = agentRegistry.getAgent(step.taskType);
    if (!agent) {
      throw new Error(`Agent not found for task type: ${step.taskType}`);
    }

    let output: StandardAgentOutput | undefined;
    let lastError: Error | undefined;
    let retryCount = 0;
    const maxRetries = step.retryPolicy?.maxRetries ?? 0;

    while (retryCount <= maxRetries) {
      try {
        output = await this.executeWithTimeout(
          () => agent.executeTask(context.input),
          step.timeout ?? config.globalTimeout ?? 60000
        );
        break;
      } catch (error) {
        lastError = error as Error;
        retryCount++;
        if (retryCount <= maxRetries) {
          logger.warn(`[Workflow] Retry ${retryCount} for step ${step.id}`);
          await this.sleep(step.retryPolicy?.backoffMs ?? 1000);
        }
      }
    }

    if (!output) {
      throw lastError || new Error('Step failed without output');
    }
    return { output, retryCount };
  }

  /**
   * Record a successful step result
   */
  private recordStepSuccess(
    step: WorkflowStep, config: WorkflowConfig, context: WorkflowContext,
    output: StandardAgentOutput, startTime: Date, endTime: Date, retryCount: number
  ): void {
    context.results.set(step.id, {
      agentId: step.agentId, taskType: step.taskType,
      status: AgentStatus.COMPLETED, output, startTime, endTime,
      duration: endTime.getTime() - startTime.getTime(), retryCount,
    });
    context.metadata.completedSteps++;
    this.emit({ type: 'step-completed', workflowId: config.id, stepId: step.id, timestamp: endTime, data: { output } });
  }

  /**
   * Record a failed step result
   */
  private recordStepFailure(
    step: WorkflowStep, config: WorkflowConfig, context: WorkflowContext,
    error: unknown, startTime: Date
  ): void {
    logger.error(`[Workflow] Step ${step.id} failed:`, error);
    context.results.set(step.id, {
      agentId: step.agentId, taskType: step.taskType,
      status: AgentStatus.FAILED, error: error as Error, startTime, endTime: new Date(),
    });
    context.metadata.failedSteps++;
    this.emit({ type: 'step-failed', workflowId: config.id, stepId: step.id, timestamp: new Date(), data: { error } });
  }

  /**
   * Check if step dependencies are met
   */
  private checkDependencies(step: WorkflowStep, context: WorkflowContext): boolean {
    return step.dependencies.every((dep: AgentDependency) => {
      const depResult = Array.from(context.results.values()).find(
        (r) => r.agentId === dep.agentId && r.taskType === dep.taskType
      );

      if (!depResult || depResult["status"] !== AgentStatus.COMPLETED) {
        return !dep.required;
      }

      if (dep.minConfidence && depResult.output) {
        return depResult.output.confidence >= dep.minConfidence;
      }

      return true;
    });
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate workflow metrics
   */
  private calculateMetrics(context: WorkflowContext): WorkflowMetrics {
    return calculateWorkflowMetrics(context);
  }

  /**
   * Event listener management
   */
  on(eventType: string, handler: (event: WorkflowEvent) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(handler);
  }

  private emit(event: WorkflowEvent): void {
    const handlers = this.listeners.get(event.type) || [];
    handlers.forEach((handler) => handler(event));
  }
}

// Singleton instance
export const workflowExecutor = new WorkflowExecutor();
