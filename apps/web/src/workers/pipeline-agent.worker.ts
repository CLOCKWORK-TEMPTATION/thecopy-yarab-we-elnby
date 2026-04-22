/**
 * Background Agent Worker for Pipeline Execution
 * Handles heavy AI pipeline processing off the main thread
 */

import type {
  PipelineAgentMessage,
  PipelineAgentResult,
} from "./pipeline-agent-types";

// Worker message handler
self.addEventListener(
  "message",
  async (event: MessageEvent<PipelineAgentMessage>) => {
    const message = event.data;

    try {
      switch (message.type) {
        case "execute-pipeline":
          await executePipeline(message);
          break;
        case "execute-step":
          await executeStep(message);
          break;
        case "cancel":
          handleCancel(message.executionId);
          break;
        default:
          sendError("Unknown message type");
      }
    } catch (error) {
      sendError(
        error instanceof Error ? error.message : "Worker execution failed"
      );
    }
  }
);

// Active execution tracking
const activeExecutions = new Map<string, AbortController>();

/**
 * Execute full pipeline in background
 */
async function executePipeline(
  message: Extract<PipelineAgentMessage, { type: "execute-pipeline" }>
) {
  const { executionId, steps, inputData } = message;
  const controller = new AbortController();
  activeExecutions.set(executionId, controller);

  try {
    sendProgress(executionId, 0, steps.length, "started");

    const results = new Map<string, any>();
    const executedSteps = new Set<string>();

    for (let i = 0; i < steps.length; i++) {
      if (controller.signal.aborted) {
        sendCancelled(executionId);
        return;
      }

      const step = steps[i];
      if (!step) {
        sendError(`Missing step at index ${i}`);
        return;
      }

      // Check dependencies
      const canExecute =
        !step.dependencies ||
        step.dependencies.every((dep) => executedSteps.has(dep));

      if (!canExecute) {
        sendError(`Dependencies not satisfied for step ${step.id}`);
        return;
      }

      // Execute step
      const stepResult = await executeStepLogic(step, inputData, results);
      results.set(step.id, stepResult);
      executedSteps.add(step.id);

      // Send progress
      const progress = ((i + 1) / steps.length) * 100;
      sendProgress(executionId, progress, i + 1, "running");
    }

    // Send completion
    sendComplete(executionId, results);
  } catch (error) {
    sendError(
      error instanceof Error ? error.message : "Pipeline execution failed"
    );
  } finally {
    activeExecutions.delete(executionId);
  }
}

/**
 * Execute single step in background
 */
async function executeStep(
  message: Extract<PipelineAgentMessage, { type: "execute-step" }>
) {
  const { executionId, step, inputData } = message;

  try {
    const result = await executeStepLogic(step, inputData, new Map());

    const response: PipelineAgentResult = {
      type: "step-complete",
      executionId,
      stepId: step.id,
      result,
      success: true,
    };

    self.postMessage(response);
  } catch (error) {
    sendStepError(
      executionId,
      step.id,
      error instanceof Error ? error.message : "Step execution failed"
    );
  }
}

/**
 * Core step execution logic
 */
async function executeStepLogic(
  step: any,
  inputData: Record<string, any>,
  previousResults: Map<string, any>
): Promise<any> {
  const startTime = Date.now();

  // Simulate API call with timeout
  const timeout = step.timeout || 60000;

  const executionPromise = new Promise((resolve) => {
    // In real implementation, this would call the API endpoint
    // For now, simulate processing
    setTimeout(() => {
      resolve({
        stepId: step.id,
        data: {
          analysis: `Processed ${step.name}`,
          inputSize: JSON.stringify(inputData).length,
          previousSteps: Array.from(previousResults.keys()),
        },
        duration: Date.now() - startTime,
      });
    }, 1000); // Simulate 1s processing
  });

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Step ${step.id} timed out`)), timeout);
  });

  return Promise.race([executionPromise, timeoutPromise]);
}

/**
 * Handle cancellation
 */
function handleCancel(executionId: string) {
  const controller = activeExecutions.get(executionId);
  if (controller) {
    controller.abort();
    activeExecutions.delete(executionId);
    sendCancelled(executionId);
  }
}

/**
 * Send progress update
 */
function sendProgress(
  executionId: string,
  progress: number,
  completedSteps: number,
  status: string
) {
  const response: PipelineAgentResult = {
    type: "progress",
    executionId,
    progress,
    completedSteps,
    status,
  };
  self.postMessage(response);
}

/**
 * Send completion
 */
function sendComplete(executionId: string, results: Map<string, any>) {
  const response: PipelineAgentResult = {
    type: "complete",
    executionId,
    results: Object.fromEntries(results),
    success: true,
  };
  self.postMessage(response);
}

/**
 * Send error
 */
function sendError(error: string) {
  const response: PipelineAgentResult = {
    type: "error",
    error,
  };
  self.postMessage(response);
}

/**
 * Send step error
 */
function sendStepError(executionId: string, stepId: string, error: string) {
  const response: PipelineAgentResult = {
    type: "step-complete",
    executionId,
    stepId,
    success: false,
    error,
  };
  self.postMessage(response);
}

/**
 * Send cancellation
 */
function sendCancelled(executionId: string) {
  const response: PipelineAgentResult = {
    type: "cancelled",
    executionId,
  };
  self.postMessage(response);
}

export {};
