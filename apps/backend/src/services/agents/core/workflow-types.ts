/**
 * Workflow System Types - Enhanced Type System for Multi-Agent Workflow
 * Based on GEMINI-3-PRO-REVIEW recommendations
 */

import { TaskType } from "./enums";
import { StandardAgentInput, StandardAgentOutput } from "./types";

/**
 * Agent Status in Workflow
 */
export enum AgentStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  SKIPPED = "skipped",
  CANCELLED = "cancelled",
}

/**
 * Workflow Execution Status
 */
export enum WorkflowStatus {
  INITIALIZED = "initialized",
  RUNNING = "running",
  PAUSED = "paused",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

/**
 * Agent Dependency Configuration
 */
export interface AgentDependency {
  agentId: string;
  taskType: TaskType;
  required: boolean;
  minConfidence?: number;
  fallbackBehavior?: "skip" | "retry" | "fail";
}

/**
 * Agent Execution Result
 */
export interface AgentExecutionResult {
  agentId: string;
  taskType: TaskType;
  status: AgentStatus;
  output?: StandardAgentOutput;
  error?: Error;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  retryCount?: number;
}

/**
 * Workflow Step Configuration
 */
export interface WorkflowStep {
  id: string;
  agentId: string;
  taskType: TaskType;
  dependencies: AgentDependency[];
  parallel?: boolean;
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
  timeout?: number;
  skipOnError?: boolean;
}

/**
 * Workflow Configuration
 */
export interface WorkflowConfig {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  maxConcurrency?: number;
  globalTimeout?: number;
  errorHandling?: "strict" | "lenient";
}

/**
 * Workflow Execution Context
 */
export interface WorkflowContext {
  workflowId: string;
  input: StandardAgentInput;
  results: Map<string, AgentExecutionResult>;
  sharedData: Map<string, unknown>;
  metadata: {
    startedAt: Date;
    completedAt?: Date;
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
  };
}

/**
 * Workflow Execution Plan
 */
export interface WorkflowExecutionPlan {
  stages: WorkflowStage[];
  estimatedDuration?: number;
  resourceRequirements?: {
    memoryMb: number;
    cpuCores: number;
  };
}

/**
 * Workflow Stage (parallel execution group)
 */
export interface WorkflowStage {
  stageNumber: number;
  steps: WorkflowStep[];
  dependencies: string[]; // IDs of previous stages
  canRunInParallel: boolean;
}

/**
 * Workflow Event
 */
export interface WorkflowEvent {
  type:
    | "step-started"
    | "step-completed"
    | "step-failed"
    | "workflow-completed"
    | "workflow-failed";
  workflowId: string;
  stepId?: string;
  timestamp: Date;
  data?: unknown;
}

/**
 * Workflow Metrics
 */
export interface WorkflowMetrics {
  totalExecutionTime: number;
  avgAgentExecutionTime: number;
  parallelizationEfficiency: number;
  successRate: number;
  confidenceDistribution: {
    min: number;
    max: number;
    avg: number;
    median: number;
  };
}
