import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { ANALYSIS_AGENT_CONFIG } from "./agent";
import {
  METHODOLOGY_INSTRUCTIONS,
  ANALYSIS_FALLBACK_RESPONSE,
} from "./instructions";

interface AnalysisContext {
  originalText?: string;
  previousAnalysis?: unknown;
  targetAudience?: string;
  genre?: string;
  analysisDepth?: "surface" | "moderate" | "deep";
  focusAreas?: string[];
}

function stringifySummaryValue(value: unknown): string {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "boolean":
    case "bigint":
    case "symbol":
      return String(value);
    case "object":
      return value === null ? "" : (JSON.stringify(value) ?? "");
    default:
      return "";
  }
}

/** Analysis Agent - وكيل التحليل النقدي المعماري */
export class AnalysisAgent extends BaseAgent {
  constructor() {
    super(
      "CritiqueArchitect AI",
      TaskType.ANALYSIS,
      ANALYSIS_AGENT_CONFIG.systemPrompt ?? "",
    );

    // Set agent-specific confidence floor
    this.confidenceFloor = 0.85;
  }

  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;
    const ctx = context as AnalysisContext;

    let prompt = `مهمة التحليل النقدي المعماري\n\n`;
    prompt += this.buildContextSection(ctx);
    prompt += this.buildPreviousAnalysisSection(ctx?.previousAnalysis);
    prompt += `المهمة المطلوبة:\n${taskInput}\n\n`;
    prompt += this.getMethodologyInstructions();

    return prompt;
  }

  private buildContextSection(ctx: AnalysisContext | undefined): string {
    let section = "";
    const originalText = ctx?.originalText ?? "";
    const genre = ctx?.genre ?? "";
    const targetAudience = ctx?.targetAudience ?? "";
    const analysisDepth = ctx?.analysisDepth ?? "moderate";
    const focusAreas = ctx?.focusAreas ?? [];

    if (originalText) {
      section += `النص المراد تحليله:\n${this.truncateText(originalText, 2000)}\n\n`;
    }
    if (genre) section += `النوع الأدبي: ${genre}\n`;
    if (targetAudience) section += `الجمهور المستهدف: ${targetAudience}\n`;
    section += `عمق التحليل المطلوب: ${this.translateDepth(analysisDepth)}\n\n`;

    if (focusAreas.length > 0) {
      section += `مجالات التركيز:\n`;
      focusAreas.forEach((area, index) => {
        section += `${index + 1}. ${area}\n`;
      });
      section += "\n";
    }
    return section;
  }

  private buildPreviousAnalysisSection(previousAnalysis: unknown): string {
    if (!previousAnalysis) return "";
    return `تحليل سابق:\n${this.summarizeAnalysis(previousAnalysis)}\n\n`;
  }

  private getMethodologyInstructions(): string {
    return METHODOLOGY_INSTRUCTIONS;
  }

  protected override async postProcess(
    output: StandardAgentOutput,
  ): Promise<StandardAgentOutput> {
    await Promise.resolve();
    // Clean up the analysis text
    const processedText = this.cleanupAnalysis(output.text);

    // Assess analysis quality
    const structuralScore = this.assessStructuralAnalysis(processedText);
    const dialecticalScore = this.assessDialecticalAnalysis(processedText);
    const recommendationsScore = this.assessRecommendations(processedText);
    const depthScore = this.assessAnalyticalDepth(processedText);

    // Calculate adjusted confidence
    const adjustedConfidence =
      output.confidence * 0.4 +
      structuralScore * 0.25 +
      dialecticalScore * 0.2 +
      recommendationsScore * 0.1 +
      depthScore * 0.05;

    return {
      ...output,
      text: processedText,
      confidence: Math.min(1, adjustedConfidence),
      notes: this.generateAnalysisNotes(
        output,
        structuralScore,
        dialecticalScore,
        recommendationsScore,
        depthScore,
      ),
      metadata: {
        ...output.metadata,
        structuralAnalysis: structuralScore,
        dialecticalAnalysis: dialecticalScore,
        recommendationsQuality: recommendationsScore,
        analyticalDepth: depthScore,
        analysisType: this.detectAnalysisType(processedText),
        wordCount: processedText.split(/\s+/).length,
      },
    };
  }

  private cleanupAnalysis(text: string): string {
    text = text.replace(/```json[\s\S]*?```/g, "");
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/\{[\s\S]*?\}/g, (match) => {
      if (match.includes('"') && match.includes(":")) return "";
      return match;
    });
    text = text.replace(/\n{3,}/g, "\n\n").trim();
    return this.formatAnalysisSections(text);
  }

  private formatAnalysisSections(text: string): string {
    const lines = text.split("\n");
    const formatted: string[] = [];
    let inSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() ?? "";
      const nextLine = lines[i + 1]?.trim() ?? "";
      const isSectionStart = this.isSectionStartLine(line, nextLine);

      if (isSectionStart) {
        if (inSection && formatted.length > 0) formatted.push("");
        formatted.push(line);
        inSection = true;
      } else {
        this.appendFormattedLine(formatted, line);
      }
    }

    return formatted.join("\n");
  }

  private isSectionStartLine(line: string, nextLine: string): boolean {
    return (
      this.isAnalysisSectionHeader(line) ||
      (!!/^\d+\./.exec(line) && !!nextLine && !/^\d+\./.exec(nextLine))
    );
  }

  private appendFormattedLine(formatted: string[], line: string): void {
    if (line) {
      formatted.push(line);
    } else if (formatted[formatted.length - 1] !== "") {
      formatted.push("");
    }
  }

  private isAnalysisSectionHeader(line: string): boolean {
    const headers = [
      "ملخص تنفيذي",
      "التحليل الجدلي",
      "الأطروحة",
      "النقيض",
      "التركيب",
      "السلامة الهيكلية",
      "نقاط القوة",
      "نقاط الضعف",
      "شبكة الشخصيات",
      "المؤثرون الرئيسيون",
      "الديناميكيات العلائقية",
      "التوصيات",
      "أولوية",
      "حرجة",
      "عالية",
      "متوسطة",
    ];
    return headers.some((header) => line.includes(header));
  }

  private assessStructuralAnalysis(text: string): number {
    let score = 0.6;
    const structuralTerms = [
      "بنية",
      "هيكل",
      "حبكة",
      "إيقاع",
      "مشهد",
      "اقتصاد",
      "ثغرة",
      "انتظام",
    ];
    if (structuralTerms.some((term) => text.includes(term))) score += 0.2;
    if (text.includes("قوة") || text.includes("ضعف")) score += 0.1;
    if (/\d+\./.exec(text)) score += 0.1;
    return Math.min(1, score);
  }

  private assessDialecticalAnalysis(text: string): number {
    let score = 0.5;
    const dialecticalTerms = ["أطروحة", "نقيض", "تركيب", "تناقض", "توتر"];
    if (dialecticalTerms.some((term) => text.includes(term))) score += 0.3;
    if (text.includes("تركيب") || text.includes("حل")) score += 0.2;
    return Math.min(1, score);
  }

  private assessRecommendations(text: string): number {
    let score = 0.5;
    if (text.includes("توصية") || text.includes("ينصح")) score += 0.2;
    if (["أولوية", "حرجة", "عالية", "متوسطة"].some((t) => text.includes(t)))
      score += 0.2;
    if (["يجب", "ينبغي", "يمكن", "اقترح"].some((t) => text.includes(t)))
      score += 0.1;
    return Math.min(1, score);
  }

  private assessAnalyticalDepth(text: string): number {
    let score = 0.5;
    if (text.length > 1000) score += 0.2;
    if (text.length > 2000) score += 0.2;
    const analyticalTerms = [
      "تحليل",
      "تقييم",
      "تفسير",
      "كشف",
      "استكشاف",
      "فحص",
    ];
    const analyticalCount = analyticalTerms.reduce(
      (count, term) => count + (text.split(term).length - 1),
      0,
    );
    score += Math.min(0.1, analyticalCount * 0.02);
    return Math.min(1, score);
  }

  private detectAnalysisType(text: string): string {
    if (text.includes("جدلي") || text.includes("أطروحة")) {
      return "تحليل جدلي";
    }
    if (text.includes("هيكلي") || text.includes("بنية")) {
      return "تحليل هيكلي";
    }
    if (text.includes("شخصيات") || text.includes("شبكة")) {
      return "تحليل شبكة الشخصيات";
    }
    return "تحليل شامل";
  }

  private generateAnalysisNotes(
    output: StandardAgentOutput,
    structuralScore: number,
    dialecticalScore: number,
    recommendationsScore: number,
    depthScore: number,
  ): string[] {
    const notes: string[] = [];
    if (output.confidence > 0.85) notes.push("ثقة عالية في التحليل");
    else if (output.confidence > 0.7) notes.push("ثقة جيدة");
    else notes.push("ثقة متوسطة - يُنصح بالمراجعة");

    if (structuralScore > 0.8) notes.push("تحليل هيكلي ممتاز");
    else if (structuralScore < 0.6) notes.push("يحتاج تحسين التحليل الهيكلي");
    if (dialecticalScore > 0.8) notes.push("تحليل جدلي عميق");
    if (recommendationsScore > 0.8) notes.push("توصيات قابلة للتطبيق");
    else if (recommendationsScore < 0.6) notes.push("يحتاج تحسين التوصيات");
    if (depthScore > 0.8) notes.push("عمق تحليلي ممتاز");

    if (output.notes)
      notes.push(...output.notes.filter((note) => !notes.includes(note)));
    return notes;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  private translateDepth(depth: string): string {
    const depths: Record<string, string> = {
      surface: "سطحي",
      moderate: "متوسط",
      deep: "عميق",
    };
    return depths[depth] ?? depth;
  }

  private summarizeAnalysis(analysis: unknown): string {
    if (typeof analysis === "string") {
      return analysis.length > 500
        ? analysis.substring(0, 500) + "..."
        : analysis;
    }

    const obj = analysis as Record<string, unknown>;
    const summary: string[] = [];

    if (obj?.["mainFindings"]) {
      summary.push(
        `النتائج الرئيسية: ${stringifySummaryValue(obj["mainFindings"])}`,
      );
    }

    if (obj?.["recommendations"]) {
      const recs =
        typeof obj["recommendations"] === "string"
          ? obj["recommendations"]
          : Array.isArray(obj["recommendations"])
            ? (obj["recommendations"] as string[]).join(", ")
            : "توصيات متوفرة";
      summary.push(`التوصيات: ${recs}`);
    }

    if (obj?.["strengths"]) {
      summary.push(`نقاط القوة: ${stringifySummaryValue(obj["strengths"])}`);
    }

    if (obj?.["weaknesses"]) {
      summary.push(`نقاط الضعف: ${stringifySummaryValue(obj["weaknesses"])}`);
    }

    return summary.join("\n") || "تحليل سابق متوفر";
  }

  protected override async getFallbackResponse(
    _input: StandardAgentInput,
  ): Promise<string> {
    await Promise.resolve();
    return ANALYSIS_FALLBACK_RESPONSE;
  }
}

// Export singleton instance
export const analysisAgent = new AnalysisAgent();
