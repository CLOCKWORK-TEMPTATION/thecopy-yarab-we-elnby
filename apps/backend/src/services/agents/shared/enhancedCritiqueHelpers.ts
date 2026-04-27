/**
 * Enhanced Critique Helper Functions
 * دوال مساعدة لتقييم الأبعاد والنتائج
 */

import { logger } from "@/lib/logger";

import type { CritiqueConfiguration, DimensionScore, EnhancedCritiqueResult , CritiqueDimension } from "./critiqueTypes";


/** حساب النتيجة الإجمالية من درجات الأبعاد */
export function calculateOverallScore(
  dimensionScores: DimensionScore[],
  dimensions: CritiqueDimension[]
): number {
  let totalScore = 0;
  let totalWeight = 0;

  dimensionScores.forEach((score, index) => {
    const weight = dimensions[index]?.weight ?? 1;
    totalScore += score.score * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? totalScore / totalWeight : 0.5;
}

/** تحديد المستوى بناءً على النتيجة */
export function determineLevel(
  score: number,
  thresholds: CritiqueConfiguration["thresholds"]
): EnhancedCritiqueResult["overallLevel"] {
  if (score >= thresholds.excellent) return "excellent";
  if (score >= thresholds.good) return "good";
  if (score >= thresholds.satisfactory) return "satisfactory";
  if (score >= thresholds.needsImprovement) return "needs_improvement";
  return "poor";
}

// نوع داخلي يصف الشكل المتوقع من رد LLM لتقييم البُعد قبل التحقق منه
interface RawDimensionPayload {
  score?: number;
  level?: DimensionScore["level"];
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
}

// type guard يتحقق أن قيمة `unknown` تطابق RawDimensionPayload
function isRawDimensionPayload(value: unknown): value is RawDimensionPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  if (v["score"] !== undefined && typeof v["score"] !== "number") return false;
  if (v["level"] !== undefined && typeof v["level"] !== "string") return false;
  if (v["strengths"] !== undefined && !Array.isArray(v["strengths"])) return false;
  if (v["weaknesses"] !== undefined && !Array.isArray(v["weaknesses"])) return false;
  if (v["suggestions"] !== undefined && !Array.isArray(v["suggestions"])) return false;
  return true;
}

// يضمن أن المصفوفة تحتوي سلاسل فقط
function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/** تحليل استجابة تقييم البُعد من JSON */
export function parseDimensionResponse(
  response: string,
  dimension: CritiqueDimension
): DimensionScore {
  try {
    const jsonMatch = /```json\s*([\s\S]*?)\s*```/.exec(response);
    if (jsonMatch?.[1]) {
      const parsed: unknown = JSON.parse(jsonMatch[1]);
      if (isRawDimensionPayload(parsed)) {
        const rawScore = parsed.score ?? 0.5;
        const validLevels: DimensionScore["level"][] = [
          "excellent",
          "good",
          "satisfactory",
          "needs_improvement",
          "poor",
        ];
        const level: DimensionScore["level"] =
          parsed.level && validLevels.includes(parsed.level)
            ? parsed.level
            : "satisfactory";
        return {
          dimension: dimension.name,
          score: Math.max(0, Math.min(1, rawScore)),
          level,
          strengths: asStringArray(parsed.strengths),
          weaknesses: asStringArray(parsed.weaknesses),
          suggestions: asStringArray(parsed.suggestions),
        };
      }
      logger.warn("[Enhanced Critique] JSON payload did not match expected shape, using fallback");
    }
  } catch {
    logger.warn("[Enhanced Critique] Failed to parse JSON response, using fallback");
  }

  return fallbackDimensionParse(response, dimension);
}

/** تحليل احتياطي للبُعد */
export function fallbackDimensionParse(
  response: string,
  dimension: CritiqueDimension
): DimensionScore {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  if (response.includes("قوة") || response.includes("ممتاز")) {
    strengths.push("تحليل جيد في هذا البُعد");
  }
  if (response.includes("ضعف") || response.includes("يحتاج")) {
    weaknesses.push("هناك مجال للتحسين");
    suggestions.push("يمكن تعميق التحليل");
  }

  return {
    dimension: dimension.name,
    score: 0.6,
    level: "satisfactory",
    strengths,
    weaknesses,
    suggestions
  };
}

/** توليد ملاحظات النقد */
export function generateCritiqueNotes(
  dimensionScores: DimensionScore[],
  overallScore: number,
  config: CritiqueConfiguration
): string[] {
  const notes: string[] = [];

  const weakDimensions = dimensionScores.filter((d) => d.score < config.thresholds.good);
  if (weakDimensions.length > 0) {
    notes.push(`الأبعاد التي تحتاج تحسين: ${weakDimensions.map((d) => d.dimension).join("، ")}`);
  }

  const strongDimensions = dimensionScores.filter((d) => d.score >= config.thresholds.good);
  if (strongDimensions.length > 0) {
    notes.push(`الأبعاد القوية: ${strongDimensions.map((d) => d.dimension).join("، ")}`);
  }

  if (overallScore >= config.thresholds.excellent) {
    notes.push("تحليل ممتاز يجمع بين الدقة والعمق");
  } else if (overallScore >= config.thresholds.good) {
    notes.push("تحليل جيد مع مجالات محدودة للتحسين");
  } else if (overallScore >= config.thresholds.satisfactory) {
    notes.push("تحليل مقبول يحتاج لتعميق في بعض الجوانب");
  } else {
    notes.push("التحليل يحتاج لمراجعة وتحسين شامل");
  }

  return notes;
}

/** توليد خطة التحسين */
export function generateImprovementPlan(
  dimensionScores: DimensionScore[],
  config: CritiqueConfiguration
): EnhancedCritiqueResult["improvementPlan"] {
  const plan: NonNullable<EnhancedCritiqueResult["improvementPlan"]> = [];
  const sortedByScore = [...dimensionScores].sort((a, b) => a.score - b.score);

  for (const dimension of sortedByScore.slice(0, 3)) {
    if (dimension.score < config.thresholds.good) {
      const priority = dimension.score < config.thresholds.needsImprovement
        ? ("high" as const)
        : ("medium" as const);

      plan.push({
        priority,
        actions: dimension.suggestions.slice(0, 3),
        expectedImpact: `تحسين بُعد "${dimension.dimension}" سيرفع من جودة التحليل بشكل ملحوظ`
      });
    }
  }

  return plan.length > 0 ? plan : undefined;
}

/** بناء prompt تقييم البُعد */
export function buildDimensionEvaluationPrompt(
  output: string,
  task: string,
  originalText: string,
  dimension: CritiqueDimension
): string {
  const rubricText = dimension.rubric
    .map((level) => `\n**${level.level}** (${level.score}): ${level.description}\nالمؤشرات: ${level.indicators.join("، ")}`)
    .join("\n");

  return `أنت ناقد متخصص في تحليل المحتوى الدرامي.

**المهمة:**
${task}

**النص الأصلي:**
${originalText.substring(0, 2000)}

**التحليل المطلوب نقدُه:**
${output}

**البعد المطلوب تقييمه:** ${dimension.name}
${dimension.description}

**معايير التقييم:**
${rubricText}

**مطلوب منك:**
1. حدد المستوى الأنسب للتحليل في هذا البُعد
2. أعطِ نتيجة رقمية بين 0 و 1
3. سرد 2-3 نقاط قوة (إن وجدت)
4. سرد 2-3 نقاط ضعف (إن وجدت)
5. اقترح 2-3 تحسينات محددة

قدم التقييم بصيغة JSON:
\`\`\`json
{
  "level": "excellent|good|satisfactory|needs_improvement|poor",
  "score": 0.85,
  "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
  "weaknesses": ["نقطة ضعف 1", "نقطة ضعف 2"],
  "suggestions": ["تحسين 1", "تحسين 2"]
}
\`\`\``;
}
