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

    const contextObj =
      typeof context === "object" && context !== null ? context : {};
    const typedCtx = contextObj;
    const originalText = (typedCtx["originalText"] as string) || "";
    const analysisResults = (typedCtx["analysisResults"] as Record<string, string>) || {};
    const previousStations = (typedCtx["previousStations"] as Record<string, string>) || {};
    const focusAreas = (typedCtx["focusAreas"] as string[]) || [];
    const priorityLevel = (typedCtx["priorityLevel"] as string) || "balanced";

    let prompt = `${RECOMMENDATIONS_GENERATOR_INSTRUCTIONS}\n\n`;
    prompt += `[مهمة مولد التوصيات والتحسينات - WisdomSynthesizer AI]\n\n`;
    prompt += this.buildOriginalTextSection(originalText);
    prompt += this.buildAnalysisResultsSection(analysisResults);
    prompt += this.buildPreviousStationsSection(previousStations);
    prompt += this.buildFocusAreasSection(focusAreas);
    prompt += `مستوى الأولوية: ${this.translatePriority(priorityLevel)}\n\n`;
    prompt += `المهمة المحددة:\n${taskInput}\n\n`;
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

  private buildOriginalTextSection(text: string): string {
    return text ? `النص الأصلي:\n${text}\n\n` : "";
  }

  private buildAnalysisResultsSection(results: Record<string, string>): string {
    if (Object.keys(results).length === 0) return "";
    let section = `نتائج التحليلات السابقة:\n`;
    for (const [type, result] of Object.entries(results)) {
      if (result) section += `\n--- ${type} ---\n${String(result).substring(0, 500)}...\n`;
    }
    return section + "\n";
  }

  private buildPreviousStationsSection(stations: Record<string, string>): string {
    if (Object.keys(stations).length === 0) return "";
    let section = `سياق المحطات السابقة:\n`;
    for (const [station, analysis] of Object.entries(stations)) {
      if (analysis) section += `- ${station}: ${String(analysis).substring(0, 300)}...\n`;
    }
    return section + "\n";
  }

  private buildFocusAreasSection(areas: string[]): string {
    if (areas.length === 0) return "";
    let section = `مجالات التركيز المطلوبة:\n`;
    areas.forEach((area, index) => { section += `${index + 1}. ${area}\n`; });
    return section + "\n";
  }

  /**
   * Post-process the recommendations output
   */
  protected override postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
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

    return Promise.resolve({
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
    });
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

  private static readonly ACTION_TERMS = [
    "يجب", "ينبغي", "يُنصح", "يمكن", "اقتراح",
    "تعديل", "إضافة", "حذف", "تحسين", "تطوير",
  ];
  private static readonly SPECIFIC_TERMS = [
    "مثال", "تحديداً", "بالتحديد", "مشهد", "شخصية", "حوار", "سطر", "فقرة",
  ];
  private static readonly COMPREHENSIVE_TERMS = [
    "البنية", "الشخصيات", "الحوار", "الإيقاع", "الموضوع", "الصراع", "التطور",
  ];
  private static readonly CREATIVE_TERMS = [
    "بديل", "سيناريو", "مسار", "إبداعي", "مبتكر", "جديد", "مختلف",
  ];

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
    const actionability = this.calculateCoverage(text, RecommendationsGeneratorAgent.ACTION_TERMS);
    const specificity = this.calculateCoverage(text, RecommendationsGeneratorAgent.SPECIFIC_TERMS);
    const comprehensiveness = this.calculateCoverage(text, RecommendationsGeneratorAgent.COMPREHENSIVE_TERMS);
    const creativeSolutions = this.calculateCoverage(text, RecommendationsGeneratorAgent.CREATIVE_TERMS);
    const overallScore = (actionability + specificity + comprehensiveness + creativeSolutions) / 4;

    return { actionability, specificity, comprehensiveness, creativeSolutions, overallScore };
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
    notes.push(this.assessConfidenceNote(output.confidence));
    this.addMetricNotes(notes, qualityMetrics);
    this.addCountNote(notes, output.text);
    if (output.notes) notes.push(...output.notes);
    return notes;
  }

  private assessConfidenceNote(confidence: number): string {
    if (confidence > 0.9) return "ثقة عالية في جودة التوصيات";
    if (confidence > 0.75) return "ثقة جيدة في التوصيات";
    return "ثقة متوسطة - يُنصح بمراجعة إضافية";
  }

  private addMetricNotes(notes: string[], m: {
    actionability: number; specificity: number;
    comprehensiveness: number; creativeSolutions: number;
  }): void {
    if (m.actionability > 0.7) notes.push("توصيات عملية وقابلة للتنفيذ");
    else if (m.actionability < 0.4) notes.push("يمكن تعزيز الجانب العملي للتوصيات");
    if (m.specificity > 0.7) notes.push("توصيات محددة ومفصلة");
    else if (m.specificity < 0.4) notes.push("يمكن إضافة أمثلة أكثر تحديداً");
    if (m.comprehensiveness > 0.8) notes.push("تغطية شاملة لجوانب العمل");
    if (m.creativeSolutions > 0.6) notes.push("تضمين حلول إبداعية مبتكرة");
  }

  private addCountNote(notes: string[], text: string): void {
    const count = this.countRecommendations(text);
    if (count > 10) notes.push(`تم تقديم ${count}+ توصية`);
    else if (count > 5) notes.push(`تم تقديم ${count} توصيات`);
  }

  /**
   * Generate fallback response specific to recommendations
   */
  protected override getFallbackResponse(
    _input: StandardAgentInput
  ): Promise<string> {
    return Promise.resolve(`التوصيات والتحسينات المقترحة:

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

ملاحظة: حدث خطأ تقني مؤقت. يُرجى المحاولة مرة أخرى.`);
  }
}

// Export singleton instance
export const recommendationsGeneratorAgent = new RecommendationsGeneratorAgent();
