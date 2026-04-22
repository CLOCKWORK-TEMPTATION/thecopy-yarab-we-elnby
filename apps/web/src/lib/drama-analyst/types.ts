/**
 * Core types for Drama Analyst AI Agent System
 */

export type {
  AIAgentConfig,
  AIAgentCapabilities,
  Result,
  AIRequest,
  AIResponse,
} from "./core/types";

export type {
  StandardAgentOptions,
  StandardAgentInput,
  StandardAgentOutput,
} from "./agents/shared/standardAgentPattern";

export { TaskType, TaskCategory } from "./enums";

export interface AgentConfigMapping {
  path: string;
  configName: string;
}

/**
 * Processed file information
 */
export interface ProcessedFile {
  id: string;
  name: string;
  content: string;
  type: string;
  size: number;
  processedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Agent identifier type
 */
export type AgentId = string;
