import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import { safeCountMultipleTerms, sumCounts } from "../shared/safe-regexp";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { CREATIVE_AGENT_CONFIG } from "./agent";
import { CREATIVE_MODE_INSTRUCTIONS } from "./instructions";

/**
 * Creative Development Agent - وكيل التطوير الإبداعي
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON
 */
export class CreativeAgent extends BaseAgent {
  constructor() {
    super(
      "CreativeVision AI",
      TaskType.CREATIVE,
      CREATIVE_AGENT_CONFIG.systemPrompt ?? "",
    );

    // Set agent-specific confidence floor
    this.confidenceFloor = 0.75;
  }

  /**
   * Build prompt for creative development task
   */
  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;
    const ctx = this.extractCreativeContext(context);

    let prompt = `${CREATIVE_MODE_INSTRUCTIONS}\n\n`;
    prompt += this.buildCreativeContextSection(ctx);
    prompt += `المهمة المحددة:\n${taskInput}\n\n`;
    prompt += this.buildCreativeInstructions();

    return prompt;
  }

  /**
   * Extract creative context from input
   */
  private extractCreativeContext(context: StandardAgentInput["context"]): {
    originalText: string;
    developmentFocus: string;
    creativeConstraints: string[];
    targetAudience: string;
    creativeGoals: string[];
  } {
    const ctx = this.toRecord(context);
    return {
      originalText: (ctx["originalText"] as string) || "",
      developmentFocus: (ctx["developmentFocus"] as string) || "general",
      creativeConstraints: (ctx["constraints"] as string[]) || [],
      targetAudience: (ctx["targetAudience"] as string) || "عام",
      creativeGoals: (ctx["goals"] as string[]) || [],
    };
  }

  /**
   * Safely convert context to Record
   */
  private toRecord(
    context: StandardAgentInput["context"],
  ): Record<string, unknown> {
    return typeof context === "object" && context !== null ? context : {};
  }

  /**
   * Build creative context section of prompt
   */
  private buildCreativeContextSection(ctx: {
    originalText: string;
    developmentFocus: string;
    creativeConstraints: string[];
    targetAudience: string;
    creativeGoals: string[];
  }): string {
    let section = "";

    if (ctx.originalText) {
      section += `النص الأصلي للتطوير:\n${ctx.originalText}\n\n`;
    }

    section += `محور التطوير الإبداعي: ${this.translateFocus(ctx.developmentFocus)}\n\n`;

    if (ctx.creativeGoals.length > 0) {
      section += `الأهداف الإبداعية:\n`;
      ctx.creativeGoals.forEach((goal: string, index: number) => {
        section += `${index + 1}. ${goal}\n`;
      });
      section += "\n";
    }

    if (ctx.creativeConstraints.length > 0) {
      section += `القيود الإبداعية:\n`;
      ctx.creativeConstraints.forEach((constraint: string) => {
        section += `- ${constraint}\n`;
      });
      section += "\n";
    }

    section += `الجمهور المستهدف: ${ctx.targetAudience}\n\n`;
    return section;
  }

  /**
   * Build creative generation instructions
   */
  private buildCreativeInstructions(): string {
    return `قدم تطويراً إبداعياً شاملاً يتضمن:

1. **تحليل إبداعي** (3-4 جمل): رؤية نقدية للعناصر الإبداعية الحالية
2. **مقترحات التطوير**: أفكار محددة وقابلة للتطبيق
3. **أمثلة تطبيقية**: نماذج عملية للتحسينات المقترحة
4. **التأثير المتوقع**: كيف ستحسن هذه التطويرات من جودة العمل

اكتب بشكل نصي واضح ومباشر، دون استخدام JSON أو تنسيقات معقدة.`;
  }

  /**
   * Post-process the creative output
   */
  protected override postProcess(
    output: StandardAgentOutput,
  ): Promise<StandardAgentOutput> {
    // Clean and structure the output
    const processedText = this.cleanupCreativeText(output.text);

    // Assess creative quality
    const creativityScore = this.assessCreativity(processedText);
    const practicalityScore = this.assessPracticality(processedText);

    // Balance confidence between creativity and practicality
    const adjustedConfidence =
      output.confidence * 0.5 +
      creativityScore * 0.25 +
      practicalityScore * 0.25;

    // Generate enhanced notes
    const enhancedNotes = this.generateCreativeNotes(
      output,
      creativityScore,
      practicalityScore,
    );

    return Promise.resolve({
      ...output,
      text: processedText,
      confidence: adjustedConfidence,
      notes: enhancedNotes,
      metadata: {
        ...output.metadata,
        creativityScore,
        practicalityScore,
        innovationLevel: this.calculateInnovationLevel(creativityScore),
        implementationDifficulty:
          this.calculateImplementationDifficulty(practicalityScore),
      },
    });
  }

  /**
   * Clean up creative text and ensure proper formatting
   */
  private cleanupCreativeText(text: string): string {
    // Remove any JSON or code block artifacts
    text = text.replace(/```json[\s\S]*?```/g, "");
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/\{[\s\S]*?\}/g, (match) => {
      // Keep curly braces only if they're part of natural text
      if (match.includes('"') || match.includes(":")) return "";
      return match;
    });

    // Structure the output with clear sections
    const sections = this.extractSections(text);

    let structured = "";

    // Add creative analysis section
    if (sections["analysis"]) {
      structured += `تحليل إبداعي:\n${sections["analysis"]}\n\n`;
    }

    // Add development proposals
    if (sections["proposals"]) {
      structured += `مقترحات التطوير:\n${sections["proposals"]}\n\n`;
    }

    // Add practical examples
    if (sections["examples"]) {
      structured += `أمثلة تطبيقية:\n${sections["examples"]}\n\n`;
    }

    // Add expected impact
    if (sections["impact"]) {
      structured += `التأثير المتوقع:\n${sections["impact"]}\n\n`;
    }

    // If no clear sections, return cleaned original
    if (!structured) {
      structured = text;
    }

    // Final cleanup
    structured = structured.replace(/\n{3,}/g, "\n\n").trim();

    return structured;
  }

  /**
   * Extract sections from text
   */
  private extractSections(text: string): Record<string, string> {
    const sections: Record<string, string> = {};

    // Patterns for different sections
    const patterns = {
      analysis:
        /(?:تحليل|التحليل|رؤية نقدية|تقييم)[\s\S]*?(?=مقترحات|أمثلة|التأثير|$)/i,
      proposals:
        /(?:مقترحات|اقتراحات|التطوير|تطويرات)[\s\S]*?(?=أمثلة|التأثير|$)/i,
      examples: /(?:أمثلة|نماذج|تطبيقات|مثال)[\s\S]*?(?=التأثير|$)/i,
      impact: /(?:التأثير|النتائج|المخرجات|الأثر)[\s\S]*?$/i,
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        sections[key] = match[0].replace(/^[^\n]*\n/, "").trim();
      }
    }

    // If no sections found, try to split by paragraphs
    if (Object.keys(sections).length === 0) {
      const paragraphs = text.split("\n\n").filter((p) => p.trim());
      if (paragraphs.length >= 2 && paragraphs[0]) {
        sections["analysis"] = paragraphs[0];
        sections["proposals"] = paragraphs.slice(1).join("\n\n");
      }
    }

    return sections;
  }

  /**
   * Assess creativity score
   */
  private assessCreativity(text: string): number {
    let score = 0.5; // Base score

    // Check for innovative keywords
    const innovativeWords = [
      "مبتكر",
      "جديد",
      "فريد",
      "أصيل",
      "إبداعي",
      "متميز",
      "رائد",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const innovationCount = safeCountMultipleTerms(text, innovativeWords);
    score += Math.min(0.2, sumCounts(innovationCount) * 0.02);

    // Check for multiple perspectives
    const perspectiveMarkers = [
      "من جهة",
      "من ناحية",
      "بالإضافة",
      "كما",
      "أيضاً",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const perspectiveCount = safeCountMultipleTerms(text, perspectiveMarkers);
    score += Math.min(0.15, sumCounts(perspectiveCount) * 0.03);

    // Check for concrete examples
    if (text.includes("مثال") || text.includes("مثلاً")) {
      score += 0.1;
    }

    // Check for depth (longer, detailed explanations)
    if (text.length > 1500) score += 0.05;

    return Math.min(1, score);
  }

  /**
   * Assess practicality score
   */
  private assessPracticality(text: string): number {
    let score = 0.6; // Base score for practicality

    // Check for actionable language
    const actionableWords = ["يمكن", "ينبغي", "يجب", "خطوة", "تطبيق", "تنفيذ"];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const actionableCount = safeCountMultipleTerms(text, actionableWords);
    score += Math.min(0.2, sumCounts(actionableCount) * 0.02);

    // Check for specific details
    const hasNumbers = /\d+/.test(text);
    const hasSteps =
      text.includes("أولاً") || text.includes("ثانياً") || /\d\./.test(text);
    if (hasNumbers) score += 0.05;
    if (hasSteps) score += 0.1;

    // Check for realistic constraints mentioned
    const constraintWords = ["تحدي", "صعوبة", "يتطلب", "احتياج", "موارد"];
    const hasConstraints = constraintWords.some((word) => text.includes(word));
    if (hasConstraints) score += 0.05;

    return Math.min(1, score);
  }

  /**
   * Calculate innovation level
   */
  private calculateInnovationLevel(creativityScore: number): string {
    if (creativityScore > 0.8) return "عالي جداً";
    if (creativityScore > 0.6) return "عالي";
    if (creativityScore > 0.4) return "متوسط";
    return "محافظ";
  }

  /**
   * Calculate implementation difficulty
   */
  private calculateImplementationDifficulty(practicalityScore: number): string {
    if (practicalityScore > 0.8) return "سهل";
    if (practicalityScore > 0.6) return "متوسط";
    if (practicalityScore > 0.4) return "صعب";
    return "صعب جداً";
  }

  /**
   * Generate creative notes
   */
  private generateCreativeNotes(
    output: StandardAgentOutput,
    creativityScore: number,
    practicalityScore: number,
  ): string[] {
    const notes: string[] = [];

    // Creativity assessment
    if (creativityScore > 0.7) {
      notes.push("أفكار إبداعية متميزة");
    } else if (creativityScore > 0.5) {
      notes.push("مستوى إبداعي جيد");
    } else {
      notes.push("يحتاج المزيد من الابتكار");
    }

    // Practicality assessment
    if (practicalityScore > 0.7) {
      notes.push("قابل للتطبيق بسهولة");
    } else if (practicalityScore > 0.5) {
      notes.push("قابلية تطبيق معقولة");
    } else {
      notes.push("يحتاج دراسة للتطبيق");
    }

    // Overall confidence
    if (output.confidence > 0.8) {
      notes.push("ثقة عالية في الجودة");
    }

    // Add original notes if any
    if (output.notes) {
      notes.push(...output.notes.filter((note) => !notes.includes(note)));
    }

    return notes;
  }

  /**
   * Translate development focus
   */
  private translateFocus(focus: string): string {
    const focuses: Record<string, string> = {
      general: "تطوير عام",
      plot: "تطوير الحبكة",
      characters: "تطوير الشخصيات",
      dialogue: "تطوير الحوار",
      setting: "تطوير البيئة",
      theme: "تطوير المواضيع",
      style: "تطوير الأسلوب",
      structure: "تطوير البنية",
    };
    return focuses[focus] ?? focus;
  }

  /**
   * Generate fallback response for creative tasks
   */
  protected override getFallbackResponse(
    input: StandardAgentInput,
  ): Promise<string> {
    const focus =
      (typeof input.context === "object" &&
        input.context["developmentFocus"]) ??
      "general";

    return Promise.resolve(`تحليل إبداعي:
لتطوير ${this.translateFocus(focus as string)} في النص المقدم، يمكن التركيز على تعزيز العناصر الأساسية وإضافة عمق أكبر.

مقترحات التطوير:
- تعميق التفاصيل الوصفية
- تطوير الحوارات لتكون أكثر طبيعية
- إضافة طبقات من المعنى والرمزية
- تحسين البنية السردية

ملاحظة: يُرجى تفعيل الخيارات المتقدمة للحصول على تحليل أعمق ومقترحات أكثر تفصيلاً.`);
  }
}

// Export singleton instance
export const creativeAgent = new CreativeAgent();
