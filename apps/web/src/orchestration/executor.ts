// Pipeline Orchestration Executor
// Manages execution of AI analysis pipelines with proper error handling and progress tracking

import { geminiService, type GeminiConfig } from "@/ai/gemini-service";
import { logger } from "@/lib/ai/utils/logger";
import { cachedGeminiCall, generateGeminiCacheKey } from "@/lib/redis";
import { AnalysisType } from "@/types/enums";

export type PipelineInputData = Record<string, unknown>;
export type PipelineTaskStatus = "queued" | "running" | "completed" | "failed";

export interface PipelineStep {
  id: string;
  name: string;
  description: string;
  type: AnalysisType;
  config: GeminiConfig;
  dependencies?: string[]; // IDs of steps this depends on
  timeout?: number; // in milliseconds
  retries?: number;
}

export interface PipelineResult {
  stepId: string;
  success: boolean;
  data?: string;
  error?: string;
  duration: number;
  cached: boolean;
}

export interface PipelineExecution {
  id: string;
  steps: PipelineStep[];
  results: Map<string, PipelineResult>;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  startTime: Date;
  endTime?: Date;
}

export interface PipelineTaskRequest {
  pipelineId?: string;
  steps: PipelineStep[];
  inputData: PipelineInputData;
  priority?: "low" | "normal" | "high";
}

export interface PipelineTaskSubmission {
  success: true;
  taskId: string;
  pipelineId: string;
  status: PipelineTaskStatus;
  queuedAt: string;
}

interface PipelineTaskState extends PipelineTaskSubmission {
  request: PipelineTaskRequest;
  startedAt?: string;
  completedAt?: string;
  execution?: PipelineExecution;
  error?: string;
}

const submittedTasks = new Map<string, PipelineTaskState>();
let taskSequence = 0;

function createTaskId(): string {
  taskSequence += 1;
  return `task_${Date.now()}_${taskSequence}`;
}

// Orchestrator class
export class PipelineOrchestrator {
  private activeExecutions = new Map<string, PipelineExecution>();

  // Execute a pipeline with dependency management
  async executePipeline(
    pipelineId: string,
    steps: PipelineStep[],
    inputData: PipelineInputData
  ): Promise<PipelineExecution> {
    const execution: PipelineExecution = {
      id: pipelineId,
      steps,
      results: new Map(),
      status: "running",
      progress: 0,
      startTime: new Date(),
    };

    this.activeExecutions.set(pipelineId, execution);

    try {
      // Build dependency graph

      // Execute steps in order
      const executedSteps = new Set<string>();

      for (const step of steps) {
        if (this.canExecuteStep(step, executedSteps)) {
          const result = await this.executeStep(step, inputData);
          execution.results.set(step.id, result);
          executedSteps.add(step.id);

          // Update progress
          execution.progress = (executedSteps.size / steps.length) * 100;
        } else {
          // Wait for dependencies
          await this.waitForDependencies(step, execution);
          const result = await this.executeStep(step, inputData);
          execution.results.set(step.id, result);
          executedSteps.add(step.id);
          execution.progress = (executedSteps.size / steps.length) * 100;
        }
      }

      execution.status = "completed";
      execution.endTime = new Date();
    } catch {
      execution.status = "failed";
      execution.endTime = new Date();
      logger.error("Pipeline execution failed");
    }

    return execution;
  }

  // Execute individual step with caching and error handling
  private async executeStep(
    step: PipelineStep,
    inputData: PipelineInputData
  ): Promise<PipelineResult> {
    const startTime = Date.now();

    try {
      const cacheKey = generateGeminiCacheKey(
        `analysis:${step.id}:${step.type}`,
        "gemini-1.5-flash",
        inputData
      );

      const result = await cachedGeminiCall(
        cacheKey,
        async () => {
          // Build prompt based on step type and input data
          const prompt = this.buildStepPrompt(step, inputData);

          return geminiService.generateText(prompt, {
            model: "gemini-1.5-flash",
          });
        },
        { ttl: 1800 } // 30 minutes TTL
      );

      return {
        stepId: step.id,
        success: true,
        data: result,
        duration: Date.now() - startTime,
        cached: false, // This would need to be determined from cache layer
      };
    } catch (error) {
      return {
        stepId: step.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        duration: Date.now() - startTime,
        cached: false,
      };
    }
  }

  // Check if step can be executed
  private canExecuteStep(
    step: PipelineStep,
    executedSteps: Set<string>
  ): boolean {
    const dependencies = step.dependencies ?? [];
    return dependencies.every((dep) => executedSteps.has(dep));
  }

  // Wait for dependencies to complete
  private async waitForDependencies(
    step: PipelineStep,
    execution: PipelineExecution
  ): Promise<void> {
    const dependencies = step.dependencies ?? [];
    const checkInterval = 100; // ms
    const maxWait = 30000; // 30 seconds
    let waited = 0;

    while (waited < maxWait) {
      const allDepsCompleted = dependencies.every((dep) =>
        execution.results.has(dep)
      );

      if (allDepsCompleted) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    throw new Error(`Dependencies not satisfied for step ${step.id}`);
  }

  // Build prompt for step execution
  private buildStepPrompt(
    step: PipelineStep,
    inputData: PipelineInputData
  ): string {
    const basePrompts: Record<AnalysisType, string> = {
      [AnalysisType.CHARACTERS]:
        "Analyze the characters in this screenplay. Identify main characters, their traits, relationships, and character arcs.",
      [AnalysisType.THEMES]:
        "Extract and analyze the main themes and motifs in this screenplay.",
      [AnalysisType.STRUCTURE]:
        "Analyze the dramatic structure, acts, and plot points in this screenplay.",
      [AnalysisType.SCREENPLAY]:
        "Review this screenplay for technical writing quality, formatting, and dramatic effectiveness.",
      [AnalysisType.QUICK]:
        "Provide a quick summary and initial impressions of this screenplay.",
      [AnalysisType.DETAILED]:
        "Provide a comprehensive analysis covering all aspects of this screenplay.",
      [AnalysisType.FULL]:
        "Perform complete analysis including characters, themes, structure, and recommendations.",
    };

    const prompt = basePrompts[step.type] || "Analyze this content:";

    return `${prompt}\n\nContent: ${JSON.stringify(inputData)}\n\nProvide detailed analysis in Arabic.`;
  }

  // Get execution status
  getExecution(pipelineId: string): PipelineExecution | undefined {
    return this.activeExecutions.get(pipelineId);
  }

  // Cancel execution
  cancelExecution(pipelineId: string): boolean {
    const execution = this.activeExecutions.get(pipelineId);
    if (execution?.status === "running") {
      execution.status = "failed";
      execution.endTime = new Date();
      return true;
    }
    return false;
  }
}

async function processSubmittedTask(taskId: string): Promise<void> {
  const task = submittedTasks.get(taskId);
  if (!task) {
    return;
  }

  task.status = "running";
  task.startedAt = new Date().toISOString();

  try {
    const execution = await pipelineExecutor.executePipeline(
      task.pipelineId,
      task.request.steps,
      task.request.inputData
    );
    task.execution = execution;
    task.status = execution.status === "completed" ? "completed" : "failed";
    task.completedAt = new Date().toISOString();
  } catch (error) {
    task.status = "failed";
    task.completedAt = new Date().toISOString();
    task.error = error instanceof Error ? error.message : "Unknown task error";
    logger.error("Pipeline task failed", { error, taskId });
  }
}

/**
 * Submit a task to the executor.
 */
export function submitTask(
  taskRequest: PipelineTaskRequest
): PipelineTaskSubmission {
  if (!Array.isArray(taskRequest.steps) || taskRequest.steps.length === 0) {
    throw new Error("submitTask requires at least one pipeline step");
  }

  const taskId = createTaskId();
  const pipelineId = taskRequest.pipelineId ?? `pipeline_${taskId}`;
  const queuedAt = new Date().toISOString();
  const task: PipelineTaskState = {
    success: true,
    taskId,
    pipelineId,
    status: "queued",
    queuedAt,
    request: { ...taskRequest, pipelineId },
  };

  submittedTasks.set(taskId, task);
  queueMicrotask(() => {
    void processSubmittedTask(taskId);
  });

  return {
    success: true,
    taskId,
    pipelineId,
    status: "queued",
    queuedAt,
  };
}

export function getSubmittedTask(
  taskId: string
): PipelineTaskState | undefined {
  return submittedTasks.get(taskId);
}

// Export singleton instance
export const pipelineExecutor = new PipelineOrchestrator();
