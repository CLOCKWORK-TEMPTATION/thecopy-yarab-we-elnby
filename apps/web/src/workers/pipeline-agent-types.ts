/**
 * Type definitions for Pipeline Agent Worker
 */

import type { PipelineStep } from "@/orchestration/executor";

// ====== Pipeline Agent Worker Messages ======

export interface ExecutePipelineMessage {
  type: "execute-pipeline";
  executionId: string;
  steps: PipelineStep[];
  inputData: Record<string, any>;
}

export interface ExecuteStepMessage {
  type: "execute-step";
  executionId: string;
  step: PipelineStep;
  inputData: Record<string, any>;
  previousResults?: Record<string, any>;
}

export interface CancelPipelineMessage {
  type: "cancel";
  executionId: string;
}

export type PipelineAgentMessage =
  | ExecutePipelineMessage
  | ExecuteStepMessage
  | CancelPipelineMessage;

// ====== Pipeline Agent Worker Results ======

export interface ProgressResult {
  type: "progress";
  executionId: string;
  progress: number;
  completedSteps: number;
  status: string;
}

export interface CompleteResult {
  type: "complete";
  executionId: string;
  results: Record<string, any>;
  success: true;
}

export interface StepCompleteResult {
  type: "step-complete";
  executionId: string;
  stepId: string;
  result?: any;
  success: boolean;
  error?: string;
}

export interface ErrorResult {
  type: "error";
  error: string;
  executionId?: string;
}

export interface CancelledResult {
  type: "cancelled";
  executionId: string;
}

export type PipelineAgentResult =
  | ProgressResult
  | CompleteResult
  | StepCompleteResult
  | ErrorResult
  | CancelledResult;

// ====== Pipeline Agent Manager Types ======

export interface PipelineAgentPool {
  worker: Worker | null;
}

export interface PipelineExecutionCallback {
  onProgress?: (
    progress: number,
    completedSteps: number,
    status: string
  ) => void;
  onStepComplete?: (stepId: string, result: any) => void;
  onComplete?: (results: Record<string, any>) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}
