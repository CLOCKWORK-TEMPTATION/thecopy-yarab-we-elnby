/**
 * Workflow Builder - Fluent API for building multi-agent workflows
 */

import { definedProps } from "@/utils/defined-props";

import { TaskType } from "./enums";
import {
  WorkflowConfig,
  WorkflowStep,
  AgentDependency,
} from "./workflow-types";

export class WorkflowBuilder {
  private config: Partial<WorkflowConfig>;
  private steps: WorkflowStep[] = [];
  private stepCounter = 0;

  constructor(name: string, description?: string) {
    this.config = {
      name,
      maxConcurrency: 5,
      globalTimeout: 300000, // 5 minutes
      errorHandling: "lenient",
      ...definedProps({ description }),
    };
  }

  /**
   * Add a step to the workflow
   */
  addStep(
    agentId: string,
    taskType: TaskType,
    options?: {
      dependencies?: AgentDependency[];
      parallel?: boolean;
      timeout?: number;
      skipOnError?: boolean;
      retryPolicy?: {
        maxRetries: number;
        backoffMs: number;
      };
    },
  ): this {
    const step: WorkflowStep = {
      id: `step-${this.stepCounter++}`,
      agentId,
      taskType,
      dependencies: options?.dependencies ?? [],
      parallel: options?.parallel ?? false,
      skipOnError: options?.skipOnError ?? false,
      retryPolicy: options?.retryPolicy ?? {
        maxRetries: 2,
        backoffMs: 1000,
      },
      ...definedProps({
        timeout: options?.timeout,
      }),
    };

    this.steps.push(step);
    return this;
  }

  /**
   * Add dependent step
   */
  addDependentStep(
    agentId: string,
    taskType: TaskType,
    dependsOn: {
      agentId: string;
      taskType: TaskType;
      minConfidence?: number;
    }[],
    options?: {
      parallel?: boolean;
      timeout?: number;
    },
  ): this {
    const dependencies: AgentDependency[] = dependsOn.map((dep) => ({
      agentId: dep.agentId,
      taskType: dep.taskType,
      required: true,
      minConfidence: dep.minConfidence ?? 0.7,
      fallbackBehavior: "fail",
    }));

    return this.addStep(agentId, taskType, {
      dependencies,
      ...definedProps({
        parallel: options?.parallel,
        timeout: options?.timeout,
      }),
    });
  }

  /**
   * Add parallel steps
   */
  addParallelSteps(steps: { agentId: string; taskType: TaskType }[]): this {
    steps.forEach((step) => {
      this.addStep(step.agentId, step.taskType, { parallel: true });
    });
    return this;
  }

  /**
   * Set concurrency limit
   */
  withConcurrency(maxConcurrency: number): this {
    this.config.maxConcurrency = maxConcurrency;
    return this;
  }

  /**
   * Set global timeout
   */
  withTimeout(timeoutMs: number): this {
    this.config.globalTimeout = timeoutMs;
    return this;
  }

  /**
   * Set error handling strategy
   */
  withErrorHandling(strategy: "strict" | "lenient"): this {
    this.config.errorHandling = strategy;
    return this;
  }

  /**
   * Build the workflow configuration
   */
  build(): WorkflowConfig {
    return {
      id: `workflow-${Date.now()}`,
      name: this.config.name!,
      steps: this.steps,
      ...definedProps({
        description: this.config.description,
        maxConcurrency: this.config.maxConcurrency,
        globalTimeout: this.config.globalTimeout,
        errorHandling: this.config.errorHandling,
      }),
    };
  }
}

/**
 * Helper function to create workflow builder
 */
export function createWorkflow(
  name: string,
  description?: string,
): WorkflowBuilder {
  return new WorkflowBuilder(name, description);
}
