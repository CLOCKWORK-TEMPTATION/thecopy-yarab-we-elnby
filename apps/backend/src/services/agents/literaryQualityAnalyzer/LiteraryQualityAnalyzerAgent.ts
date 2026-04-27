import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { LITERARY_QUALITY_ANALYZER_AGENT_CONFIG } from "./agent";
import { LITERARY_QUALITY_ANALYZER_INSTRUCTIONS } from "./instructions";

/**
 * Literary Quality Analyzer Agent - وكيل محلل الجودة الأدبية
 * الوحدة 10 - قاضي الجماليات الأدبية
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON
 */
export class LiteraryQualityAnalyzerAgent extends BaseAgent {
  constructor() {
    super(
      "AestheticsJudge AI",
      TaskType.LITERARY_QUALITY_ANALYZER,
      LITERARY_QUALITY_ANALYZER_AGENT_CONFIG.systemPrompt ?? ""
    );

    // Set agent-specific confidence floor (high due to critical nature)
    this.confidenceFloor = 0.88;
  }

  /**
   * Build prompt for literary quality analysis
   */
  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;
    const ctx = this.extractLiteraryContext(context);

    let prompt = `${LITERARY_QUALITY_ANALYZER_INSTRUCTIONS}\n\n`;
    prompt += `[مهمة محلل الجودة الأدبية - AestheticsJudge AI]\n\n`;
    prompt += this.buildLiteraryContextSection(ctx);
    prompt += `المهمة المحددة:\n${taskInput}\n\n`;
    prompt += this.buildLiteraryInstructions();

    return prompt;
  }

  /**
   * Extract literary quality context from input
   */
  private extractLiteraryContext(context: StandardAgentInput["context"]): {
    originalText: string;
    styleAnalysis: string;
    thematicAnalysis: string;
    previousStations: Record<string, string>;
  } {
    const contextObj =
      typeof context === "object" && context !== null ? context : {};
    const ctx = contextObj;
    return {
      originalText: (ctx["originalText"] as string) || "",
      styleAnalysis: (ctx["styleAnalysis"] as string) || "",
      thematicAnalysis: (ctx["thematicAnalysis"] as string) || "",
      previousStations: (ctx["previousStations"] as Record<string, string>) || {},
    };
  }

  /**
   * Build context section for literary quality prompt
   */
  private buildLiteraryContextSection(ctx: {
    originalText: string;
    styleAnalysis: string;
    thematicAnalysis: string;
    previousStations: Record<string, string>;
  }): string {
    let section = "";

    if (ctx.originalText) {
      section += `النص الأصلي للتقييم:\n${ctx.originalText}\n\n`;
    }

    if (ctx.styleAnalysis) {
      section += `تحليل الأسلوب السابق:\n${ctx.styleAnalysis}\n\n`;
    }

    if (ctx.thematicAnalysis) {
      section += `التحليل الموضوعي:\n${ctx.thematicAnalysis}\n\n`;
    }

    if (Object.keys(ctx.previousStations).length > 0) {
      section += `سياق التحليلات السابقة:\n`;
      for (const [station, analysis] of Object.entries(ctx.previousStations)) {
        if (analysis) {
          section += `- ${station}: ${String(analysis).substring(0, 300)}...\n`;
        }
      }
      section += "\n";
    }

    return section;
  }

  /**
   * Build literary quality evaluation instructions
   */
  private buildLiteraryInstructions(): string {
    return `قدم تقييماً أدبياً شاملاً يتضمن خمسة محاور أساسية:

1. **الجمال اللغوي والبلاغي:**
   - تقييم استخدام اللغة والأساليب البلاغية
   - تحليل بنية الجمل والإيقاع اللغوي
   - تقييم الصور البيانية والاستعارات

2. **الأصالة والابتكار الأسلوبي:**
   - تقييم تفرد الصوت الأدبي
   - كشف الكليشيهات والعبارات المبتذلة
   - تحديد عناصر الابتكار الأسلوبي

3. **التماسك السردي والبنيوي:**
   - تقييم سلامة الحبكة
   - تحليل الإيقاع والتدفق السردي
   - تقييم البنية الدرامية العامة

4. **التأثير العاطفي والفني:**
   - تقييم القدرة على إثارة المشاعر
   - تحديد اللحظات العاطفية المؤثرة
   - قياس عمق الصدى العاطفي

5. **المقارنة بالمعايير الأدبية:**
   - موقع العمل من المعايير الأدبية العالمية
   - نقاط القوة والضعف مقارنة بأعمال مشابهة
   - تقييم شامل للجودة الأدبية

قدم درجة تقييم (من 10) لكل محور مع تبرير واضح.
اكتب بلغة نقدية موضوعية ومهنية.
لا تستخدم تنسيق JSON أو كتل برمجية.`;
  }

  /**
   * Post-process the literary quality output
   */
  protected override postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
    // Clean up text formatting
    const processedText = this.cleanupText(output.text);

    // Assess evaluation quality
    const qualityMetrics = this.assessEvaluationQuality(processedText);

    // Adjust confidence based on quality
    const adjustedConfidence =
      output.confidence * 0.5 +
      qualityMetrics.linguisticDepth * 0.15 +
      qualityMetrics.criticalRigor * 0.2 +
      qualityMetrics.comprehensiveness * 0.15;

    return Promise.resolve({
      ...output,
      text: processedText,
      confidence: Math.min(1, adjustedConfidence),
      notes: this.generateEvaluationNotes(output, qualityMetrics),
      metadata: {
        ...output.metadata,
        literaryEvaluationQuality: qualityMetrics,
        linguisticDepth: qualityMetrics.linguisticDepth,
        criticalRigor: qualityMetrics.criticalRigor,
        comprehensiveness: qualityMetrics.comprehensiveness,
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

  /**
   * Assess the quality of literary evaluation
   */
  /** Linguistic analysis indicator terms */
  private static readonly LINGUISTIC_TERMS = [
    "استعارة", "تشبيه", "كناية", "بلاغة", "أسلوب",
    "إيقاع", "جملة", "تركيب", "صورة بيانية", "سجع", "جناس",
  ];

  /** Critical rigor indicator terms */
  private static readonly CRITICAL_TERMS = [
    "تقييم", "تحليل", "نقد", "ملاحظة", "قوة",
    "ضعف", "مقارنة", "معيار", "موضوعي", "دليل",
  ];

  /** Comprehensiveness indicator terms (five pillars) */
  private static readonly PILLAR_TERMS = [
    "لغوي", "بلاغي", "أصالة", "ابتكار", "تماسك",
    "سردي", "عاطفي", "فني", "معايير",
  ];

  private assessEvaluationQuality(text: string): {
    linguisticDepth: number;
    criticalRigor: number;
    comprehensiveness: number;
    overallScore: number;
  } {
    const linguisticDepth = this.calculateCoverage(text, LiteraryQualityAnalyzerAgent.LINGUISTIC_TERMS);
    const criticalRigor = this.calculateCoverage(text, LiteraryQualityAnalyzerAgent.CRITICAL_TERMS);
    const comprehensiveness = this.calculateCoverage(text, LiteraryQualityAnalyzerAgent.PILLAR_TERMS);
    const overallScore = (linguisticDepth + criticalRigor + comprehensiveness) / 3;

    return { linguisticDepth, criticalRigor, comprehensiveness, overallScore };
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
   * Check for clichés in text
   */
  private detectClicheAnalysis(text: string): boolean {
    const clicheIndicators = [
      "كليشيه",
      "مبتذل",
      "مكرر",
      "نمطي",
      "تقليدي",
      "شائع",
    ];

    return clicheIndicators.some((indicator) =>
      text.toLowerCase().includes(indicator)
    );
  }

  /**
   * Generate notes about the evaluation
   */
  private generateEvaluationNotes(
    output: StandardAgentOutput,
    qualityMetrics: {
      linguisticDepth: number;
      criticalRigor: number;
      comprehensiveness: number;
      overallScore: number;
    }
  ): string[] {
    const notes: string[] = [];

    // Confidence assessment
    if (output.confidence > 0.9) {
      notes.push("ثقة عالية في التقييم الأدبي");
    } else if (output.confidence > 0.75) {
      notes.push("ثقة جيدة في التقييم");
    } else {
      notes.push("ثقة متوسطة - يُنصح بمراجعة نقدية إضافية");
    }

    // Linguistic depth
    if (qualityMetrics.linguisticDepth > 0.7) {
      notes.push("تحليل لغوي وبلاغي عميق");
    } else if (qualityMetrics.linguisticDepth < 0.4) {
      notes.push("يمكن تعزيز التحليل اللغوي");
    }

    // Critical rigor
    if (qualityMetrics.criticalRigor > 0.7) {
      notes.push("دقة نقدية عالية");
    } else if (qualityMetrics.criticalRigor < 0.4) {
      notes.push("يمكن تعميق الحجج النقدية");
    }

    // Comprehensiveness
    if (qualityMetrics.comprehensiveness > 0.8) {
      notes.push("تغطية شاملة للمحاور الخمسة");
    }

    // Cliché detection
    if (this.detectClicheAnalysis(output.text)) {
      notes.push("تم تضمين تحليل الكليشيهات");
    }

    // Add original notes
    if (output.notes) {
      notes.push(...output.notes);
    }

    return notes;
  }

  /**
   * Generate fallback response specific to literary quality analysis
   */
  protected override getFallbackResponse(
    _input: StandardAgentInput
  ): Promise<string> {
    return Promise.resolve(`التقييم الأدبي الأولي:

بناءً على النص المقدم، يمكن تقديم ملاحظات أولية حول الجودة الأدبية:

**1. الجمال اللغوي والبلاغي:**
- النص يحتاج إلى تحليل أعمق للأساليب البلاغية المستخدمة
- تقييم أولي: يتطلب مراجعة تفصيلية

**2. الأصالة والابتكار:**
- يحتاج تقييم مدى تفرد الصوت الأدبي
- ضرورة فحص العناصر المبتذلة إن وجدت

**3. التماسك السردي:**
- تقييم مبدئي للبنية الدرامية
- يتطلب تحليلاً أعمق للإيقاع والتدفق

**4. التأثير العاطفي:**
- تحديد نقاط التأثير العاطفي الرئيسية
- قياس الصدى العاطفي المتوقع

**5. المعايير الأدبية:**
- مقارنة أولية بالمعايير المعروفة
- تحديد موقع العمل من الجودة الأدبية العامة

**توصية:**
للحصول على تقييم أدبي شامل ودقيق، يُنصح بتفعيل جميع خيارات التحليل المتقدمة.

ملاحظة: حدث خطأ تقني مؤقت. يُرجى المحاولة مرة أخرى.`);
  }
}

// Export singleton instance
export const literaryQualityAnalyzerAgent = new LiteraryQualityAnalyzerAgent();
