/**
 * Quality check functions for Standard Agent Pattern:
 * Self-Critique, Constitutional AI, Uncertainty Quantification, Hallucination Detection
 */

import { callGeminiText } from "@/lib/ai/gemini-core";

import { CONSTITUTIONAL_RULES } from "./constitutionalRules";

import type {
  ModelId,
  SelfCritiqueResult,
  ConstitutionalCheckResult,
  UncertaintyMetrics,
  HallucinationCheckResult,
} from "./standardAgentPattern.types";

// =====================================================
// Self-Critique
// =====================================================

export async function performSelfCritique(
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

    const critiquePrompt = `قم بمراجعة النص التالي وحدد نقاط الضعف أو الأخطاء:

النص:
${currentText.substring(0, 2000)}

قدم نقدًا بناءً يحدد:
1. الأخطاء المنطقية
2. التناقضات
3. النقاط غير الواضحة
4. المبالغات أو الادعاءات غير المدعومة

إذا كان النص جيدًا بما فيه الكفاية، قل "لا يوجد تحسينات ضرورية".`;

    const critique = await callGeminiText(critiquePrompt, { temperature: 0.2 });

    if (
      critique.toLowerCase().includes("لا يوجد تحسينات") ||
      critique.toLowerCase().includes("النص جيد")
    ) {
      improved = i > 0;
      break;
    }

    const improvementPrompt = `بناءً على النقد التالي، قم بتحسين النص:

النص الأصلي:
${currentText.substring(0, 2000)}

النقد:
${critique.substring(0, 1000)}

قدم نسخة محسّنة من النص تعالج نقاط الضعف المذكورة.`;

    currentText = await callGeminiText(improvementPrompt, { temperature });
    improved = true;
  }

  return {
    improved,
    iterations,
    finalText: currentText,
    improvementScore: iterations > 1 ? 0.8 : improved ? 0.5 : 1.0,
  };
}

// =====================================================
// Constitutional AI
// =====================================================

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
    const alt = await callGeminiText(prompt, {
      temperature: temperature + 0.2,
    });
    alternatives.push(alt);
  }

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

  const uncertainPhrases =
    text.match(/ربما|قد يكون|محتمل|من الممكن|غالبًا/gi) ?? [];

  return {
    score: uncertaintyScore,
    confidence,
    uncertainAspects: uncertainPhrases.slice(0, 3),
  };
}

// =====================================================
// Hallucination Detection
// =====================================================

export async function detectHallucinations(
  text: string,
  input: string,
  _model: ModelId
): Promise<HallucinationCheckResult> {
  const claimsPrompt = `استخرج الادعاءات الرئيسية من النص التالي، كل ادعاء في سطر:

${text.substring(0, 1500)}

قدم قائمة بالادعاءات فقط، كل ادعاء في سطر منفصل.`;

  const claimsText = await callGeminiText(claimsPrompt, { temperature: 0.1 });

  const claims = claimsText
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0)
    .slice(0, 5);

  const checkedClaims = await Promise.all(
    claims.map(async (claim: string) => {
      const checkPrompt = `هل الادعاء التالي مدعوم بالنص الأصلي؟

النص الأصلي:
${input.substring(0, 2000)}

الادعاء:
${claim}

أجب بـ "نعم" أو "لا" فقط.`;

      const result = await callGeminiText(checkPrompt, { temperature: 0.1 });
      return { claim, supported: result.toLowerCase().includes("نعم") };
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

  return { detected, claims: checkedClaims, correctedText };
}
