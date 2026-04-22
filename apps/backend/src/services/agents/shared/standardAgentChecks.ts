/**
 * Standard Agent Quality Checks
 * Constitutional AI, Uncertainty Quantification, and Hallucination Detection
 */

import { geminiService } from "@/services/gemini.service";

// Type for Gemini model IDs
export type ModelId = "gemini-2.0-flash-exp" | "gemini-1.5-flash" | "gemini-1.5-pro" | string;

// Helper function to call Gemini AI with text prompt
async function callGeminiText(
  prompt: string,
  _options?: { temperature?: number; model?: ModelId }
): Promise<string> {
  const response = await geminiService.analyzeText(prompt, "general");
  return response;
}

// =====================================================
// Types
// =====================================================

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
// Constitutional AI
// =====================================================

const CONSTITUTIONAL_RULES = [
  {
    name: "احترام النص الأصلي",
    description: "يجب عدم تحريف أو تغيير المعنى الأساسي للنص الأصلي",
    check: (text: string) => {
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
      const exaggerations = ["دائمًا", "أبدًا", "كل", "لا شيء", "مستحيل", "حتمًا"];
      const lowerText = text.toLowerCase();
      const count = exaggerations.filter((word) => lowerText.includes(word)).length;
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
      const count = subjective.filter((phrase) => lowerText.includes(phrase)).length;
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

export async function performConstitutionalCheck(
  text: string,
  _input: string,
  _model: ModelId,
  temperature: number
): Promise<ConstitutionalCheckResult> {
  const violations: string[] = [];

  for (const rule of CONSTITUTIONAL_RULES) {
    if (!rule.check(text)) {
      violations.push(rule.name);
    }
  }

  if (violations.length === 0) {
    return { compliant: true, violations: [], correctedText: text };
  }

  const correctionPrompt = `النص التالي يحتوي على انتهاكات للمبادئ الدستورية:

الانتهاكات: ${violations.join(", ")}

النص:
${text.substring(0, 2000)}

قم بتصحيح النص مع الحفاظ على المعنى الأساسي ولكن معالجة الانتهاكات المذكورة.`;

  const correctedText = await callGeminiText(correctionPrompt, { temperature });
  return { compliant: false, violations, correctedText };
}

// =====================================================
// Uncertainty Quantification
// =====================================================

export async function measureUncertainty(
  text: string,
  prompt: string,
  _model: ModelId,
  temperature: number
): Promise<UncertaintyMetrics> {
  const alternatives: string[] = [text];

  for (let i = 0; i < 2; i++) {
    const alt = await callGeminiText(prompt, { temperature: temperature + 0.2 });
    alternatives.push(alt);
  }

  const avgLength = alternatives.reduce((sum, t) => sum + t.length, 0) / alternatives.length;
  const lengthVariance =
    alternatives.reduce((sum, t) => sum + Math.pow(t.length - avgLength, 2), 0) / alternatives.length;

  const consistency = 1 - Math.min(lengthVariance / (avgLength * avgLength), 1);
  const uncertaintyScore = 1 - consistency;
  const confidence = Math.max(0.5, consistency);

  const uncertainPhrases = text.match(/ربما|قد يكون|محتمل|من الممكن|غالبًا/gi) || [];

  return { score: uncertaintyScore, confidence, uncertainAspects: uncertainPhrases.slice(0, 3) };
}

// =====================================================
// Hallucination Detection
// =====================================================

/** Extract claims from text */
async function extractClaims(text: string): Promise<string[]> {
  const claimsPrompt = `استخرج الادعاءات الرئيسية من النص التالي، كل ادعاء في سطر:

${text.substring(0, 1500)}

قدم قائمة بالادعاءات فقط، كل ادعاء في سطر منفصل.`;

  const claimsText = await callGeminiText(claimsPrompt, { temperature: 0.1 });
  return claimsText.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0).slice(0, 5);
}

/** Verify a single claim against the original input */
async function verifyClaim(claim: string, input: string): Promise<{ claim: string; supported: boolean }> {
  const checkPrompt = `هل الادعاء التالي مدعوم بالنص الأصلي؟

النص الأصلي:
${input.substring(0, 2000)}

الادعاء:
${claim}

أجب بـ "نعم" أو "لا" فقط.`;

  const result = await callGeminiText(checkPrompt, { temperature: 0.1 });
  return { claim, supported: result.toLowerCase().includes("نعم") };
}

/** Correct text by removing unsupported claims */
async function correctUnsupportedClaims(
  text: string,
  unsupported: Array<{ claim: string }>
): Promise<string> {
  const correctionPrompt = `قم بتصحيح النص التالي بإزالة أو تصحيح الادعاءات غير المدعومة:

النص:
${text.substring(0, 2000)}

الادعاءات غير المدعومة:
${unsupported.map((c) => `- ${c.claim}`).join("\n")}

قدم نسخة محسنة بدون ادعاءات غير مدعومة.`;

  return callGeminiText(correctionPrompt, { temperature: 0.2 });
}

export async function detectHallucinations(
  text: string,
  input: string,
  _model: ModelId
): Promise<HallucinationCheckResult> {
  const claims = await extractClaims(text);
  const checkedClaims = await Promise.all(claims.map((claim) => verifyClaim(claim, input)));
  const unsupported = checkedClaims.filter((c) => !c.supported);
  const detected = unsupported.length > 0;
  const correctedText = detected ? await correctUnsupportedClaims(text, unsupported) : text;
  return { detected, claims: checkedClaims, correctedText };
}

// =====================================================
// Self-Critique
// =====================================================

export interface SelfCritiqueResult {
  improved: boolean;
  iterations: number;
  finalText: string;
  improvementScore: number;
}

function buildCritiquePrompt(text: string): string {
  return `قم بمراجعة النص التالي وحدد نقاط الضعف أو الأخطاء:

النص:
${text.substring(0, 2000)}

قدم نقدًا بناءً يحدد:
1. الأخطاء المنطقية
2. التناقضات
3. النقاط غير الواضحة
4. المبالغات أو الادعاءات غير المدعومة

إذا كان النص جيدًا بما فيه الكفاية، قل "لا يوجد تحسينات ضرورية".`;
}

function critiqueIndicatesGood(critique: string): boolean {
  const lower = critique.toLowerCase();
  return lower.includes("لا يوجد تحسينات") || lower.includes("النص جيد");
}

async function generateImprovedText(
  currentText: string, critique: string, temperature: number
): Promise<string> {
  const prompt = `بناءً على النقد التالي، قم بتحسين النص:

النص الأصلي:
${currentText.substring(0, 2000)}

النقد:
${critique.substring(0, 1000)}

قدم نسخة محسّنة من النص تعالج نقاط الضعف المذكورة.`;

  return callGeminiText(prompt, { temperature });
}

export async function performSelfCritique(
  initialText: string,
  temperature: number,
  maxIterations: number
): Promise<SelfCritiqueResult> {
  let currentText = initialText;
  let iterations = 0;
  let improved = false;

  for (let i = 0; i < maxIterations; i++) {
    iterations++;
    const critique = await callGeminiText(buildCritiquePrompt(currentText), { temperature: 0.2 });
    if (critiqueIndicatesGood(critique)) { improved = i > 0; break; }
    currentText = await generateImprovedText(currentText, critique, temperature);
    improved = true;
  }

  const improvementScore = iterations > 1 ? 0.8 : improved ? 0.5 : 1.0;
  return { improved, iterations, finalText: currentText, improvementScore };
}
