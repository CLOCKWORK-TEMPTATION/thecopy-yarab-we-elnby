/**
 * خدمة قياس عدم اليقين
 * Uncertainty Quantification Service
 *
 * يقيس مستوى الثقة في مخرجات الوكلاء ويحدد متى تحتاج المراجعة البشرية
 */

import { UncertaintyMetrics } from "../core/types";
import { log } from "./loggerService";
import { platformGenAIService } from "./platformGenAIService";

export class UncertaintyService {
  /**
   * قياس عدم اليقين باستخدام Monte Carlo Dropout
   * Measure uncertainty using Monte Carlo Dropout
   *
   * يقوم بتشغيل النموذج عدة مرات ويقيس الاتساق بين المخرجات
   */
  async measureUncertaintyMC(
    prompt: string,
    iterations: number = 5
  ): Promise<UncertaintyMetrics> {
    const outputs: string[] = [];

    // Generate multiple outputs
    log.info(
      "Running uncertainty iterations",
      { iterations },
      "UncertaintyService"
    );
    for (let i = 0; i < iterations; i++) {
      const output = await platformGenAIService.generateText(
        prompt + `\n\n[تكرار ${i + 1}/${iterations}]`
      );
      outputs.push(output);
    }

    // Calculate consistency/variance
    const consistency = this.calculateConsistency(outputs);
    const confidence = consistency;

    // Identify uncertain aspects
    const uncertainAspects = this.identifyUncertainAspects(outputs);

    // Sanitized confidence logging for security
    if (confidence > 0.5) {
      log.info(
        "Uncertainty analysis completed",
        { confidence },
        "UncertaintyService"
      );
    } else {
      log.warn(
        "Uncertainty analysis completed with low confidence",
        { confidence },
        "UncertaintyService"
      );
    }

    return {
      confidence,
      needsReview: confidence < 0.7,
      uncertainAspects,
      method: "monte_carlo",
    };
  }

  /**
   * قياس عدم اليقين باستخدام Ensemble
   * Measure uncertainty using Ensemble methods
   */
  async measureUncertaintyEnsemble(
    prompt: string,
    models: string[] = ["gemini-1.5-pro", "gemini-1.5-pro"]
  ): Promise<UncertaintyMetrics> {
    const outputs: string[] = [];

    // Generate outputs from multiple models/configurations
    // Note: Currently using same model multiple times for ensemble
    for (const {} of models) {
      const output = await platformGenAIService.generateText(prompt);
      outputs.push(output);
    }

    const consistency = this.calculateConsistency(outputs);
    const uncertainAspects = this.identifyUncertainAspects(outputs);

    return {
      confidence: consistency,
      needsReview: consistency < 0.7,
      uncertainAspects,
      method: "ensemble",
    };
  }

  /**
   * حساب الاتساق بين المخرجات
   * Calculate consistency between outputs
   */
  private calculateConsistency(outputs: string[]): number {
    if (outputs.length < 2) return 1.0;

    // Calculate pairwise similarities
    let totalSimilarity = 0;
    let pairs = 0;

    for (let i = 0; i < outputs.length - 1; i++) {
      for (let j = i + 1; j < outputs.length; j++) {
        const output1 = outputs[i];
        const output2 = outputs[j];
        if (output1 && output2) {
          totalSimilarity += this.calculateSimilarity(output1, output2);
          pairs++;
        }
      }
    }

    return pairs > 0 ? totalSimilarity / pairs : 0;
  }

  /**
   * حساب التشابه بين نصين باستخدام Jaccard Similarity
   * Calculate similarity between two texts using Jaccard Similarity
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * تحديد الجوانب غير المؤكدة
   * Identify uncertain aspects
   */
  private identifyUncertainAspects(outputs: string[]): string[] {
    // Find parts where outputs diverge
    const uncertainAspects: string[] = [];

    const allWords = outputs.flatMap((o) => o.split(/\s+/));
    const wordCounts = new Map<string, number>();

    allWords.forEach((word) => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });

    // Words that appear in some but not all outputs might indicate uncertainty
    wordCounts.forEach((count, word) => {
      if (count > 1 && count < outputs.length && word.length > 5) {
        uncertainAspects.push(word);
      }
    });

    return uncertainAspects.slice(0, 5); // Top 5 uncertain aspects
  }

  /**
   * تقييم شامل للثقة
   * Comprehensive confidence assessment
   */
  async assessConfidence(output: string, context: any): Promise<number> {
    const assessmentPrompt = `
قم بتقييم مستوى الثقة في المخرج التالي على مقياس من 0 إلى 1.

المخرج:
"""
${output.substring(0, 2000)}
"""

السياق:
"""
${JSON.stringify(context, null, 2).substring(0, 1000)}
"""

معايير التقييم:
1. الاتساق المنطقي
2. الاستناد إلى المصادر
3. الوضوح والدقة
4. عدم التناقضات
5. الكمال والشمولية

أجب برقم فقط بين 0 و 1 (مثال: 0.85)
`;

    try {
      const result = await platformGenAIService.generateText(assessmentPrompt);
      const confidence = parseFloat(result.trim());
      return isNaN(confidence) ? 0.5 : Math.min(Math.max(confidence, 0), 1);
    } catch (error) {
      log.error("Error assessing confidence", error, "UncertaintyService");
      return 0.5; // Default to medium confidence on error
    }
  }
}

// Export singleton instance
export const uncertaintyService = new UncertaintyService();
