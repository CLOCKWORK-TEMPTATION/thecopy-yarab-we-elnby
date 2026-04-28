import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { TARGET_AUDIENCE_ANALYZER_AGENT_CONFIG } from "./agent";
import { TARGET_AUDIENCE_ANALYZER_INSTRUCTIONS } from "./instructions";

/**
 * Target Audience Analyzer Agent - وكيل محلل الجمهور المستهدف
 * الوحدة 9 - بوصلة الجمهور الذكية
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON
 */
export class TargetAudienceAnalyzerAgent extends BaseAgent {
  constructor() {
    super(
      "AudienceCompass AI",
      TaskType.TARGET_AUDIENCE_ANALYZER,
      TARGET_AUDIENCE_ANALYZER_AGENT_CONFIG.systemPrompt ?? ""
    );

    // Set agent-specific confidence floor
    this.confidenceFloor = 0.83;
  }

  /**
   * Build prompt for target audience analysis
   */
  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;

    // Extract relevant context
    const contextObj =
      typeof context === "object" && context !== null ? context : {};
    const originalText = (contextObj?.["originalText"] as string) || "";
    const genre = (contextObj?.["genre"] as string) || "";
    const themes = (contextObj?.["themes"] as string[]) || [];
    const previousAnalysis = (contextObj?.["previousAnalysis"] as string) || "";

    // Build structured prompt
    let prompt = `${TARGET_AUDIENCE_ANALYZER_INSTRUCTIONS}\n\n`;
    prompt += `[مهمة محلل الجمهور المستهدف - AudienceCompass AI]\n\n`;

    // Add original text
    if (originalText) {
      prompt += `النص الأصلي للتحليل:\n${originalText}\n\n`;
    }

    // Add genre context
    if (genre) {
      prompt += `نوع العمل: ${genre}\n\n`;
    }

    // Add themes if available
    if (themes.length > 0) {
      prompt += `الموضوعات الرئيسية:\n`;
      themes.forEach((theme, index) => {
        prompt += `${index + 1}. ${theme}\n`;
      });
      prompt += "\n";
    }

    // Add previous analysis if available
    if (previousAnalysis) {
      prompt += `تحليلات سابقة ذات صلة:\n${previousAnalysis}\n\n`;
    }

    // Add the specific task
    prompt += `المهمة المحددة:\n${taskInput}\n\n`;

    // Add generation instructions
    prompt += `قدم تحليلاً شاملاً للجمهور المستهدف يتضمن:

1. **تحديد الجمهور الأساسي والثانوي:**
   - الفئة العمرية المستهدفة
   - الخصائص الديموغرافية
   - الاهتمامات والميول

2. **تحليل التوقعات:**
   - ماذا يتوقع الجمهور من هذا النوع من الأعمال؟
   - كيف يلبي النص هذه التوقعات أو يتحداها؟

3. **عوامل الجذب:**
   - ما الذي سيجذب الجمهور المستهدف؟
   - نقاط القوة في العمل من منظور الجمهور

4. **المحتوى الحساس:**
   - أي عناصر قد تكون حساسة لشرائح معينة
   - اقتراحات للتعامل معها

5. **القابلية التسويقية:**
   - تقييم الجاذبية التجارية
   - زوايا تسويقية محتملة

اكتب بلغة عربية فصحى واضحة، مع تنظيم المحتوى بعناوين واضحة ونقاط محددة.
لا تستخدم تنسيق JSON أو كتل برمجية.`;

    return prompt;
  }

  /**
   * Post-process the audience analysis output
   */
  protected override postProcess(
    output: StandardAgentOutput
  ): StandardAgentOutput {
    // Clean up text formatting
    const processedText = this.cleanupText(output.text);

    // Assess analysis quality
    const qualityMetrics = this.assessAnalysisQuality(processedText);

    // Adjust confidence based on quality
    const adjustedConfidence =
      output.confidence * 0.6 +
      qualityMetrics.demographicCoverage * 0.15 +
      qualityMetrics.psychographicDepth * 0.15 +
      qualityMetrics.marketInsights * 0.1;

    return {
      ...output,
      text: processedText,
      confidence: Math.min(1, adjustedConfidence),
      notes: this.generateAnalysisNotes(output, qualityMetrics),
      metadata: {
        ...output.metadata,
        audienceAnalysisQuality: qualityMetrics,
        demographicCoverage: qualityMetrics.demographicCoverage,
        psychographicDepth: qualityMetrics.psychographicDepth,
        marketInsights: qualityMetrics.marketInsights,
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
   * Assess the quality of audience analysis
   */
  private assessAnalysisQuality(text: string): {
    demographicCoverage: number;
    psychographicDepth: number;
    marketInsights: number;
    overallScore: number;
  } {
    // Demographic indicators
    const demographicTerms = [
      "الفئة العمرية",
      "العمر",
      "الجنس",
      "التعليم",
      "الدخل",
      "المنطقة",
      "الموقع الجغرافي",
      "الحالة الاجتماعية",
    ];
    const demographicCoverage = this.calculateCoverage(text, demographicTerms);

    // Psychographic indicators
    const psychographicTerms = [
      "الاهتمامات",
      "القيم",
      "نمط الحياة",
      "الشخصية",
      "الدوافع",
      "التفضيلات",
      "السلوك",
      "العادات",
    ];
    const psychographicDepth = this.calculateCoverage(text, psychographicTerms);

    // Market insight indicators
    const marketTerms = [
      "السوق",
      "التسويق",
      "المنافسة",
      "الجاذبية",
      "التجارية",
      "الوصول",
      "الانتشار",
      "الفرصة",
    ];
    const marketInsights = this.calculateCoverage(text, marketTerms);

    const overallScore =
      (demographicCoverage + psychographicDepth + marketInsights) / 3;

    return {
      demographicCoverage,
      psychographicDepth,
      marketInsights,
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
   * Generate notes about the analysis
   */
  private generateAnalysisNotes(
    output: StandardAgentOutput,
    qualityMetrics: {
      demographicCoverage: number;
      psychographicDepth: number;
      marketInsights: number;
      overallScore: number;
    }
  ): string[] {
    const notes: string[] = [];

    // Confidence assessment
    if (output.confidence > 0.85) {
      notes.push("ثقة عالية في تحليل الجمهور المستهدف");
    } else if (output.confidence > 0.7) {
      notes.push("ثقة جيدة في التحليل");
    } else {
      notes.push("ثقة متوسطة - يُنصح بمراجعة إضافية");
    }

    // Demographic coverage
    if (qualityMetrics.demographicCoverage > 0.7) {
      notes.push("تغطية ديموغرافية شاملة");
    } else if (qualityMetrics.demographicCoverage < 0.4) {
      notes.push("يمكن تعزيز التحليل الديموغرافي");
    }

    // Psychographic depth
    if (qualityMetrics.psychographicDepth > 0.7) {
      notes.push("تحليل سيكوغرافي عميق");
    } else if (qualityMetrics.psychographicDepth < 0.4) {
      notes.push("يمكن تعميق التحليل النفسي للجمهور");
    }

    // Market insights
    if (qualityMetrics.marketInsights > 0.7) {
      notes.push("رؤى تسويقية قيمة");
    }

    // Add original notes
    if (output.notes) {
      notes.push(...output.notes);
    }

    return notes;
  }

  /**
   * Generate fallback response specific to audience analysis
   */
  protected override getFallbackResponse(input: StandardAgentInput): string {
    const contextObj =
      typeof input.context === "object" && input.context !== null
        ? input.context
        : {};
    const genre = (contextObj?.["genre"] as string) || "غير محدد";

    return `تحليل الجمهور المستهدف:

بناءً على النص المقدم من نوع "${genre}"، يمكن تحديد الملامح الأولية للجمهور المستهدف:

**الجمهور الأساسي المتوقع:**
- فئة عمرية واسعة تتراوح بين 18-45 عاماً
- اهتمامات متنوعة في الأدب والدراما
- ميل للمحتوى العربي الأصيل

**نقاط الجذب المحتملة:**
- القصة والشخصيات
- الموضوعات المطروحة
- جودة السرد

**توصية:**
لتحليل أكثر دقة، يُنصح بتفعيل الخيارات المتقدمة وتوفير سياق إضافي حول العمل.

ملاحظة: حدث خطأ تقني مؤقت. يُرجى المحاولة مرة أخرى.`;
  }
}

// Export singleton instance
export const targetAudienceAnalyzerAgent = new TargetAudienceAnalyzerAgent();
