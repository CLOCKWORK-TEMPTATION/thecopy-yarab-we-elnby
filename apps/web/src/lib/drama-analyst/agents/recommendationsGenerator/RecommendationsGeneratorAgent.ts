import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { RECOMMENDATIONS_GENERATOR_AGENT_CONFIG } from "./agent";
import { RECOMMENDATIONS_GENERATOR_INSTRUCTIONS } from "./instructions";

/**
 * Recommendations Generator Agent - وكيل مولد التوصيات والتحسينات
 * الوحدة 11 - مُركب الحكمة الإبداعية
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON
 */
export class RecommendationsGeneratorAgent extends BaseAgent {
  constructor() {
    super(
      "WisdomSynthesizer AI",
      TaskType.RECOMMENDATIONS_GENERATOR,
      RECOMMENDATIONS_GENERATOR_AGENT_CONFIG.systemPrompt ?? ""
    );

    // Set agent-specific confidence floor
    this.confidenceFloor = 0.87;
  }

  /**
   * Build prompt for recommendations generation
   */
  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;

    // Extract relevant context
    const contextObj =
      typeof context === "object" && context !== null ? context : {};
    const originalText = (contextObj?.["originalText"] as string) || "";
    const analysisResults =
      (contextObj?.["analysisResults"] as Record<string, string>) || {};
    const previousStations =
      (contextObj?.["previousStations"] as Record<string, string>) || {};
    const focusAreas = (contextObj?.["focusAreas"] as string[]) || [];
    const priorityLevel =
      (contextObj?.["priorityLevel"] as string) || "balanced";

    // Build structured prompt
    let prompt = `${RECOMMENDATIONS_GENERATOR_INSTRUCTIONS}\n\n`;
    prompt += `[مهمة مولد التوصيات والتحسينات - WisdomSynthesizer AI]\n\n`;

    // Add original text
    if (originalText) {
      prompt += `النص الأصلي:\n${originalText}\n\n`;
    }

    // Add analysis results from previous stations
    if (Object.keys(analysisResults).length > 0) {
      prompt += `نتائج التحليلات السابقة:\n`;
      for (const [analysisType, result] of Object.entries(analysisResults)) {
        if (result) {
          prompt += `\n--- ${analysisType} ---\n${String(result).substring(0, 500)}...\n`;
        }
      }
      prompt += "\n";
    }

    // Add previous stations context
    if (Object.keys(previousStations).length > 0) {
      prompt += `سياق المحطات السابقة:\n`;
      for (const [station, analysis] of Object.entries(previousStations)) {
        if (analysis) {
          prompt += `- ${station}: ${String(analysis).substring(0, 300)}...\n`;
        }
      }
      prompt += "\n";
    }

    // Add focus areas if specified
    if (focusAreas.length > 0) {
      prompt += `مجالات التركيز المطلوبة:\n`;
      focusAreas.forEach((area, index) => {
        prompt += `${index + 1}. ${area}\n`;
      });
      prompt += "\n";
    }

    // Add priority level
    prompt += `مستوى الأولوية: ${this.translatePriority(priorityLevel)}\n\n`;

    // Add the specific task
    prompt += `المهمة المحددة:\n${taskInput}\n\n`;

    // Add generation instructions
    prompt += `قدم توصيات وتحسينات شاملة تتضمن:

1. **محرك التوصيات الذكية:**
   - تحديد أولويات التحسين (عالية، متوسطة، منخفضة)
   - اقتراحات محددة وموجهة لكل مجال
   - تقدير الجهد المطلوب لكل تحسين

2. **تحسينات البنية:**
   - نقاط الضعف الهيكلية المحددة
   - تعديلات هيكلية مقترحة (إضافة/حذف/نقل مشاهد)
   - اقتراحات لتحسين الإيقاع العام

3. **تطوير الشخصيات:**
   - جوانب التطوير لكل شخصية رئيسية
   - اقتراحات لتعميق الدوافع والصراعات
   - تحسين أقواس تطور الشخصيات

4. **تحسين الحوار:**
   - مشاكل الحوار المحددة
   - اقتراحات لتحسين الطبيعية والأصالة
   - تعزيز تمايز أصوات الشخصيات

5. **البدائل الإبداعية:**
   - سيناريوهات بديلة للعناصر الضعيفة
   - مسارات سردية جديدة محتملة
   - التأثير المتوقع لكل بديل

قدم توصيات عملية وقابلة للتنفيذ.
رتب التوصيات حسب الأولوية والتأثير.
اكتب بلغة واضحة ومباشرة.
لا تستخدم تنسيق JSON أو كتل برمجية.`;

    return prompt;
  }

  /**
   * Post-process the recommendations output
   */
  protected override postProcess(
    output: StandardAgentOutput
  ): StandardAgentOutput {
    // Clean up text formatting
    const processedText = this.cleanupText(output.text);

    // Assess recommendations quality
    const qualityMetrics = this.assessRecommendationsQuality(processedText);

    // Adjust confidence based on quality
    const adjustedConfidence =
      output.confidence * 0.5 +
      qualityMetrics.actionability * 0.2 +
      qualityMetrics.specificity * 0.15 +
      qualityMetrics.comprehensiveness * 0.15;

    return {
      ...output,
      text: processedText,
      confidence: Math.min(1, adjustedConfidence),
      notes: this.generateRecommendationsNotes(output, qualityMetrics),
      metadata: {
        ...output.metadata,
        recommendationsQuality: qualityMetrics,
        actionability: qualityMetrics.actionability,
        specificity: qualityMetrics.specificity,
        comprehensiveness: qualityMetrics.comprehensiveness,
        recommendationsCount: this.countRecommendations(processedText),
      },
    };
  }

  /**
   * Clean up text formatting
   */
  private cleanupText(text: string): string {
    // Remove any JSON artifacts
    text = text.replace(/```json[\s\S]*?```/g, "");
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/\{[\s\S]*?"[^"]*"\s*:[\s\S]*?\}/g, "");

    // Remove excessive whitespace
    text = text.replace(/\n{3,}/g, "\n\n");
    text = text.trim();

    // Ensure proper section separation
    const lines = text.split("\n");
    const cleaned: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        cleaned.push(trimmed);
      } else if (cleaned.length > 0 && cleaned[cleaned.length - 1] !== "") {
        cleaned.push("");
      }
    }

    return cleaned.join("\n");
  }

  /**
   * Assess the quality of recommendations
   */
  private assessRecommendationsQuality(text: string): {
    actionability: number;
    specificity: number;
    comprehensiveness: number;
    creativeSolutions: number;
    overallScore: number;
  } {
    // Actionability indicators
    const actionTerms = [
      "يجب",
      "ينبغي",
      "يُنصح",
      "يمكن",
      "اقتراح",
      "تعديل",
      "إضافة",
      "حذف",
      "تحسين",
      "تطوير",
    ];
    const actionability = this.calculateCoverage(text, actionTerms);

    // Specificity indicators
    const specificTerms = [
      "مثال",
      "تحديداً",
      "بالتحديد",
      "مشهد",
      "شخصية",
      "حوار",
      "سطر",
      "فقرة",
    ];
    const specificity = this.calculateCoverage(text, specificTerms);

    // Comprehensiveness indicators
    const comprehensiveTerms = [
      "البنية",
      "الشخصيات",
      "الحوار",
      "الإيقاع",
      "الموضوع",
      "الصراع",
      "التطور",
    ];
    const comprehensiveness = this.calculateCoverage(text, comprehensiveTerms);

    // Creative solutions indicators
    const creativeTerms = [
      "بديل",
      "سيناريو",
      "مسار",
      "إبداعي",
      "مبتكر",
      "جديد",
      "مختلف",
    ];
    const creativeSolutions = this.calculateCoverage(text, creativeTerms);

    const overallScore =
      (actionability + specificity + comprehensiveness + creativeSolutions) / 4;

    return {
      actionability,
      specificity,
      comprehensiveness,
      creativeSolutions,
      overallScore,
    };
  }

  /**
   * Calculate coverage of terms in text
   */
  private calculateCoverage(text: string, terms: string[]): number {
    const lowerText = text.toLowerCase();
    let matchCount = 0;

    for (const term of terms) {
      if (lowerText.includes(term.toLowerCase())) {
        matchCount++;
      }
    }

    return Math.min(1, (matchCount / terms.length) * 1.5);
  }

  /**
   * Count recommendations in text
   */
  private countRecommendations(text: string): number {
    // Count numbered items, bullet points, and recommendation keywords
    const numberedItems = (text.match(/^\d+\./gm) ?? []).length;
    const bulletItems = (text.match(/^[-•]/gm) ?? []).length;
    const recommendationKeywords = (
      text.match(/اقتراح|توصية|تحسين|تعديل/gi) ?? []
    ).length;

    return Math.max(numberedItems, bulletItems, recommendationKeywords);
  }

  /**
   * Translate priority level to Arabic
   */
  private translatePriority(priority: string): string {
    const priorities: Record<string, string> = {
      high: "عالية - التركيز على التحسينات الجوهرية",
      medium: "متوسطة - توازن بين الجودة والكمية",
      low: "منخفضة - تحسينات تفصيلية",
      balanced: "متوازنة - تغطية شاملة لجميع الجوانب",
      critical: "حرجة - معالجة المشاكل الأساسية فقط",
    };
    return priorities[priority] ?? priority;
  }

  /**
   * Generate notes about the recommendations
   */
  private generateRecommendationsNotes(
    output: StandardAgentOutput,
    qualityMetrics: {
      actionability: number;
      specificity: number;
      comprehensiveness: number;
      creativeSolutions: number;
      overallScore: number;
    }
  ): string[] {
    const notes: string[] = [];

    // Confidence assessment
    if (output.confidence > 0.9) {
      notes.push("ثقة عالية في جودة التوصيات");
    } else if (output.confidence > 0.75) {
      notes.push("ثقة جيدة في التوصيات");
    } else {
      notes.push("ثقة متوسطة - يُنصح بمراجعة إضافية");
    }

    // Actionability
    if (qualityMetrics.actionability > 0.7) {
      notes.push("توصيات عملية وقابلة للتنفيذ");
    } else if (qualityMetrics.actionability < 0.4) {
      notes.push("يمكن تعزيز الجانب العملي للتوصيات");
    }

    // Specificity
    if (qualityMetrics.specificity > 0.7) {
      notes.push("توصيات محددة ومفصلة");
    } else if (qualityMetrics.specificity < 0.4) {
      notes.push("يمكن إضافة أمثلة أكثر تحديداً");
    }

    // Comprehensiveness
    if (qualityMetrics.comprehensiveness > 0.8) {
      notes.push("تغطية شاملة لجوانب العمل");
    }

    // Creative solutions
    if (qualityMetrics.creativeSolutions > 0.6) {
      notes.push("تضمين حلول إبداعية مبتكرة");
    }

    // Recommendations count
    const count = this.countRecommendations(output.text);
    if (count > 10) {
      notes.push(`تم تقديم ${count}+ توصية`);
    } else if (count > 5) {
      notes.push(`تم تقديم ${count} توصيات`);
    }

    // Add original notes
    if (output.notes) {
      notes.push(...output.notes);
    }

    return notes;
  }

  /**
   * Generate fallback response specific to recommendations
   */
  protected override getFallbackResponse(_input: StandardAgentInput): string {
    return `التوصيات والتحسينات المقترحة:

بناءً على التحليل الأولي للنص المقدم، إليك بعض التوصيات العامة:

**1. تحسينات البنية:**
- مراجعة التسلسل المنطقي للأحداث
- التأكد من توازن الإيقاع السردي
- تقييم قوة نقاط التحول الدرامية

**2. تطوير الشخصيات:**
- تعميق دوافع الشخصيات الرئيسية
- إضافة أبعاد للشخصيات الثانوية
- تحسين أقواس التطور الشخصي

**3. تحسين الحوار:**
- تمييز أصوات الشخصيات بشكل أوضح
- التأكد من طبيعية المحادثات
- تعزيز الوظيفة الدرامية للحوار

**4. اقتراحات إبداعية:**
- استكشاف زوايا سردية جديدة
- تعزيز عناصر التشويق والإثارة
- تعميق الموضوعات المطروحة

**توصية:**
للحصول على توصيات أكثر تفصيلاً ودقة، يُنصح بتوفير نتائج التحليلات السابقة من المحطات الأخرى.

ملاحظة: حدث خطأ تقني مؤقت. يُرجى المحاولة مرة أخرى.`;
  }
}

// Export singleton instance
export const recommendationsGeneratorAgent =
  new RecommendationsGeneratorAgent();
