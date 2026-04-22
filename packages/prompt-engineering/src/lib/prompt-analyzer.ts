// lib/prompt-analyzer.ts
// Prompt analysis and enhancement utilities for Arabic Prompt Engineering Studio

import type {
  PromptAnalysis,
  PromptMetrics,
  PromptCategory,
  PromptEnhancementOptions,
} from "../types";
import { estimateTokenCount } from "./gemini-service";

/**
 * Analyze a prompt and return detailed metrics
 */
export function analyzePrompt(prompt: string): PromptAnalysis {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error("Prompt cannot be empty");
  }

  const metrics = calculatePromptMetrics(prompt);
  const category = detectPromptCategory(prompt);
  const language = detectLanguage(prompt);
  const complexity = calculateComplexity(prompt, metrics);

  const strengths = identifyStrengths(prompt, metrics);
  const weaknesses = identifyWeaknesses(prompt, metrics);
  const suggestions = generateSuggestions(prompt, metrics, weaknesses);

  return {
    prompt,
    metrics,
    strengths,
    weaknesses,
    suggestions,
    estimatedTokens: estimateTokenCount(prompt),
    complexity,
    category,
    language,
  };
}

/**
 * Calculate prompt quality metrics
 */
function calculatePromptMetrics(prompt: string): PromptMetrics {
  const words = prompt.trim().split(/\s+/).length;
  const sentences = prompt.split(/[.!?؟]\s+/).filter((s) => s.trim()).length;

  // Clarity: Based on sentence length, structure, and clarity indicators
  const avgWordsPerSentence = words / Math.max(sentences, 1);
  const clarity =
    avgWordsPerSentence > 5 && avgWordsPerSentence < 25
      ? 80
      : avgWordsPerSentence > 25
        ? 60
        : 50;

  // Specificity: Check for specific details, numbers, examples
  const hasNumbers = /\d+/.test(prompt);
  const hasExamples = /مثال|example|مثل|for example/i.test(prompt);
  const hasSpecificDetails = /الذي|التي|where|when|what|who|which/i.test(
    prompt
  );
  const specificity =
    (hasNumbers ? 20 : 0) +
    (hasExamples ? 30 : 0) +
    (hasSpecificDetails ? 50 : 0);

  // Completeness: Check for clear instructions and context
  const hasInstructions = /اكتب|حلل|اشرح|translate|analyze|write/i.test(prompt);
  const hasContext = prompt.length > 100;
  const hasOutputFormat = /التنسيق|format|output|المخرجات/i.test(prompt);
  const completeness =
    (hasInstructions ? 40 : 0) +
    (hasContext ? 30 : 0) +
    (hasOutputFormat ? 30 : 0);

  // Effectiveness: Combination of other metrics
  const effectiveness = clarity * 0.3 + specificity * 0.3 + completeness * 0.4;

  // Token efficiency: Optimal token usage
  const tokenCount = estimateTokenCount(prompt);
  const tokenEfficiency =
    tokenCount > 0 && tokenCount < 2000
      ? 90
      : tokenCount < 4000
        ? 70
        : tokenCount < 8000
          ? 50
          : 30;

  const overallScore =
    clarity * 0.25 +
    specificity * 0.25 +
    completeness * 0.25 +
    effectiveness * 0.15 +
    tokenEfficiency * 0.1;

  return {
    clarity: Math.round(clarity),
    specificity: Math.round(specificity),
    completeness: Math.round(completeness),
    effectiveness: Math.round(effectiveness),
    tokenEfficiency: Math.round(tokenEfficiency),
    overallScore: Math.round(overallScore),
  };
}

/**
 * Detect prompt category
 */
function detectPromptCategory(prompt: string): PromptCategory {
  const lowerPrompt = prompt.toLowerCase();

  if (
    /كتابة|كتابة إبداعية|creative writing|story|قصة|شعر|poem/i.test(lowerPrompt)
  ) {
    return "creative_writing";
  }
  if (/تحليل|analyze|analysis|نقد|review/i.test(lowerPrompt)) {
    return "analysis";
  }
  if (/ترجمة|translate|translation/i.test(lowerPrompt)) {
    return "translation";
  }
  if (/تلخيص|summarize|summary|ملخص/i.test(lowerPrompt)) {
    return "summarization";
  }
  if (/سؤال|question|answer|إجابة/i.test(lowerPrompt)) {
    return "question_answering";
  }
  if (/كود|code|برمجة|programming/i.test(lowerPrompt)) {
    return "code_generation";
  }
  if (/استخراج|extract|data|بيانات/i.test(lowerPrompt)) {
    return "data_extraction";
  }
  if (/محادثة|conversation|chat|دردشة/i.test(lowerPrompt)) {
    return "conversation";
  }

  return "other";
}

/**
 * Detect language of prompt
 */
function detectLanguage(prompt: string): "ar" | "en" | "mixed" {
  const arabicChars = (prompt.match(/[\u0600-\u06FF]/g) || []).length;
  const englishChars = (prompt.match(/[a-zA-Z]/g) || []).length;
  const totalChars = arabicChars + englishChars;

  if (totalChars === 0) return "ar"; // Default to Arabic

  const arabicRatio = arabicChars / totalChars;

  if (arabicRatio > 0.7) return "ar";
  if (arabicRatio < 0.3) return "en";
  return "mixed";
}

/**
 * Calculate prompt complexity
 */
function calculateComplexity(
  prompt: string,
  metrics: PromptMetrics
): "low" | "medium" | "high" {
  const tokenCount = estimateTokenCount(prompt);
  const score = metrics.overallScore;

  if (tokenCount < 500 && score > 70) return "low";
  if (tokenCount > 2000 || score < 50) return "high";
  return "medium";
}

/**
 * Identify prompt strengths
 */
function identifyStrengths(prompt: string, metrics: PromptMetrics): string[] {
  const strengths: string[] = [];

  if (metrics.clarity >= 75) {
    strengths.push("وضوح عالي في الصياغة");
  }
  if (metrics.specificity >= 70) {
    strengths.push("تفاصيل محددة ومفيدة");
  }
  if (metrics.completeness >= 75) {
    strengths.push("تعليمات شاملة ومكتملة");
  }
  if (metrics.tokenEfficiency >= 80) {
    strengths.push("استخدام فعال للـ tokens");
  }
  if (prompt.length > 100 && prompt.length < 2000) {
    strengths.push("طول مناسب للـ prompt");
  }
  if (/مثال|example|مثل/i.test(prompt)) {
    strengths.push("يحتوي على أمثلة توضيحية");
  }

  return strengths;
}

/**
 * Identify prompt weaknesses
 */
function identifyWeaknesses(prompt: string, metrics: PromptMetrics): string[] {
  const weaknesses: string[] = [];

  if (metrics.clarity < 60) {
    weaknesses.push("الوضوح يحتاج تحسين");
  }
  if (metrics.specificity < 50) {
    weaknesses.push("نقص في التفاصيل المحددة");
  }
  if (metrics.completeness < 60) {
    weaknesses.push("التعليمات غير مكتملة");
  }
  if (metrics.tokenEfficiency < 60) {
    weaknesses.push("استخدام غير فعال للـ tokens");
  }
  if (prompt.length < 50) {
    weaknesses.push("الـ prompt قصير جداً");
  }
  if (prompt.length > 5000) {
    weaknesses.push("الـ prompt طويل جداً");
  }
  if (!/اكتب|حلل|اشرح|translate|analyze|write|create/i.test(prompt)) {
    weaknesses.push("لا يحتوي على فعل إجراء واضح");
  }

  return weaknesses;
}

/**
 * Generate improvement suggestions
 */
function generateSuggestions(
  prompt: string,
  metrics: PromptMetrics,
  weaknesses: string[]
): string[] {
  const suggestions: string[] = [];

  if (metrics.clarity < 70) {
    suggestions.push("حسّن الوضوح باستخدام جمل أقصر وأبسط");
  }
  if (metrics.specificity < 60) {
    suggestions.push("أضف تفاصيل محددة ومقاييس قابلة للقياس");
  }
  if (metrics.completeness < 70) {
    suggestions.push("أضف تعليمات واضحة عن المخرجات المطلوبة");
  }
  if (metrics.tokenEfficiency < 70) {
    suggestions.push("قلل من الكلمات غير الضرورية لتحسين الكفاءة");
  }
  if (!/مثال|example/i.test(prompt)) {
    suggestions.push("فكر في إضافة مثال توضيحي");
  }
  if (!/التنسيق|format|output format/i.test(prompt)) {
    suggestions.push("حدد تنسيق المخرجات المطلوبة");
  }

  // Add specific suggestions based on weaknesses
  if (weaknesses.includes("الـ prompt قصير جداً")) {
    suggestions.push("وسّع الـ prompt بإضافة المزيد من السياق");
  }
  if (weaknesses.includes("الـ prompt طويل جداً")) {
    suggestions.push("قلل من طول الـ prompt مع الحفاظ على المعلومات الأساسية");
  }

  return suggestions;
}

/**
 * Compare two prompts
 */
export function comparePrompts(
  prompt1: string,
  prompt2: string
): {
  prompt1: PromptAnalysis;
  prompt2: PromptAnalysis;
  winner: 1 | 2 | "tie";
  differences: string[];
} {
  const analysis1 = analyzePrompt(prompt1);
  const analysis2 = analyzePrompt(prompt2);

  const differences: string[] = [];
  let winner: 1 | 2 | "tie" = "tie";

  if (analysis1.metrics.overallScore > analysis2.metrics.overallScore) {
    winner = 1;
    differences.push(
      `الـ prompt الأول أفضل بشكل عام (${analysis1.metrics.overallScore} مقابل ${analysis2.metrics.overallScore})`
    );
  } else if (analysis2.metrics.overallScore > analysis1.metrics.overallScore) {
    winner = 2;
    differences.push(
      `الـ prompt الثاني أفضل بشكل عام (${analysis2.metrics.overallScore} مقابل ${analysis1.metrics.overallScore})`
    );
  }

  if (analysis1.metrics.clarity !== analysis2.metrics.clarity) {
    differences.push(
      `الوضوح: ${analysis1.metrics.clarity} مقابل ${analysis2.metrics.clarity}`
    );
  }

  if (analysis1.metrics.specificity !== analysis2.metrics.specificity) {
    differences.push(
      `التحديد: ${analysis1.metrics.specificity} مقابل ${analysis2.metrics.specificity}`
    );
  }

  if (analysis1.estimatedTokens !== analysis2.estimatedTokens) {
    const diff = analysis1.estimatedTokens - analysis2.estimatedTokens;
    differences.push(`عدد الـ tokens: ${diff > 0 ? "+" : ""}${diff} tokens`);
  }

  return {
    prompt1: analysis1,
    prompt2: analysis2,
    winner,
    differences,
  };
}

/**
 * Generate enhancement suggestions (placeholder for AI-based enhancement)
 * In a real implementation, this would call Gemini API
 */
export function generateEnhancementSuggestions(
  prompt: string,
  options: PromptEnhancementOptions = {}
): string[] {
  const analysis = analyzePrompt(prompt);
  const suggestions: string[] = [];

  // Add basic suggestions based on analysis
  suggestions.push(...analysis.suggestions);

  // Add language-specific suggestions
  if (options.targetLanguage && analysis.language !== options.targetLanguage) {
    suggestions.push(
      `فكر في تحسين الـ prompt للغة ${options.targetLanguage === "ar" ? "العربية" : "الإنجليزية"}`
    );
  }

  // Add context suggestions
  if (options.addContext) {
    suggestions.push("أضف المزيد من السياق لتوضيح الهدف من الـ prompt");
  }

  // Add examples suggestions
  if (options.addExamples) {
    suggestions.push("أضف أمثلة توضيحية لتحسين الفهم");
  }

  // Add clarity suggestions
  if (options.improveClarity) {
    suggestions.push("استخدم جمل أقصر وأبسط لتحسين الوضوح");
  }

  // Add token optimization suggestions
  if (options.optimizeTokens) {
    suggestions.push("احذف الكلمات غير الضرورية لتحسين كفاءة الـ tokens");
  }

  return suggestions;
}
