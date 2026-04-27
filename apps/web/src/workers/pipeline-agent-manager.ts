import { logger } from "@/lib/ai/utils/logger";

import type {
  ExecutePipelineMessage,
  ExecuteStepMessage,
  CancelPipelineMessage,
  PipelineAgentResult,
  PipelineAgentPool,
  PipelineExecutionCallback,
} from "./pipeline-agent-types";
import type { PipelineInputData, PipelineStep } from "@/orchestration/executor";

/**
 * Pipeline Agent Manager
 * Manages background worker for pipeline execution
 */

export class PipelineAgentManager {
  private workerPool: PipelineAgentPool = {
    worker: null,
  };

  private callbacks = new Map<string, PipelineExecutionCallback>();

  /**
   * Initialize the pipeline agent worker
   */
  initialize(): void {
    try {
      this.workerPool.worker = new Worker(
        new URL("./pipeline-agent.worker.ts", import.meta.url),
        { type: "module" }
      );

      this.workerPool.worker.addEventListener(
        "message",
        this.handleWorkerMessage.bind(this)
      );
      this.workerPool.worker.addEventListener(
        "error",
        this.handleWorkerError.bind(this)
      );
    } catch (error) {
      logger.error("Failed to initialize pipeline agent worker");
      throw error;
    }
  }

  /**
   * Handle messages from worker
   */
  private handleWorkerMessage(event: MessageEvent<PipelineAgentResult>) {
    const result = event.data;

    switch (result.type) {
      case "progress":
        this.handleProgress(result);
        break;
      case "complete":
        this.handleComplete(result);
        break;
      case "step-complete":
        this.handleStepComplete(result);
        break;
      case "error":
        this.handleError(result);
        break;
      case "cancelled":
        this.handleCancelled(result);
        break;
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(error: ErrorEvent) {
    logger.error("Pipeline agent worker error:", error);

    // Notify all active callbacks
    this.callbacks.forEach((callback) => {
      if (callback.onError) {
        callback.onError(error.message);
      }
    });
  }

  /**
   * Handle progress updates
   */
  private handleProgress(
    result: Extract<PipelineAgentResult, { type: "progress" }>
  ) {
    const callback = this.callbacks.get(result.executionId);
    if (callback?.onProgress) {
      callback.onProgress(
        result.progress,
        result.completedSteps,
        result.status
      );
    }
  }

  /**
   * Handle completion
   */
  private handleComplete(
    result: Extract<PipelineAgentResult, { type: "complete" }>
  ) {
    const callback = this.callbacks.get(result.executionId);
    if (callback?.onComplete) {
      callback.onComplete(result.results);
    }
    this.callbacks.delete(result.executionId);
  }

  /**
   * Handle step completion
   */
  private handleStepComplete(
    result: Extract<PipelineAgentResult, { type: "step-complete" }>
  ) {
    const callback = this.callbacks.get(result.executionId);

    if (result.success && callback?.onStepComplete && result.result) {
      callback.onStepComplete(result.stepId, result.result);
    } else if (!result.success && callback?.onError && result.error) {
      callback.onError(result.error);
    }
  }

  /**
   * Handle errors
   */
  private handleError(result: Extract<PipelineAgentResult, { type: "error" }>) {
    if (result.executionId) {
      const callback = this.callbacks.get(result.executionId);
      if (callback?.onError) {
        callback.onError(result.error);
      }
      this.callbacks.delete(result.executionId);
    } else {
      logger.error("Pipeline agent error:", result.error);
    }
  }

  /**
   * Handle cancellation
   */
  private handleCancelled(
    result: Extract<PipelineAgentResult, { type: "cancelled" }>
  ) {
    const callback = this.callbacks.get(result.executionId);
    if (callback?.onCancel) {
      callback.onCancel();
    }
    this.callbacks.delete(result.executionId);
  }

  /**
   * Execute pipeline in background worker
   */
  executePipeline(
    executionId: string,
    steps: PipelineStep[],
    inputData: PipelineInputData,
    callback?: PipelineExecutionCallback
  ): void {
    if (!this.workerPool.worker) {
      throw new Error("Pipeline agent worker not initialized");
    }

    if (callback) {
      this.callbacks.set(executionId, callback);
    }

    const message: ExecutePipelineMessage = {
      type: "execute-pipeline",
      executionId,
      steps,
      inputData,
    };

    this.workerPool.worker.postMessage(message);
  }

  /**
   * Execute single step in background worker
   */
  executeStep(
    executionId: string,
    step: PipelineStep,
    inputData: PipelineInputData,
    callback?: PipelineExecutionCallback
  ): void {
    if (!this.workerPool.worker) {
      throw new Error("Pipeline agent worker not initialized");
    }

    if (callback) {
      this.callbacks.set(executionId, callback);
    }

    const message: ExecuteStepMessage = {
      type: "execute-step",
      executionId,
      step,
      inputData,
    };

    this.workerPool.worker.postMessage(message);
  }

  /**
   * Cancel pipeline execution
   */
  cancelExecution(executionId: string): void {
    if (!this.workerPool.worker) {
      return;
    }

    const message: CancelPipelineMessage = {
      type: "cancel",
      executionId,
    };

    this.workerPool.worker.postMessage(message);
    this.callbacks.delete(executionId);
  }

  /**
   * Terminate worker and cleanup
   */
  terminate(): void {
    if (this.workerPool.worker) {
      this.workerPool.worker.terminate();
      this.workerPool.worker = null;
    }
    this.callbacks.clear();
  }

  /**
   * Check if worker is initialized
   */
  isInitialized(): boolean {
    return !!this.workerPool.worker;
  }
}

// Singleton instance
export const pipelineAgentManager = new PipelineAgentManager();
