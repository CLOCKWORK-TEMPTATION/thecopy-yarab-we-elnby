import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import { safeCountMultipleTerms, sumCounts } from "../shared/safe-regexp";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { COMPLETION_AGENT_CONFIG } from "./agent";
import { COMPLETION_MODE_INSTRUCTIONS } from "./instructions";

const DIALOGUE_REGEX = /["«][^"»]*["»]/;
const DESCRIPTIVE_WORDS = ["وصف", "شعر", "أحس", "رأى", "سمع", "لاحظ"];

/**
 * Completion Agent - وكيل استكمال السرد
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON
 */
export class CompletionAgent extends BaseAgent {
  constructor() {
    super(
      "NarrativeContinuum AI",
      TaskType.COMPLETION,
      COMPLETION_AGENT_CONFIG.systemPrompt ?? "",
    );

    // Set agent-specific confidence floor
    this.confidenceFloor = 0.85;
  }

  /**
   * Build prompt for completion task
   */
  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;

    const ctx = this.extractCompletionContext(context);

    // Build structured prompt
    let prompt = `${COMPLETION_MODE_INSTRUCTIONS}\n\n`;
    prompt += this.buildContextSection(ctx);
    prompt += `المهمة المحددة:\n${taskInput}\n\n`;
    prompt += this.buildCompletionInstructions();

    return prompt;
  }

  /**
   * Extract completion context from input
   */
  private extractCompletionContext(context: StandardAgentInput["context"]): {
    originalText: string;
    previousCompletions: string[];
    completionScope: string;
    enhancements: string[];
  } {
    const ctx = this.toRecord(context);
    return {
      originalText: (ctx?.["originalText"] as string) || "",
      previousCompletions: (ctx?.["previousCompletions"] as string[]) || [],
      completionScope: (ctx?.["completionScope"] as string) || "paragraph",
      enhancements: (ctx?.["enhancements"] as string[]) || [],
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
   * Build context section of the prompt
   */
  private buildContextSection(ctx: {
    originalText: string;
    previousCompletions: string[];
    completionScope: string;
    enhancements: string[];
  }): string {
    let section = "";

    if (ctx.originalText) {
      section += `النص الأصلي:\n${ctx.originalText}\n\n`;
    }

    if (ctx.previousCompletions.length > 0) {
      section += `الاستكمالات السابقة:\n`;
      ctx.previousCompletions.forEach((comp: string, index: number) => {
        section += `[استكمال ${index + 1}]: ${comp}\n`;
      });
      section += "\n";
    }

    section += `نطاق الاستكمال المطلوب: ${this.translateScope(ctx.completionScope)}\n\n`;

    if (ctx.enhancements.length > 0) {
      section += `تحسينات الاستكمال المطلوبة:\n`;
      ctx.enhancements.forEach((enhancement: string) => {
        section += `- ${this.translateEnhancement(enhancement)}\n`;
      });
      section += "\n";
    }

    return section;
  }

  /**
   * Build completion instructions
   */
  private buildCompletionInstructions(): string {
    return `قدم الاستكمال بشكل نصي واضح ومباشر، مع الحفاظ على:
1. الاتساق مع النمط الأصلي
2. التماسك السردي والمنطقي
3. جودة اللغة والأسلوب
4. التدفق الطبيعي للأحداث والشخصيات

ابدأ بتحليل موجز (2-3 جمل) ثم قدم النص المستكمل مباشرة.`;
  }

  /**
   * Post-process the completion output
   */
  protected override async postProcess(
    output: StandardAgentOutput,
  ): Promise<StandardAgentOutput> {
    await Promise.resolve();
    // Ensure the output is properly formatted
    let processedText = output.text;

    // Clean up any formatting issues
    processedText = this.cleanupText(processedText);

    // Validate completion quality
    const qualityScore = this.assessCompletionQuality(processedText);

    // Adjust confidence based on quality
    const adjustedConfidence = output.confidence * 0.7 + qualityScore * 0.3;

    return {
      ...output,
      text: processedText,
      confidence: adjustedConfidence,
      notes: this.generateCompletionNotes(output, qualityScore),
      metadata: {
        ...output.metadata,
        completionQuality: qualityScore,
        characterConsistency: this.checkCharacterConsistency(processedText),
        narrativeFlow: this.checkNarrativeFlow(processedText),
      },
    };
  }

  /**
   * Clean up text formatting
   */
  private cleanupText(text: string): string {
    // Remove any JSON artifacts
    text = text.replace(/```json[^`]*```/g, "");
    text = text.replace(/```[^`]*```/g, "");

    // Remove excessive whitespace
    text = text.replace(/\n{3,}/g, "\n\n");
    text = text.trim();

    // Ensure proper paragraph separation
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
   * Assess completion quality
   */
  private assessCompletionQuality(text: string): number {
    // Simple heuristic-based quality assessment
    let score = 0.5; // Base score

    // Check text length (should be substantial)
    if (text.length > 500) score += 0.1;
    if (text.length > 1000) score += 0.1;

    // Check for proper paragraphing
    const paragraphs = text.split("\n\n").filter((p) => p.trim().length > 0);
    if (paragraphs.length > 1) score += 0.1;

    // Check for dialogue (if present, should be formatted)
    const hasDialogue = text.includes('"') || text.includes("«");
    if (hasDialogue && DIALOGUE_REGEX.test(text)) {
      score += 0.1;
    }

    // Check for descriptive elements
    const hasDescription = DESCRIPTIVE_WORDS.some((word) =>
      text.includes(word),
    );
    if (hasDescription) score += 0.1;

    return Math.min(1, score);
  }

  /**
   * Check character consistency
   */
  private checkCharacterConsistency(_text: string): number {
    // This would ideally check against character profiles
    // For now, return a reasonable default
    return 0.85;
  }

  /**
   * Check narrative flow
   */
  private checkNarrativeFlow(text: string): number {
    // Check for logical connectors and flow
    const connectors = [
      "ثم",
      "بعد",
      "لذلك",
      "وهكذا",
      "في النهاية",
      "بينما",
      "عندما",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const connectorCount = safeCountMultipleTerms(text, connectors);

    // More connectors suggest better flow (normalized)
    const flowScore = Math.min(1, sumCounts(connectorCount) / 10);
    return 0.7 + flowScore * 0.3;
  }

  /**
   * Generate notes about the completion
   */
  private generateCompletionNotes(
    output: StandardAgentOutput,
    qualityScore: number,
  ): string[] {
    const notes: string[] = [];

    // Add confidence note
    if (output.confidence > 0.9) {
      notes.push("ثقة عالية في جودة الاستكمال");
    } else if (output.confidence > 0.7) {
      notes.push("ثقة جيدة في الاستكمال");
    } else {
      notes.push("ثقة متوسطة - قد يحتاج مراجعة");
    }

    // Add quality note
    if (qualityScore > 0.8) {
      notes.push("جودة ممتازة للنص المستكمل");
    } else if (qualityScore > 0.6) {
      notes.push("جودة جيدة للنص");
    } else {
      notes.push("الجودة تحتاج تحسين");
    }

    // Add pattern notes from original output
    if (output.notes) {
      notes.push(...output.notes);
    }

    return notes;
  }

  /**
   * Translate completion scope to Arabic
   */
  private translateScope(scope: string): string {
    const scopes: Record<string, string> = {
      sentence: "جملة واحدة",
      paragraph: "فقرة كاملة",
      scene: "مشهد كامل",
      chapter: "فصل كامل",
      ending: "نهاية القصة",
    };
    return scopes[scope] ?? scope;
  }

  /**
   * Translate enhancement to Arabic
   */
  private translateEnhancement(enhancement: string): string {
    const enhancements: Record<string, string> = {
      style_fingerprint: "بصمة الأسلوب",
      character_voice: "صوت الشخصيات",
      plot_prediction: "تنبؤ الحبكة",
      thematic_consistency: "الاتساق الموضوعي",
      emotional_arc: "القوس العاطفي",
    };
    return enhancements[enhancement] ?? enhancement;
  }

  /**
   * Generate fallback response specific to completion
   */
  protected override async getFallbackResponse(
    input: StandardAgentInput,
  ): Promise<string> {
    await Promise.resolve();
    const contextObj =
      typeof input.context === "object" && input.context !== null
        ? input.context
        : {};
    const scope = (contextObj?.["completionScope"] as string) || "paragraph";

    return `تحليل موجز: النص يحتاج إلى استكمال ${this.translateScope(scope)} يتماشى مع السياق والأسلوب المقدم.

الاستكمال المقترح:
[نظراً لوجود صعوبة تقنية، يُرجى مراجعة النص الأصلي والمحاولة مرة أخرى مع توضيح أكثر لنطاق الاستكمال المطلوب.]

ملاحظة: يمكن تحسين جودة الاستكمال بتفعيل خيارات التحسين المتقدمة من الإعدادات.`;
  }
}

// Export singleton instance
export const completionAgent = new CompletionAgent();
