/**
 * Types and defaults for Standard Agent Execution Pattern
 */

import type { ModelId } from "@/lib/ai/gemini-core";

export type { ModelId };

// =====================================================
// Public Types
// =====================================================

export interface StandardAgentInput {
  input: string;
  options?: StandardAgentOptions;
  context?: string | Record<string, unknown>;
}

export interface StandardAgentOptions {
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retries?: number;
  enableCaching?: boolean;
  enableLogging?: boolean;
  enableRAG?: boolean;
  enableSelfCritique?: boolean;
  enableConstitutional?: boolean;
  enableUncertainty?: boolean;
  enableHallucination?: boolean;
  enableDebate?: boolean;
  confidenceThreshold?: number;
  maxIterations?: number;
}

export interface StandardAgentOutput {
  text: string;
  confidence: number;
  notes: string[];
  metadata?: {
    ragUsed?: boolean;
    critiqueIterations?: number;
    constitutionalViolations?: number;
    uncertaintyScore?: number;
    hallucinationDetected?: boolean;
    debateRounds?: number;
    completionQuality?: number;
    creativityScore?: number;
    sceneQuality?: number;
    worldQuality?: unknown;
    processingTime?: number;
    [key: string]: unknown;
  };
}

export interface RAGContext {
  chunks: string[];
  relevanceScores: number[];
}

export interface SelfCritiqueResult {
  improved: boolean;
  iterations: number;
  finalText: string;
  improvementScore: number;
}

export interface ConstitutionalCheckResult {
  compliant: boolean;
  violations: string[];
  correctedText: string;
}

export interface UncertaintyMetrics {
  score: number;
  confidence: number;
  uncertainAspects: string[];
}

export interface HallucinationCheckResult {
  detected: boolean;
  claims: { claim: string; supported: boolean }[];
  correctedText: string;
}

// =====================================================
// Internal Types
// =====================================================

export interface ExecutionMetadata extends Record<string, unknown> {
  ragUsed: boolean;
  critiqueIterations: number;
  constitutionalViolations: number;
  uncertaintyScore: number;
  hallucinationDetected: boolean;
  debateRounds: number;
}

export interface ExecutionState {
  currentText: string;
  confidence: number;
}

export interface NormalizedExecutionArgs {
  taskPrompt: string;
  options: StandardAgentOptions;
  context?: Record<string, unknown>;
}

// =====================================================
// Default Options
// =====================================================

export const DEFAULT_OPTIONS: StandardAgentOptions = {
  temperature: 0.3,
  enableRAG: true,
  enableSelfCritique: true,
  enableConstitutional: true,
  enableUncertainty: true,
  enableHallucination: true,
  enableDebate: false,
  confidenceThreshold: 0.7,
  maxIterations: 3,
};
