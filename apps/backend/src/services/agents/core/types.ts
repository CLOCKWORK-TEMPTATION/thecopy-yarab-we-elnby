/**
 * Core types for Drama Analyst AI Agent System - Backend
 */

import { TaskType, TaskCategory } from "./enums";

export interface AIAgentCapabilities {
  // Core capabilities
  reasoningChains?: boolean;
  ragEnabled?: boolean;
  agentOrchestration?: boolean;
  metacognitive?: boolean;
  multiModal?: boolean;
  complexityScore?: number;
  accuracyLevel?: number;
  processingSpeed?: number | string;
  resourceIntensity?: number | string;
  memorySystem?: boolean;
  toolUse?: boolean;
  vectorSearch?: boolean;
  adaptiveLearning?: boolean;
  contextWindow?: number;
  responseLatency?: number;
  scalability?: number;
  reliability?: number;
  canAnalyze?: boolean;
  canGenerate?: boolean;
  canTransform?: boolean;
  canPredict?: boolean;
  requiresContext?: boolean;
  requiresFiles?: boolean;
  selfReflection?: boolean;
  languageModeling?: boolean;
  patternRecognition?: boolean;
  contextualUnderstanding?: boolean;
  creativeSynthesis?: boolean;
  logicalInference?: boolean;
  emotionalIntelligence?: boolean;
  culturalAwareness?: boolean;
  temporalReasoning?: boolean;
  spatialReasoning?: boolean;
  narrativeConstruction?: boolean;
  characterPsychology?: boolean;
  dialogueGeneration?: boolean;
  sceneComposition?: boolean;
  thematicAnalysis?: boolean;
  structuralAnalysis?: boolean;
  styleAdaptation?: boolean;
  audienceModeling?: boolean;
  feedbackIntegration?: boolean;
  iterativeRefinement?: boolean;
  crossDomainKnowledge?: boolean;
  ethicalConsideration?: boolean;
  creativeGeneration?: boolean;
  analyticalReasoning?: boolean;
  outputType?: string;
  [key: string]: unknown;
}

export type CacheStrategy = "none" | "memory" | "disk";

export interface AIAgentConfig {
  id: string;
  name?: string;
  description?: string;
  type?: string;
  category?: string;
  capabilities?: AIAgentCapabilities;
  dependencies?: string[];
  collaborators?: string[];
  enhancedBy?: string[];
  dependsOn?: string[];
  collaboratesWith?: string[];
  enhances?: string[];
  parallelizable?: boolean;
  cacheStrategy?: CacheStrategy | (string & {});
  confidenceThreshold?: number;
  prompt?: string;
  systemInstruction?: string;
  systemPrompt?: string;
  fewShotExamples?: unknown[];
  chainOfThoughtTemplate?: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: unknown;
}

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
    timestamp?: string;
    error?: string;
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
  originalOutput?: string;
  critiqueNotes?: string[];
  critiques?: string[];
  refinedOutput?: string;
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

export interface AgentConfigMapping {
  path: string;
  configName: string;
}

export interface Result<T, E = Error> {
  ok: boolean;
  value?: T;
  error?:
    | E
    | {
        code: string;
        message: string;
        cause?: unknown;
      };
}

export interface AIRequest {
  agent: string;
  prompt: string;
  files?: { fileName: string; sizeBytes: number }[];
  params?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
}

export interface AIResponse {
  text?: string;
  tokensUsed?: number;
  meta?: Record<string, unknown>;
  raw?: string;
  parsed?: unknown;
  agent?: string;
}

// Agent ID type - string identifier for agents
export type AgentId = string;

// Plot Predictor Types - for causal graph analysis
export interface PlotNode {
  id: string;
  event: string;
  timestamp: number;
  importance: number;
}

export interface PlotEdge {
  from: string;
  to: string;
  causationType: "direct" | "indirect" | "consequence";
  strength: number;
}

export interface CausalRelation {
  type: "direct" | "indirect" | "consequence";
  strength: number;
  cause?: string;
  effect?: string;
  explanation?: string;
  confidence?: number;
}

export interface CausalPlotGraph {
  nodes: PlotNode[];
  edges: PlotEdge[];
  timeline: string[];
  causality: unknown;
}

export { TaskType, TaskCategory };
