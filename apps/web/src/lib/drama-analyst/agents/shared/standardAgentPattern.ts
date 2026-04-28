/**
 * Standard Agent Execution Pattern
 *
 * Unified execution pattern: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → (Optional) Debate
 */

import { callGeminiText, toText } from "@/lib/ai/gemini-core";

import {
  detectHallucinations,
  measureUncertainty,
  performConstitutionalCheck,
  performSelfCritique,
} from "./standardAgentPattern.quality";
import { buildPromptWithRAG, performRAG } from "./standardAgentPattern.rag";
import {
  DEFAULT_OPTIONS,
  type ExecutionMetadata,
  type ExecutionState,
  type NormalizedExecutionArgs,
  type StandardAgentInput,
  type StandardAgentOptions,
  type StandardAgentOutput,
} from "./standardAgentPattern.types";

export { formatAgentOutput } from "./standardAgentFormat";

export type {
  ConstitutionalCheckResult,
  HallucinationCheckResult,
  RAGContext,
  SelfCritiqueResult,
  StandardAgentInput,
  StandardAgentOptions,
  StandardAgentOutput,
  UncertaintyMetrics,
} from "./standardAgentPattern.types";

// =====================================================
// Execution Helpers
// =====================================================

function createExecutionMetadata(): ExecutionMetadata {
  return {
    ragUsed: false,
    critiqueIterations: 0,
    constitutionalViolations: 0,
    uncertaintyScore: 0,
    hallucinationDetected: false,
    debateRounds: 0,
  };
}

function createPromptWithOptionalRag(
  taskPrompt: string,
  context: Record<string, unknown> | undefined,
  options: StandardAgentOptions,
  metadata: ExecutionMetadata,
  notes: string[]
): string {
  const originalText = context?.["originalText"];
  if (!options.enableRAG || typeof originalText !== "string") return taskPrompt;

  const ragContext = performRAG(taskPrompt, originalText);
  metadata.ragUsed = ragContext.chunks.length > 0;
  if (metadata.ragUsed) {
    notes.push(`استخدم RAG: ${ragContext.chunks.length} أجزاء ذات صلة`);
  }
  return buildPromptWithRAG(taskPrompt, ragContext);
}

async function applySelfCritiqueStep(
  state: ExecutionState,
  finalPrompt: string,
  options: StandardAgentOptions,
  metadata: ExecutionMetadata,
  notes: string[]
): Promise<ExecutionState> {
  if (!options.enableSelfCritique) return state;

  const critiqueResult = await performSelfCritique(
    state.currentText,
    finalPrompt,
    "gemini-1.5-flash",
    options.temperature ?? 0.3,
    options.maxIterations ?? 3
  );

  metadata.critiqueIterations = critiqueResult.iterations;
  if (critiqueResult.improved) {
    notes.push(`تم التحسين عبر ${critiqueResult.iterations} دورة نقد ذاتي`);
  }

  return {
    currentText: critiqueResult.finalText,
    confidence: state.confidence * critiqueResult.improvementScore,
  };
}

async function applyConstitutionalStep(
  state: ExecutionState,
  taskPrompt: string,
  options: StandardAgentOptions,
  metadata: ExecutionMetadata,
  notes: string[]
): Promise<ExecutionState> {
  if (!options.enableConstitutional) return state;

  const constitutionalResult = await performConstitutionalCheck(
    state.currentText,
    taskPrompt,
    "gemini-1.5-flash",
    options.temperature ?? 0.3
  );

  metadata.constitutionalViolations = constitutionalResult.violations.length;
  if (!constitutionalResult.compliant) {
    notes.push(`تصحيح دستوري: ${constitutionalResult.violations.join(", ")}`);
  }

  return {
    currentText: constitutionalResult.correctedText,
    confidence: constitutionalResult.compliant
      ? state.confidence
      : state.confidence * 0.9,
  };
}

async function applyUncertaintyStep(
  state: ExecutionState,
  finalPrompt: string,
  options: StandardAgentOptions,
  metadata: ExecutionMetadata,
  notes: string[]
): Promise<ExecutionState> {
  if (!options.enableUncertainty) return state;

  const uncertaintyMetrics = await measureUncertainty(
    state.currentText,
    finalPrompt,
    "gemini-1.5-flash",
    options.temperature ?? 0.3
  );

  metadata.uncertaintyScore = uncertaintyMetrics.score;
  if (uncertaintyMetrics.uncertainAspects.length > 0) {
    notes.push(
      `جوانب غير مؤكدة: ${uncertaintyMetrics.uncertainAspects.length}`
    );
  }

  return {
    currentText: state.currentText,
    confidence: Math.min(state.confidence, uncertaintyMetrics.confidence),
  };
}

async function applyHallucinationStep(
  state: ExecutionState,
  taskPrompt: string,
  options: StandardAgentOptions,
  metadata: ExecutionMetadata,
  notes: string[]
): Promise<ExecutionState> {
  if (!options.enableHallucination) return state;

  const hallucinationResult = await detectHallucinations(
    state.currentText,
    taskPrompt,
    "gemini-1.5-flash"
  );

  metadata.hallucinationDetected = hallucinationResult.detected;
  if (!hallucinationResult.detected) return state;

  const unsupported = hallucinationResult.claims.filter(
    (claim) => !claim.supported
  ).length;
  notes.push("تصحيح هلوسة");
  notes.push(`${unsupported} ادعاء غير مدعوم`);

  return {
    currentText: hallucinationResult.correctedText,
    confidence: state.confidence * 0.85,
  };
}

function addDebateNoteIfNeeded(
  confidence: number,
  options: StandardAgentOptions,
  notes: string[]
): void {
  if (
    options.enableDebate &&
    confidence < (options.confidenceThreshold ?? 0.7)
  ) {
    notes.push("الثقة منخفضة - يُوصى بتفعيل النقاش متعدد الوكلاء");
  }
}

function normalizeContext(
  context: StandardAgentInput["context"]
): Record<string, unknown> | undefined {
  if (typeof context === "string") return { originalText: context };
  if (context && typeof context === "object" && !Array.isArray(context))
    return context;
  return undefined;
}

function normalizeExecutionArgs(
  taskPromptOrAgentName: string,
  optionsOrPrompt: StandardAgentOptions | string,
  contextOrInput?: Record<string, unknown> | StandardAgentInput
): NormalizedExecutionArgs {
  if (typeof optionsOrPrompt !== "string") {
    const normalized: NormalizedExecutionArgs = {
      taskPrompt: taskPromptOrAgentName,
      options: optionsOrPrompt,
    };
    if (contextOrInput !== undefined) {
      normalized.context = contextOrInput as Record<string, unknown>;
    }
    return normalized;
  }

  const input = contextOrInput as StandardAgentInput | undefined;
  const context = normalizeContext(input?.context);
  return {
    taskPrompt: `${optionsOrPrompt}\n\n${input?.input ?? ""}`.trim(),
    options: input?.options ?? {},
    context: { ...(context ?? {}), agentName: taskPromptOrAgentName },
  };
}

// =====================================================
// Main Execution Function
// =====================================================

export async function executeStandardAgentPattern(
  taskPrompt: string,
  options: StandardAgentOptions,
  context?: Record<string, unknown>
): Promise<StandardAgentOutput>;
export async function executeStandardAgentPattern(
  agentName: string,
  prompt: string,
  input?: StandardAgentInput,
  model?: string
): Promise<StandardAgentOutput>;
export async function executeStandardAgentPattern(
  taskPromptOrAgentName: string,
  optionsOrPrompt: StandardAgentOptions | string,
  contextOrInput?: Record<string, unknown> | StandardAgentInput,
  _model?: string
): Promise<StandardAgentOutput> {
  const { taskPrompt, options, context } = normalizeExecutionArgs(
    taskPromptOrAgentName,
    optionsOrPrompt,
    contextOrInput
  );
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const notes: string[] = [];
  const metadata = createExecutionMetadata();

  try {
    const finalPrompt = createPromptWithOptionalRag(
      taskPrompt,
      context,
      mergedOptions,
      metadata,
      notes
    );

    const generatedText = await callGeminiText(finalPrompt, {
      temperature: mergedOptions.temperature ?? 0.3,
    });

    let state: ExecutionState = { currentText: generatedText, confidence: 0.7 };
    state = await applySelfCritiqueStep(
      state,
      finalPrompt,
      mergedOptions,
      metadata,
      notes
    );
    state = await applyConstitutionalStep(
      state,
      taskPrompt,
      mergedOptions,
      metadata,
      notes
    );
    state = await applyUncertaintyStep(
      state,
      finalPrompt,
      mergedOptions,
      metadata,
      notes
    );
    state = await applyHallucinationStep(
      state,
      taskPrompt,
      mergedOptions,
      metadata,
      notes
    );
    addDebateNoteIfNeeded(state.confidence, mergedOptions, notes);

    return {
      text: toText(state.currentText),
      confidence: Math.round(state.confidence * 100) / 100,
      notes,
      metadata,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "خطأ غير معروف";
    return {
      text: `حدث خطأ في التنفيذ: ${errorMsg}`,
      confidence: 0,
      notes: [`خطأ: ${errorMsg}`],
      metadata,
    };
  }
}
