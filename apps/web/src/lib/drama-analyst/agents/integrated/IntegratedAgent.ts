import { TaskType } from "@core/types";
import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";
import { INTEGRATED_AGENT_CONFIG } from "./agent";

interface IntegratedContext {
  originalText?: string;
  analysisResults?: any;
  creativeResults?: any;
  targetOutput?: "analysis" | "creative" | "synthesis";
  synthesisDepth?: "basic" | "moderate" | "deep";
  integrationStrategy?: "sequential" | "parallel" | "iterative";
}

/**
 * Integrated Agent - وكيل التكامل التركيبي
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON
 */
export class IntegratedAgent extends BaseAgent {
  constructor() {
    super(
      "SynthesisOrchestrator AI",
      TaskType.INTEGRATED,
      INTEGRATED_AGENT_CONFIG.systemPrompt || ""
    );

    // Set agent-specific confidence floor
    this.confidenceFloor = 0.87;
  }

  /**
   * Build prompt for integrated synthesis
   */
  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;

    // Extract relevant context
    const ctx = context as IntegratedContext;
    const originalText = ctx?.originalText || "";
    const analysisResults = ctx?.analysisResults || null;
    const creativeResults = ctx?.creativeResults || null;
    const targetOutput = ctx?.targetOutput || "synthesis";
    const synthesisDepth = ctx?.synthesisDepth || "moderate";
    const integrationStrategy = ctx?.integrationStrategy || "sequential";

    // Build structured prompt
    let prompt = `مهمة التكامل التركيبي - منسق التحليل والإبداع\n\n`;

    // Add original text if available
    if (originalText) {
      prompt += `النص الأصلي:\n${this.truncateText(originalText, 1500)}\n\n`;
    }

    // Add analysis results
    if (analysisResults) {
      prompt += `نتائج التحليل:\n${this.summarizeResults(analysisResults, "analysis")}\n\n`;
    }

    // Add creative results
    if (creativeResults) {
      prompt += `نتائج الإبداع:\n${this.summarizeResults(creativeResults, "creative")}\n\n`;
    }

    // Add integration parameters
    prompt += `استراتيجية التكامل: ${this.translateStrategy(integrationStrategy)}\n`;
    prompt += `عمق التركيب: ${this.translateDepth(synthesisDepth)}\n`;
    prompt += `نوع المخرجات المطلوبة: ${this.translateTargetOutput(targetOutput)}\n\n`;

    // Add specific task
    prompt += `المهمة المطلوبة:\n${taskInput}\n\n`;

    // Add synthesis instructions
    prompt += `التعليمات التركيبية:

1. **التكامل الذكي (Intelligent Integration)**:
   - لا تكتفِ بجمع نتائج التحليل والإبداع
   - ابحث عن الروابط والتداخلات بينهما
   - أنشئ رؤية موحدة تضيف قيمة تتجاوز مجموع الأجزاء

2. **التوازن (Balance)**:
   - وازن بين الجوانب التحليلية والإبداعية
   - تأكد من أن التحليل يدعم الإبداع والعكس
   - تجنب الهيمنة المفرطة لأي جانب

3. **التماسك الشامل (Holistic Coherence)**:
   - تأكد من أن المخرجات النهائية متماسكة ومنطقية
   - اربط بين جميع العناصر بشكل طبيعي
   - قدم رؤية شاملة ومتكاملة

4. **الجودة النهائية (Final Quality)**:
   - أنت حارس الجودة النهائي
   - تأكد من أن المخرجات تلبي أعلى المعايير
   - قدم توصيات للتحسين إذا لزم الأمر

**تنسيق المخرجات حسب النوع:**

**للتركيب (Synthesis):**
- ابدأ بملخص تنفيذي يدمج التحليل والإبداع
- قدم رؤية موحدة تظهر كيف يكمل كل جزء الآخر
- اربط التوصيات التحليلية بالعناصر الإبداعية
- اختتم برؤية شاملة للمستقبل

**للتحليل المدمج (Analysis):**
- ابدأ بتحليل شامل يدمج النتائج
- قدم رؤية معمقة للعلاقات بين العناصر
- اربط التحليل بالإبداع
- اختتم بتوصيات قابلة للتطبيق

**للإبداع المدمج (Creative):**
- ابدأ بعرض إبداعي يدمج التحليل
- قدم محتوى إبداعي مدعوم بالتحليل
- أظهر كيف يوجه التحليل الإبداع
- اختتم بعناصر إبداعية محسّنة

**مهم:** اكتب مخرجات نصية واضحة ومباشرة. لا تستخدم JSON أو تنسيقات البرمجة. استخدم لغة عربية فصحى مع الحفاظ على الطابع المهني والسلطة التحليلية.`;

    return prompt;
  }

  /**
   * Post-process the integrated output
   */
  protected override async postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
    // Clean up the synthesis text
    let processedText = this.cleanupSynthesis(output.text);

    // Assess integration quality
    const integrationScore = await this.assessIntegration(processedText);
    const balanceScore = await this.assessBalance(processedText);
    const coherenceScore = await this.assessCoherence(processedText);
    const qualityScore = await this.assessOverallQuality(processedText);

    // Calculate adjusted confidence
    const adjustedConfidence =
      output.confidence * 0.35 +
      integrationScore * 0.25 +
      balanceScore * 0.2 +
      coherenceScore * 0.15 +
      qualityScore * 0.05;

    return {
      ...output,
      text: processedText,
      confidence: Math.min(1, adjustedConfidence),
      notes: this.generateIntegrationNotes(
        output,
        integrationScore,
        balanceScore,
        coherenceScore,
        qualityScore
      ),
      metadata: {
        ...output.metadata,
        integrationQuality: integrationScore,
        balanceQuality: balanceScore,
        coherenceQuality: coherenceScore,
        overallQuality: qualityScore,
        synthesisType: this.detectSynthesisType(processedText),
        wordCount: processedText.split(/\s+/).length,
      } as any,
    };
  }

  /**
   * Clean up synthesis formatting
   */
  private cleanupSynthesis(text: string): string {
    // Remove JSON and code artifacts
    text = text.replace(/```json[\s\S]*?```/g, "");
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/\{[\s\S]*?\}/g, (match) => {
      if (match.includes('"') && match.includes(":")) return "";
      return match;
    });

    // Remove excessive whitespace
    text = text.replace(/\n{3,}/g, "\n\n").trim();

    // Ensure proper section formatting
    text = this.formatSynthesisSections(text);

    return text;
  }

  /**
   * Format synthesis sections
   */
  private formatSynthesisSections(text: string): string {
    const lines = text.split("\n");
    const formatted: string[] = [];
    let inSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() ?? "";
      const nextLine = lines[i + 1]?.trim() ?? "";

      // Detect section headers
      if (
        this.isSynthesisSectionHeader(line) ||
        (line.match(/^\d+\./) && nextLine && !nextLine.match(/^\d+\./))
      ) {
        if (inSection && formatted.length > 0) {
          formatted.push("");
        }
        formatted.push(line);
        inSection = true;
      } else if (line) {
        formatted.push(line);
      } else if (formatted[formatted.length - 1] !== "") {
        formatted.push("");
      }
    }

    return formatted.join("\n");
  }

  /**
   * Check if line is a synthesis section header
   */
  private isSynthesisSectionHeader(line: string): boolean {
    const headers = [
      "ملخص تنفيذي",
      "التركيب",
      "التكامل",
      "التوازن",
      "التماسك",
      "التحليل المدمج",
      "الإبداع المدمج",
      "الرؤية الشاملة",
      "التوصيات",
    ];

    return headers.some((header) => line.includes(header));
  }

  /**
   * Assess integration quality
   */
  private async assessIntegration(text: string): Promise<number> {
    let score = 0.6; // Base score

    // Check for integration terms
    const integrationTerms = ["تكامل", "دمج", "ربط", "توحيد", "تركيب", "تنسيق"];
    const hasIntegrationTerms = integrationTerms.some((term) =>
      text.includes(term)
    );
    if (hasIntegrationTerms) score += 0.2;

    // Check for connections between analysis and creative
    if (
      (text.includes("تحليل") && text.includes("إبداع")) ||
      (text.includes("تحليلي") && text.includes("إبداعي"))
    ) {
      score += 0.15;
    }

    // Check for value-added synthesis
    if (text.includes("قيمة") || text.includes("إضافة")) {
      score += 0.05;
    }

    return Math.min(1, score);
  }

  /**
   * Assess balance between analysis and creative
   */
  private async assessBalance(text: string): Promise<number> {
    let score = 0.5; // Base score

    // Check for balance indicators
    const balanceTerms = ["توازن", "توازي", "تكامل", "انسجام"];
    const hasBalanceTerms = balanceTerms.some((term) => text.includes(term));
    if (hasBalanceTerms) score += 0.2;

    // Check for both analysis and creative elements
    const analysisCount = (text.match(/تحليل/g) || []).length;
    const creativeCount = (text.match(/إبداع/g) || []).length;

    if (analysisCount > 0 && creativeCount > 0) {
      // Balance means both are present
      const ratio =
        Math.min(analysisCount, creativeCount) /
        Math.max(analysisCount, creativeCount);
      score += ratio * 0.3;
    }

    return Math.min(1, score);
  }

  /**
   * Assess coherence
   */
  private async assessCoherence(text: string): Promise<number> {
    let score = 0.6; // Base score

    // Check for coherence terms
    const coherenceTerms = ["تماسك", "انسجام", "اتساق", "ترابط", "وضوح"];
    const hasCoherenceTerms = coherenceTerms.some((term) =>
      text.includes(term)
    );
    if (hasCoherenceTerms) score += 0.2;

    // Check for logical flow indicators
    const flowTerms = ["أولاً", "ثانياً", "ثالثاً", "بعد ذلك", "أخيراً"];
    const hasFlowTerms = flowTerms.some((term) => text.includes(term));
    if (hasFlowTerms) score += 0.1;

    // Check for comprehensive view
    if (
      text.includes("شامل") ||
      text.includes("كامل") ||
      text.includes("موحد")
    ) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * Assess overall quality
   */
  private async assessOverallQuality(text: string): Promise<number> {
    let score = 0.5; // Base score

    // Check text length (longer usually means more comprehensive)
    if (text.length > 1000) score += 0.2;
    if (text.length > 2000) score += 0.2;

    // Check for quality indicators
    const qualityTerms = ["جودة", "ممتاز", "عالية", "ممتازة", "مثالي"];
    const hasQualityTerms = qualityTerms.some((term) => text.includes(term));
    if (hasQualityTerms) score += 0.1;

    // Check for recommendations (indicates actionable output)
    if (text.includes("توصية") || text.includes("ينصح")) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * Detect synthesis type
   */
  private detectSynthesisType(text: string): string {
    if (text.includes("تحليل") && !text.includes("إبداع")) {
      return "تحليل مدمج";
    }
    if (text.includes("إبداع") && !text.includes("تحليل")) {
      return "إبداع مدمج";
    }
    if (
      text.includes("تركيب") ||
      (text.includes("تحليل") && text.includes("إبداع"))
    ) {
      return "تركيب شامل";
    }
    return "تكامل عام";
  }

  /**
   * Generate integration notes
   */
  private generateIntegrationNotes(
    output: StandardAgentOutput,
    integrationScore: number,
    balanceScore: number,
    coherenceScore: number,
    qualityScore: number
  ): string[] {
    const notes: string[] = [];

    // Overall confidence
    if (output.confidence > 0.85) {
      notes.push("ثقة عالية في التكامل");
    } else if (output.confidence > 0.7) {
      notes.push("ثقة جيدة");
    } else {
      notes.push("ثقة متوسطة - يُنصح بالمراجعة");
    }

    // Integration quality
    if (integrationScore > 0.8) {
      notes.push("تكامل ممتاز");
    } else if (integrationScore < 0.6) {
      notes.push("يحتاج تحسين التكامل");
    }

    // Balance
    if (balanceScore > 0.8) {
      notes.push("توازن ممتاز بين التحليل والإبداع");
    } else if (balanceScore < 0.6) {
      notes.push("يحتاج تحسين التوازن");
    }

    // Coherence
    if (coherenceScore > 0.8) {
      notes.push("تماسك شامل ممتاز");
    }

    // Quality
    if (qualityScore > 0.8) {
      notes.push("جودة عالية");
    }

    // Add original notes
    if (output.notes) {
      notes.push(...output.notes.filter((note) => !notes.includes(note)));
    }

    return notes;
  }

  /**
   * Truncate text to max length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  /**
   * Translate integration strategy
   */
  private translateStrategy(strategy: string): string {
    const strategies: Record<string, string> = {
      sequential: "تسلسلي",
      parallel: "متوازي",
      iterative: "تكرارية",
    };
    return strategies[strategy] || strategy;
  }

  /**
   * Translate synthesis depth
   */
  private translateDepth(depth: string): string {
    const depths: Record<string, string> = {
      basic: "أساسي",
      moderate: "متوسط",
      deep: "عميق",
    };
    return depths[depth] || depth;
  }

  /**
   * Translate target output
   */
  private translateTargetOutput(target: string): string {
    const targets: Record<string, string> = {
      analysis: "تحليل مدمج",
      creative: "إبداع مدمج",
      synthesis: "تركيب شامل",
    };
    return targets[target] || target;
  }

  /**
   * Summarize results
   */
  private summarizeResults(
    results: any,
    type: "analysis" | "creative"
  ): string {
    if (typeof results === "string") {
      return results.length > 500 ? results.substring(0, 500) + "..." : results;
    }

    const summary: string[] = [];

    if (type === "analysis") {
      if (results?.mainFindings) {
        summary.push(`النتائج الرئيسية: ${results.mainFindings}`);
      }
      if (results?.recommendations) {
        const recs =
          typeof results.recommendations === "string"
            ? results.recommendations
            : Array.isArray(results.recommendations)
              ? results.recommendations.join(", ")
              : "توصيات متوفرة";
        summary.push(`التوصيات: ${recs}`);
      }
    } else {
      if (results?.content) {
        summary.push(`المحتوى الإبداعي: ${results.content}`);
      }
      if (results?.creativeElements) {
        summary.push(`العناصر الإبداعية: ${results.creativeElements}`);
      }
    }

    return (
      summary.join("\n") ||
      `نتائج ${type === "analysis" ? "التحليل" : "الإبداع"} متوفرة`
    );
  }

  /**
   * Generate fallback response
   */
  protected override async getFallbackResponse(
    _input: StandardAgentInput
  ): Promise<string> {
    return `تكامل تركيبى - منسق التحليل والإبداع:
تم إجراء تكامل أولي بين نتائج التحليل والإبداع.

التركيب الأولي:
- تم دمج النتائج التحليلية مع العناصر الإبداعية
- تم إنشاء رؤية موحدة تجمع بين الجوانب المختلفة
- تم التأكد من التماسك والانسجام بين العناصر

التوصيات:
1. (حرجة) مراجعة التكامل بين التحليل والإبداع
2. (عالية) تحسين التوازن بين الجوانب المختلفة
3. (متوسطة) تعزيز التماسك الشامل

ملاحظة: حدث خطأ مؤقت في معالجة التكامل. يُرجى المحاولة مرة أخرى أو تفعيل الخيارات المتقدمة للحصول على تكامل أكثر عمقاً ودقة.`;
  }
}

// Export singleton instance
export const integratedAgent = new IntegratedAgent();
