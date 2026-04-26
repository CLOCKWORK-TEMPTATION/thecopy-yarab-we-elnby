import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { ANALYSIS_AGENT_CONFIG } from "./agent";

interface AnalysisContext {
  originalText?: string;
  previousAnalysis?: any;
  targetAudience?: string;
  genre?: string;
  analysisDepth?: "surface" | "moderate" | "deep";
  focusAreas?: string[];
}

/**
 * Analysis Agent - وكيل التحليل النقدي المعماري
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON
 */
export class AnalysisAgent extends BaseAgent {
  constructor() {
    super(
      "CritiqueArchitect AI",
      TaskType.ANALYSIS,
      ANALYSIS_AGENT_CONFIG.systemPrompt ?? ""
    );

    // Set agent-specific confidence floor
    this.confidenceFloor = 0.85;
  }

  /**
   * Build prompt for critical analysis
   */
  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;

    // Extract relevant context
    const ctx = context as AnalysisContext;
    const originalText = ctx?.originalText ?? "";
    const previousAnalysis = ctx?.previousAnalysis ?? null;
    const targetAudience = ctx?.targetAudience ?? "";
    const genre = ctx?.genre ?? "";
    const analysisDepth = ctx?.analysisDepth ?? "moderate";
    const focusAreas = ctx?.focusAreas ?? [];

    // Build structured prompt
    let prompt = `مهمة التحليل النقدي المعماري\n\n`;

    // Add original text
    if (originalText) {
      prompt += `النص المراد تحليله:\n${this.truncateText(originalText, 2000)}\n\n`;
    }

    // Add genre and audience context
    if (genre) {
      prompt += `النوع الأدبي: ${genre}\n`;
    }
    if (targetAudience) {
      prompt += `الجمهور المستهدف: ${targetAudience}\n`;
    }
    prompt += `عمق التحليل المطلوب: ${this.translateDepth(analysisDepth)}\n\n`;

    // Add focus areas if specified
    if (focusAreas.length > 0) {
      prompt += `مجالات التركيز:\n`;
      focusAreas.forEach((area, index) => {
        prompt += `${index + 1}. ${area}\n`;
      });
      prompt += "\n";
    }

    // Add previous analysis if available
    if (previousAnalysis) {
      prompt += `تحليل سابق:\n${this.summarizeAnalysis(previousAnalysis)}\n\n`;
    }

    // Add specific task
    prompt += `المهمة المطلوبة:\n${taskInput}\n\n`;

    // Add analytical methodology instructions
    prompt += `التعليمات المنهجية:

1. **التحليل الجدلي (Dialectical Deconstruction)**:
   - حدد الأطروحة المركزية للنص
   - اكتشف النقيض أو التناقضات الداخلية
   - قدم التركيب الذي يفسر التوتر المركزي

2. **التحليل الشعاعي (Vectorial Analysis)**:
   - تتبع مسارات المفاهيم الرئيسية (مثل: القوة، الحرية، الخيانة)
   - حدد الحقول الدلالية والأنماط
   - اكتشف المجموعات الموضوعية والفراغات المفاهيمية

3. **تقييم السلامة الهيكلية (Structural Integrity Assessment)**:
   - حلل بنية السرد: هيكل الحبكة، الإيقاع، اقتصاد المشاهد
   - حدد نقاط القوة الهيكلية
   - اكتشف العيوب الهيكلية، ثغرات الحبكة، أو عدم انتظام الإيقاع

4. **ديناميكيات شبكة الشخصيات (Character Network Dynamics)**:
   - قيّم شبكة العلاقات بين الشخصيات
   - حدد العقد الرئيسية والتأثيرات ونقاط الاحتكاك
   - قيّم الأصالة والعمق النفسي للشخصيات الفردية

5. **توليد التوصيات القابلة للتطبيق**:
   - قدم توصيات ملموسة ومُحددة الأولوية
   - اربط كل توصية بنقطة تحليلية محددة
   - رتّب التوصيات حسب الأولوية (حرجة، عالية، متوسطة)

**تنسيق المخرجات:**
- ابدأ بملخص تنفيذي موجز (2-3 جمل)
- قدم التحليل الجدلي (الأطروحة، النقيض، التركيب)
- قدم تحليل السلامة الهيكلية (نقاط القوة والضعف)
- قدم تحليل شبكة الشخصيات (المؤثرون الرئيسيون، الديناميكيات العلائقية)
- اختتم بتوصيات قابلة للتطبيق مُرتّبة حسب الأولوية

**مهم:** اكتب تحليلاً نصياً واضحاً ومباشراً. لا تستخدم JSON أو تنسيقات البرمجة. استخدم لغة عربية فصحى مع الحفاظ على الطابع المهني والسلطة النقدية.`;

    return prompt;
  }

  /**
   * Post-process the analysis output
   */
  protected override async postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
    // Clean up the analysis text
    const processedText = this.cleanupAnalysis(output.text);

    // Assess analysis quality
    const structuralScore = await this.assessStructuralAnalysis(processedText);
    const dialecticalScore =
      await this.assessDialecticalAnalysis(processedText);
    const recommendationsScore =
      await this.assessRecommendations(processedText);
    const depthScore = await this.assessAnalyticalDepth(processedText);

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
        depthScore
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

  /**
   * Clean up analysis formatting
   */
  private cleanupAnalysis(text: string): string {
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
    text = this.formatAnalysisSections(text);

    return text;
  }

  /**
   * Format analysis sections
   */
  private formatAnalysisSections(text: string): string {
    const lines = text.split("\n");
    const formatted: string[] = [];
    let inSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() ?? "";
      const nextLine = lines[i + 1]?.trim() ?? "";

      // Detect section headers
      if (
        this.isAnalysisSectionHeader(line) ||
        (/^\d+\./.exec(line) && nextLine && !/^\d+\./.exec(nextLine))
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
   * Check if line is an analysis section header
   */
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

  /**
   * Assess structural analysis quality
   */
  private async assessStructuralAnalysis(text: string): Promise<number> {
    let score = 0.6; // Base score

    // Check for structural elements
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
    const hasStructuralTerms = structuralTerms.some((term) =>
      text.includes(term)
    );
    if (hasStructuralTerms) score += 0.2;

    // Check for strengths and weaknesses
    if (text.includes("قوة") || text.includes("ضعف")) {
      score += 0.1;
    }

    // Check for specific examples
    if (/\d+\./.exec(text)) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * Assess dialectical analysis quality
   */
  private async assessDialecticalAnalysis(text: string): Promise<number> {
    let score = 0.5; // Base score

    // Check for dialectical elements
    const dialecticalTerms = ["أطروحة", "نقيض", "تركيب", "تناقض", "توتر"];
    const hasDialecticalTerms = dialecticalTerms.some((term) =>
      text.includes(term)
    );
    if (hasDialecticalTerms) score += 0.3;

    // Check for synthesis
    if (text.includes("تركيب") || text.includes("حل")) {
      score += 0.2;
    }

    return Math.min(1, score);
  }

  /**
   * Assess recommendations quality
   */
  private async assessRecommendations(text: string): Promise<number> {
    let score = 0.5; // Base score

    // Check for recommendations
    if (text.includes("توصية") || text.includes("ينصح")) {
      score += 0.2;
    }

    // Check for prioritization
    if (
      text.includes("أولوية") ||
      text.includes("حرجة") ||
      text.includes("عالية") ||
      text.includes("متوسطة")
    ) {
      score += 0.2;
    }

    // Check for actionable language
    const actionableTerms = ["يجب", "ينبغي", "يمكن", "اقترح"];
    const hasActionableTerms = actionableTerms.some((term) =>
      text.includes(term)
    );
    if (hasActionableTerms) score += 0.1;

    return Math.min(1, score);
  }

  /**
   * Assess analytical depth
   */
  private async assessAnalyticalDepth(text: string): Promise<number> {
    let score = 0.5; // Base score

    // Check text length (longer analysis usually means more depth)
    if (text.length > 1000) score += 0.2;
    if (text.length > 2000) score += 0.2;

    // Check for analytical vocabulary
    const analyticalTerms = [
      "تحليل",
      "تقييم",
      "تفسير",
      "كشف",
      "استكشاف",
      "فحص",
    ];
    const analyticalCount = analyticalTerms.reduce((count, term) => {
      return count + (text.split(term).length - 1);
    }, 0);
    score += Math.min(0.1, analyticalCount * 0.02);

    return Math.min(1, score);
  }

  /**
   * Detect analysis type
   */
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

  /**
   * Generate analysis notes
   */
  private generateAnalysisNotes(
    output: StandardAgentOutput,
    structuralScore: number,
    dialecticalScore: number,
    recommendationsScore: number,
    depthScore: number
  ): string[] {
    const notes: string[] = [];

    // Overall confidence
    if (output.confidence > 0.85) {
      notes.push("ثقة عالية في التحليل");
    } else if (output.confidence > 0.7) {
      notes.push("ثقة جيدة");
    } else {
      notes.push("ثقة متوسطة - يُنصح بالمراجعة");
    }

    // Structural analysis
    if (structuralScore > 0.8) {
      notes.push("تحليل هيكلي ممتاز");
    } else if (structuralScore < 0.6) {
      notes.push("يحتاج تحسين التحليل الهيكلي");
    }

    // Dialectical analysis
    if (dialecticalScore > 0.8) {
      notes.push("تحليل جدلي عميق");
    }

    // Recommendations
    if (recommendationsScore > 0.8) {
      notes.push("توصيات قابلة للتطبيق");
    } else if (recommendationsScore < 0.6) {
      notes.push("يحتاج تحسين التوصيات");
    }

    // Depth
    if (depthScore > 0.8) {
      notes.push("عمق تحليلي ممتاز");
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
   * Translate analysis depth
   */
  private translateDepth(depth: string): string {
    const depths: Record<string, string> = {
      surface: "سطحي",
      moderate: "متوسط",
      deep: "عميق",
    };
    return depths[depth] ?? depth;
  }

  /**
   * Summarize previous analysis
   */
  private summarizeAnalysis(analysis: any): string {
    if (typeof analysis === "string") {
      return analysis.length > 500
        ? analysis.substring(0, 500) + "..."
        : analysis;
    }

    const summary: string[] = [];

    if (analysis?.mainFindings) {
      summary.push(`النتائج الرئيسية: ${analysis.mainFindings}`);
    }

    if (analysis?.recommendations) {
      const recs =
        typeof analysis.recommendations === "string"
          ? analysis.recommendations
          : Array.isArray(analysis.recommendations)
            ? analysis.recommendations.join(", ")
            : "توصيات متوفرة";
      summary.push(`التوصيات: ${recs}`);
    }

    if (analysis?.strengths) {
      summary.push(`نقاط القوة: ${analysis.strengths}`);
    }

    if (analysis?.weaknesses) {
      summary.push(`نقاط الضعف: ${analysis.weaknesses}`);
    }

    return summary.join("\n") || "تحليل سابق متوفر";
  }

  /**
   * Generate fallback response
   */
  protected override async getFallbackResponse(
    _input: StandardAgentInput
  ): Promise<string> {
    return `تحليل نقدي معماري:
تم إجراء تحليل أولي للنص المقدم باستخدام المنهجية الجدلية والتحليل الشعاعي.

النتائج الأولية:
- يحتاج النص إلى تحليل أعمق للبنية الهيكلية
- يمكن تحسين ديناميكيات الشخصيات
- هناك فرص لتعزيز التوتر الدرامي

التوصيات:
1. (حرجة) مراجعة هيكل الحبكة الرئيسية
2. (عالية) تطوير عمق الشخصيات الرئيسية
3. (متوسطة) تحسين الإيقاع السردي

ملاحظة: حدث خطأ مؤقت في معالجة التحليل. يُرجى المحاولة مرة أخرى أو تفعيل الخيارات المتقدمة للحصول على تحليل أكثر عمقاً ودقة.`;
  }
}

// Export singleton instance
export const analysisAgent = new AnalysisAgent();
