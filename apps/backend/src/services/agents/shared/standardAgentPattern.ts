/**
 * Standard Agent Execution Pattern
 *
 * This module provides a unified execution pattern for all drama analyst agents:
 * RAG -> Self-Critique -> Constitutional -> Uncertainty -> Hallucination -> (Optional) Debate
 */

import { geminiService } from "@/services/gemini.service";
import { enhancedRAGService } from "@/services/rag/enhancedRAG.service";

import {
  performConstitutionalCheck,
  measureUncertainty,
  detectHallucinations,
  performSelfCritique,
} from "./standardAgentChecks";

// Re-export types from checks module
export type { ModelId, SelfCritiqueResult } from "./standardAgentChecks";
export type {
  ConstitutionalCheckResult,
  UncertaintyMetrics,
  HallucinationCheckResult,
} from "./standardAgentChecks";

// Helper function to call Gemini AI with text prompt
async function callGeminiText(
  prompt: string,
  _options?: { temperature?: number },
): Promise<string> {
  const response = await geminiService.analyzeText(prompt, "general");
  return response;
}

// Helper function to safely convert value to text
function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
}

// =====================================================
// Types
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
  enableSemanticRAG?: boolean;
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
  metrics?: {
    precision?: number;
    recall?: number;
    avgRelevance?: number;
    processingTime?: number;
  };
}

// =====================================================
// Default Options
// =====================================================

const DEFAULT_OPTIONS: StandardAgentOptions = {
  temperature: 0.3,
  enableRAG: true,
  enableSemanticRAG: true,
  enableSelfCritique: true,
  enableConstitutional: true,
  enableUncertainty: true,
  enableHallucination: true,
  enableDebate: false,
  confidenceThreshold: 0.7,
  maxIterations: 3,
};

// =====================================================
// RAG: Retrieval-Augmented Generation
// =====================================================

async function performRAG(
  input: string,
  context?: string,
  useSemanticRAG = true,
): Promise<RAGContext> {
  if (!context || context.length < 100 || !useSemanticRAG) {
    return { chunks: [], relevanceScores: [] };
  }

  const result = await enhancedRAGService.performRAG(input, context, {
    profile: "analysis",
    source: "standard-agent-context",
  });

  return {
    chunks: result.chunks.map((c) => c.text),
    relevanceScores: result.chunks.map((c) => c.relevanceScore),
    metrics: {
      precision: result.metrics.precision,
      recall: result.metrics.recall,
      avgRelevance: result.metrics.avgRelevanceScore,
      processingTime: result.metrics.processingTimeMs,
    },
  };
}

function buildPromptWithRAG(
  basePrompt: string,
  ragContext: RAGContext,
): string {
  if (ragContext.chunks.length === 0) return basePrompt;

  const contextSection = ragContext.chunks
    .map((chunk, i) => `[سياق ${i + 1}]:\n${chunk}`)
    .join("\n\n");

  return `${basePrompt}\n\n=== سياق إضافي من النص ===\n${contextSection}\n\n=== نهاية السياق ===\n`;
}

// =====================================================
// Pipeline State
// =====================================================

interface PipelineState {
  currentText: string;
  confidence: number;
  notes: string[];
  metadata: {
    ragUsed: boolean;
    critiqueIterations: number;
    constitutionalViolations: number;
    uncertaintyScore: number;
    hallucinationDetected: boolean;
    debateRounds: number;
  };
}

interface PipelineRunContext {
  taskPrompt: string;
  merged: StandardAgentOptions;
  options: StandardAgentOptions;
  originalText: string | undefined;
  state: PipelineState;
  startedAt: number;
}

// =====================================================
// Standard Agent Execution
// =====================================================

export async function executeStandardAgentPattern(
  taskPrompt: string,
  options: StandardAgentOptions,
  context?: Record<string, unknown>,
): Promise<StandardAgentOutput> {
  const startedAt = Date.now();
  const merged = { ...DEFAULT_OPTIONS, ...options };
  const originalText =
    typeof context?.["originalText"] === "string"
      ? context["originalText"]
      : undefined;

  const state: PipelineState = {
    currentText: "",
    confidence: 0.7,
    notes: [],
    metadata: {
      ragUsed: false,
      critiqueIterations: 0,
      constitutionalViolations: 0,
      uncertaintyScore: 0,
      hallucinationDetected: false,
      debateRounds: 0,
    },
  };

  try {
    return await runPipeline({
      taskPrompt,
      merged,
      options,
      originalText,
      state,
      startedAt,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "خطأ غير معروف";
    return {
      text: `حدث خطأ في التنفيذ: ${errorMsg}`,
      confidence: 0,
      notes: [`خطأ: ${errorMsg}`],
      metadata: {
        ...state.metadata,
        error: errorMsg,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startedAt,
      },
    };
  }
}

async function runPipeline(
  context: PipelineRunContext,
): Promise<StandardAgentOutput> {
  const { taskPrompt, merged, options, originalText, state, startedAt } =
    context;
  // Step 1: RAG
  const finalPrompt = await applyRAGStep(
    taskPrompt,
    merged,
    originalText,
    state,
  );
  state.currentText = await callGeminiText(finalPrompt, {
    temperature: merged.temperature ?? 0.3,
  });

  // Step 2-5: Quality checks
  if (options.enableSelfCritique)
    await applySelfCritiqueStep(finalPrompt, merged, state);
  if (options.enableConstitutional)
    await applyConstitutionalStep(taskPrompt, merged, state);
  if (options.enableUncertainty)
    await applyUncertaintyStep(finalPrompt, merged, state);
  if (options.enableHallucination)
    await applyHallucinationStep(taskPrompt, state);

  if (
    merged.enableDebate &&
    state.confidence < (merged.confidenceThreshold ?? 0.7)
  ) {
    state.notes.push("الثقة منخفضة - يُوصى بتفعيل النقاش متعدد الوكلاء");
  }

  return {
    text: toText(state.currentText),
    confidence: Math.round(state.confidence * 100) / 100,
    notes: state.notes,
    metadata: {
      ...state.metadata,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startedAt,
    },
  };
}

async function applyRAGStep(
  taskPrompt: string,
  merged: StandardAgentOptions,
  originalText: string | undefined,
  state: PipelineState,
): Promise<string> {
  if (!merged.enableRAG || !originalText) return taskPrompt;

  const useSemanticRAG = merged.enableSemanticRAG ?? true;
  const ragContext = await performRAG(taskPrompt, originalText, useSemanticRAG);
  const finalPrompt = buildPromptWithRAG(taskPrompt, ragContext);
  state.metadata.ragUsed = ragContext.chunks.length > 0;

  if (state.metadata.ragUsed) {
    const ragType = useSemanticRAG ? "Semantic RAG" : "Keyword RAG";
    state.notes.push(
      `استخدم ${ragType}: ${ragContext.chunks.length} أجزاء ذات صلة`,
    );
    if (ragContext.metrics) {
      state.notes.push(
        `دقة RAG: ${(ragContext.metrics.precision! * 100).toFixed(0)}%, ` +
          `استدعاء: ${(ragContext.metrics.recall! * 100).toFixed(0)}%`,
      );
    }
  }
  return finalPrompt;
}

async function applySelfCritiqueStep(
  finalPrompt: string,
  merged: StandardAgentOptions,
  state: PipelineState,
): Promise<void> {
  const result = await performSelfCritique(
    state.currentText,
    merged.temperature ?? 0.3,
    merged.maxIterations ?? 3,
  );
  state.currentText = result.finalText;
  state.metadata.critiqueIterations = result.iterations;
  state.confidence *= result.improvementScore;
  if (result.improved) {
    state.notes.push(`تم التحسين عبر ${result.iterations} دورة نقد ذاتي`);
  }
  void finalPrompt;
}

async function applyConstitutionalStep(
  taskPrompt: string,
  merged: StandardAgentOptions,
  state: PipelineState,
): Promise<void> {
  const result = await performConstitutionalCheck(
    state.currentText,
    taskPrompt,
    "gemini-1.5-flash",
    merged.temperature ?? 0.3,
  );
  state.currentText = result.correctedText;
  state.metadata.constitutionalViolations = result.violations.length;
  if (!result.compliant) {
    state.notes.push(`تصحيح دستوري: ${result.violations.join(", ")}`);
    state.confidence *= 0.9;
  }
}

async function applyUncertaintyStep(
  finalPrompt: string,
  merged: StandardAgentOptions,
  state: PipelineState,
): Promise<void> {
  const metrics = await measureUncertainty(
    state.currentText,
    finalPrompt,
    "gemini-1.5-flash",
    merged.temperature ?? 0.3,
  );
  state.metadata.uncertaintyScore = metrics.score;
  state.confidence = Math.min(state.confidence, metrics.confidence);
  if (metrics.uncertainAspects.length > 0) {
    state.notes.push(`جوانب غير مؤكدة: ${metrics.uncertainAspects.length}`);
  }
}

async function applyHallucinationStep(
  taskPrompt: string,
  state: PipelineState,
): Promise<void> {
  const result = await detectHallucinations(
    state.currentText,
    taskPrompt,
    "gemini-1.5-flash",
  );
  state.metadata.hallucinationDetected = result.detected;
  if (result.detected) {
    state.currentText = result.correctedText;
    const unsupported = result.claims.filter((c) => !c.supported).length;
    state.notes.push(`تصحيح هلوسة: ${unsupported} ادعاء غير مدعوم`);
    state.confidence *= 0.85;
  }
}

// =====================================================
// Helper: Format output for display (text only, no JSON)
// =====================================================

export function formatAgentOutput(
  output: StandardAgentOutput,
  agentName: string,
): string {
  const sections = [
    `=== ${agentName} - التقرير ===`,
    "",
    `الثقة: ${(output.confidence * 100).toFixed(0)}%`,
    "",
    "--- التحليل ---",
    output.text,
    "",
  ];

  if (output.notes.length > 0) {
    sections.push("--- ملاحظات ---");
    output.notes.forEach((note) => sections.push(`• ${note}`));
    sections.push("");
  }

  if (output.metadata) {
    sections.push("--- معلومات إضافية ---");
    if (output.metadata.ragUsed) sections.push("✓ استخدم RAG");
    if ((output.metadata.critiqueIterations ?? 0) > 0) {
      sections.push(`✓ نقد ذاتي: ${output.metadata.critiqueIterations} دورات`);
    }
    if ((output.metadata.constitutionalViolations ?? 0) > 0) {
      sections.push(
        `⚠ انتهاكات دستورية: ${output.metadata.constitutionalViolations}`,
      );
    }
    if (output.metadata.hallucinationDetected) {
      sections.push("⚠ تم اكتشاف وتصحيح هلوسات");
    }
  }

  sections.push("", "=".repeat(50));
  return sections.join("\n");
}
