/**
 * Standard Agent Execution Pattern
 *
 * This module provides a unified execution pattern for all drama analyst agents:
 * RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → (Optional) Debate
 *
 * All agents must follow this pattern to ensure:
 * - Consistent quality
 * - Text-only outputs (no JSON to UI)
 * - Proper confidence tracking
 * - Constitutional compliance
 */

import { callGeminiText, toText } from "@/lib/ai/gemini-core";
import type { ModelId } from "@/lib/ai/gemini-core";

// =====================================================
// Types
// =====================================================

export interface StandardAgentInput {
  input: string;
  options?: StandardAgentOptions;
  context?: string | Record<string, any>;
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
    worldQuality?: any;
    processingTime?: number;
    [key: string]: any; // Allow additional metadata properties
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
  claims: Array<{ claim: string; supported: boolean }>;
  correctedText: string;
}

// =====================================================
// Default Options
// =====================================================

const DEFAULT_OPTIONS: StandardAgentOptions = {
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

// =====================================================
// RAG: Retrieval-Augmented Generation
// =====================================================

async function performRAG(
  input: string,
  context?: string
): Promise<RAGContext> {
  if (!context || context.length < 100) {
    return { chunks: [], relevanceScores: [] };
  }

  // Simple chunking strategy
  const chunkSize = 500;
  const overlap = 50;
  const chunks: string[] = [];

  let start = 0;
  while (start < context.length) {
    const end = Math.min(start + chunkSize, context.length);
    chunks.push(context.substring(start, end));
    start = end - overlap;
  }

  // Score chunks by relevance (simple keyword matching)
  const inputKeywords = input
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const relevanceScores = chunks.map((chunk) => {
    const chunkLower = chunk.toLowerCase();
    let score = 0;
    inputKeywords.forEach((keyword) => {
      if (chunkLower.includes(keyword)) score++;
    });
    return score / Math.max(inputKeywords.length, 1);
  });

  // Sort by relevance and take top 3
  const indexed = chunks.map((chunk, i) => ({
    chunk,
    score: relevanceScores[i],
  }));
  indexed.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const topChunks = indexed.slice(0, 3).map((x) => x.chunk);
  const topScores = indexed.slice(0, 3).map((x) => x.score ?? 0);

  return {
    chunks: topChunks,
    relevanceScores: topScores,
  };
}

function buildPromptWithRAG(
  basePrompt: string,
  ragContext: RAGContext
): string {
  if (ragContext.chunks.length === 0) {
    return basePrompt;
  }

  const contextSection = ragContext.chunks
    .map((chunk, i) => `[سياق ${i + 1}]:\n${chunk}`)
    .join("\n\n");

  return `${basePrompt}\n\n=== سياق إضافي من النص ===\n${contextSection}\n\n=== نهاية السياق ===\n`;
}

// =====================================================
// Self-Critique
// =====================================================

async function performSelfCritique(
  initialText: string,
  _prompt: string,
  _model: ModelId,
  temperature: number,
  maxIterations: number
): Promise<SelfCritiqueResult> {
  let currentText = initialText;
  let iterations = 0;
  let improved = false;

  for (let i = 0; i < maxIterations; i++) {
    iterations++;

    // Generate critique
    const critiquePrompt = `قم بمراجعة النص التالي وحدد نقاط الضعف أو الأخطاء:

النص:
${currentText.substring(0, 2000)}

قدم نقدًا بناءً يحدد:
1. الأخطاء المنطقية
2. التناقضات
3. النقاط غير الواضحة
4. المبالغات أو الادعاءات غير المدعومة

إذا كان النص جيدًا بما فيه الكفاية، قل "لا يوجد تحسينات ضرورية".`;

    const critique = await callGeminiText(critiquePrompt, {
      temperature: 0.2,
    });

    // Check if improvement is needed
    if (
      critique.toLowerCase().includes("لا يوجد تحسينات") ||
      critique.toLowerCase().includes("النص جيد")
    ) {
      improved = i > 0;
      break;
    }

    // Generate improved version
    const improvementPrompt = `بناءً على النقد التالي، قم بتحسين النص:

النص الأصلي:
${currentText.substring(0, 2000)}

النقد:
${critique.substring(0, 1000)}

قدم نسخة محسّنة من النص تعالج نقاط الضعف المذكورة.`;

    const improvedText = await callGeminiText(improvementPrompt, {
      temperature,
    });

    currentText = improvedText;
    improved = true;
  }

  // Calculate improvement score
  const improvementScore = iterations > 1 ? 0.8 : improved ? 0.5 : 1.0;

  return {
    improved,
    iterations,
    finalText: currentText,
    improvementScore,
  };
}

// =====================================================
// Constitutional AI
// =====================================================

const CONSTITUTIONAL_RULES = [
  {
    name: "احترام النص الأصلي",
    description: "يجب عدم تحريف أو تغيير المعنى الأساسي للنص الأصلي",
    check: (text: string) => {
      // Simple heuristic: output shouldn't contradict input
      return (
        !text.toLowerCase().includes("على عكس النص") &&
        !text.toLowerCase().includes("خلافًا لما ورد")
      );
    },
  },
  {
    name: "عدم المبالغة",
    description: "تجنب الادعاءات المبالغ فيها أو غير المدعومة",
    check: (text: string) => {
      const exaggerations = [
        "دائمًا",
        "أبدًا",
        "كل",
        "لا شيء",
        "مستحيل",
        "حتمًا",
      ];
      const lowerText = text.toLowerCase();
      const count = exaggerations.filter((word) =>
        lowerText.includes(word)
      ).length;
      return count < 3;
    },
  },
  {
    name: "الوضوح والدقة",
    description: "يجب أن يكون التحليل واضحًا ودقيقًا",
    check: (text: string) => {
      return text.length > 50 && !text.includes("...") && !text.includes("إلخ");
    },
  },
  {
    name: "الموضوعية",
    description: "تجنب الأحكام الشخصية المفرطة",
    check: (text: string) => {
      const subjective = ["أعتقد", "في رأيي", "أظن", "ربما"];
      const lowerText = text.toLowerCase();
      const count = subjective.filter((phrase) =>
        lowerText.includes(phrase)
      ).length;
      return count < 2;
    },
  },
  {
    name: "الاحترام والأدب",
    description: "تجنب اللغة المسيئة أو غير المحترمة",
    check: (text: string) => {
      const offensive = ["سخيف", "غبي", "تافه", "عديم القيمة"];
      const lowerText = text.toLowerCase();
      return !offensive.some((word) => lowerText.includes(word));
    },
  },
];

async function performConstitutionalCheck(
  text: string,
  _input: string,
  _model: ModelId,
  temperature: number
): Promise<ConstitutionalCheckResult> {
  const violations: string[] = [];

  // Check each rule
  for (const rule of CONSTITUTIONAL_RULES) {
    if (!rule.check(text)) {
      violations.push(rule.name);
    }
  }

  if (violations.length === 0) {
    return {
      compliant: true,
      violations: [],
      correctedText: text,
    };
  }

  // Generate corrected version
  const correctionPrompt = `النص التالي يحتوي على انتهاكات للمبادئ الدستورية:

الانتهاكات: ${violations.join(", ")}

النص:
${text.substring(0, 2000)}

قم بتصحيح النص مع الحفاظ على المعنى الأساسي ولكن معالجة الانتهاكات المذكورة.`;

  const correctedText = await callGeminiText(correctionPrompt, {
    temperature,
  });

  return {
    compliant: false,
    violations,
    correctedText,
  };
}

// =====================================================
// Uncertainty Quantification
// =====================================================

async function measureUncertainty(
  text: string,
  prompt: string,
  _model: ModelId,
  temperature: number
): Promise<UncertaintyMetrics> {
  // Generate alternative versions
  const alternatives: string[] = [text];

  for (let i = 0; i < 2; i++) {
    const alt = await callGeminiText(prompt, {
      temperature: temperature + 0.2,
    });
    alternatives.push(alt);
  }

  // Calculate consistency
  const avgLength =
    alternatives.reduce((sum, t) => sum + t.length, 0) / alternatives.length;
  const lengthVariance =
    alternatives.reduce(
      (sum, t) => sum + Math.pow(t.length - avgLength, 2),
      0
    ) / alternatives.length;

  const consistency = 1 - Math.min(lengthVariance / (avgLength * avgLength), 1);
  const uncertaintyScore = 1 - consistency;
  const confidence = Math.max(0.5, consistency);

  // Identify uncertain aspects (simple heuristic)
  const uncertainPhrases =
    text.match(/ربما|قد يكون|محتمل|من الممكن|غالبًا/gi) || [];

  return {
    score: uncertaintyScore,
    confidence,
    uncertainAspects: uncertainPhrases.slice(0, 3),
  };
}

// =====================================================
// Hallucination Detection
// =====================================================

async function detectHallucinations(
  text: string,
  input: string,
  _model: ModelId
): Promise<HallucinationCheckResult> {
  // Extract claims
  const claimsPrompt = `استخرج الادعاءات الرئيسية من النص التالي، كل ادعاء في سطر:

${text.substring(0, 1500)}

قدم قائمة بالادعاءات فقط، كل ادعاء في سطر منفصل.`;

  const claimsText = await callGeminiText(claimsPrompt, {
    temperature: 0.1,
  });

  const claims = claimsText
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0)
    .slice(0, 5);

  // Check each claim against input
  const checkedClaims = await Promise.all(
    claims.map(async (claim: string) => {
      const checkPrompt = `هل الادعاء التالي مدعوم بالنص الأصلي؟

النص الأصلي:
${input.substring(0, 2000)}

الادعاء:
${claim}

أجب بـ "نعم" أو "لا" فقط.`;

      const result = await callGeminiText(checkPrompt, {
        temperature: 0.1,
      });

      return {
        claim,
        supported: result.toLowerCase().includes("نعم"),
      };
    })
  );

  const unsupportedClaims = checkedClaims.filter(
    (c: { claim: string; supported: boolean }) => !c.supported
  );
  const detected = unsupportedClaims.length > 0;

  let correctedText = text;
  if (detected) {
    const correctionPrompt = `قم بتصحيح النص التالي بإزالة أو تصحيح الادعاءات غير المدعومة:

النص:
${text.substring(0, 2000)}

الادعاءات غير المدعومة:
${unsupportedClaims.map((c) => `- ${c.claim}`).join("\n")}

قدم نسخة محسنة بدون ادعاءات غير مدعومة.`;

    correctedText = await callGeminiText(correctionPrompt, {
      temperature: 0.2,
    });
  }

  return {
    detected,
    claims: checkedClaims,
    correctedText,
  };
}

// =====================================================
// Standard Agent Execution
// =====================================================

export async function executeStandardAgentPattern(
  taskPrompt: string,
  options: StandardAgentOptions,
  context?: Record<string, unknown>
): Promise<StandardAgentOutput> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const notes: string[] = [];
  let currentText = "";
  let confidence = 0.7;

  const metadata = {
    ragUsed: false,
    critiqueIterations: 0,
    constitutionalViolations: 0,
    uncertaintyScore: 0,
    hallucinationDetected: false,
    debateRounds: 0,
  };

  try {
    // Step 1: RAG
    let finalPrompt = taskPrompt;
    if (mergedOptions.enableRAG && context?.originalText) {
      const ragContext = await performRAG(
        taskPrompt,
        context.originalText as string
      );
      finalPrompt = buildPromptWithRAG(taskPrompt, ragContext);
      metadata.ragUsed = ragContext.chunks.length > 0;
      if (metadata.ragUsed) {
        notes.push(`استخدم RAG: ${ragContext.chunks.length} أجزاء ذات صلة`);
      }
    }

    // Initial generation
    currentText = await callGeminiText(finalPrompt, {
      temperature: mergedOptions.temperature || 0.3,
    });

    // Step 2: Self-Critique
    if (options.enableSelfCritique) {
      const critiqueResult = await performSelfCritique(
        currentText,
        finalPrompt,
        "gemini-1.5-flash",
        mergedOptions.temperature || 0.3,
        mergedOptions.maxIterations || 3
      );
      currentText = critiqueResult.finalText;
      metadata.critiqueIterations = critiqueResult.iterations;
      confidence *= critiqueResult.improvementScore;
      if (critiqueResult.improved) {
        notes.push(`تم التحسين عبر ${critiqueResult.iterations} دورة نقد ذاتي`);
      }
    }

    // Step 3: Constitutional Check
    if (options.enableConstitutional) {
      const constitutionalResult = await performConstitutionalCheck(
        currentText,
        taskPrompt,
        "gemini-1.5-flash",
        mergedOptions.temperature || 0.3
      );
      currentText = constitutionalResult.correctedText;
      metadata.constitutionalViolations =
        constitutionalResult.violations.length;
      if (!constitutionalResult.compliant) {
        notes.push(
          `تصحيح دستوري: ${constitutionalResult.violations.join(", ")}`
        );
        confidence *= 0.9;
      }
    }

    // Step 4: Uncertainty Quantification
    if (options.enableUncertainty) {
      const uncertaintyMetrics = await measureUncertainty(
        currentText,
        finalPrompt,
        "gemini-1.5-flash",
        mergedOptions.temperature || 0.3
      );
      metadata.uncertaintyScore = uncertaintyMetrics.score;
      confidence = Math.min(confidence, uncertaintyMetrics.confidence);
      if (uncertaintyMetrics.uncertainAspects.length > 0) {
        notes.push(
          `جوانب غير مؤكدة: ${uncertaintyMetrics.uncertainAspects.length}`
        );
      }
    }

    // Step 5: Hallucination Detection
    if (options.enableHallucination) {
      const hallucinationResult = await detectHallucinations(
        currentText,
        taskPrompt,
        "gemini-1.5-flash"
      );
      metadata.hallucinationDetected = hallucinationResult.detected;
      if (hallucinationResult.detected) {
        currentText = hallucinationResult.correctedText;
        const unsupported = hallucinationResult.claims.filter(
          (c) => !c.supported
        ).length;
        notes.push(`تصحيح هلوسة: ${unsupported} ادعاء غير مدعوم`);
        confidence *= 0.85;
      }
    }

    // Step 6: Debate (Optional - if confidence is low)
    if (
      mergedOptions.enableDebate &&
      confidence < (mergedOptions.confidenceThreshold || 0.7)
    ) {
      notes.push("الثقة منخفضة - يُوصى بتفعيل النقاش متعدد الوكلاء");
      // Debate would be handled at orchestration level
    }

    // Final output
    return {
      text: toText(currentText),
      confidence: Math.round(confidence * 100) / 100,
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

// =====================================================
// Helper: Format output for display (text only, no JSON)
// =====================================================

export function formatAgentOutput(
  output: StandardAgentOutput,
  agentName: string
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
        `⚠ انتهاكات دستورية: ${output.metadata.constitutionalViolations}`
      );
    }
    if (output.metadata.hallucinationDetected) {
      sections.push("⚠ تم اكتشاف وتصحيح هلوسات");
    }
  }

  sections.push("");
  sections.push("=".repeat(50));

  return sections.join("\n");
}
