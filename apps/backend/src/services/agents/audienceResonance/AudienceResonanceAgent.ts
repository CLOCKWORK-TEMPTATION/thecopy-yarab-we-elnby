import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { AUDIENCE_RESONANCE_AGENT_CONFIG } from "./agent";
import { RESONANCE_ANALYSIS_INSTRUCTIONS } from "./instructions";

interface AudienceResonanceContext {
  originalText?: string;
  analysisReport?: Record<string, unknown>;
  targetAudience?: {
    demographics?: {
      ageRange?: string;
      gender?: string;
      education?: string;
      culturalBackground?: string;
      socioeconomicStatus?: string;
    };
    psychographics?: {
      values?: string[];
      interests?: string[];
      lifestyle?: string;
      emotionalTriggers?: string[];
    };
    preferences?: {
      genrePreferences?: string[];
      contentStyle?: string;
      complexity?: string;
    };
  };
  contentType?: string;
  platform?: string;
  previousResponses?: {
    audienceSegment: string;
    response: string;
    resonanceScore: number;
  }[];
}

/** Audience Resonance Agent - وكيل مصفوفة التعاطف الجماهيري */
export class AudienceResonanceAgent extends BaseAgent {
  constructor() {
    super(
      "EmpathyMatrix AI",
      TaskType.AUDIENCE_RESONANCE,
      AUDIENCE_RESONANCE_AGENT_CONFIG.systemPrompt ?? "",
    );

    // Set agent-specific confidence floor
    this.confidenceFloor = 0.75;
  }

  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;
    const ctx = context as AudienceResonanceContext;

    let prompt = `[مهمة تحليل الصدى الجماهيري]\n\n`;
    prompt += this.buildContentSection(ctx);
    prompt += this.buildAudienceSection(ctx?.targetAudience);
    prompt += `نوع المحتوى: ${ctx?.contentType ?? "محتوى درامي"}\n`;
    prompt += `المنصة: ${ctx?.platform ?? "غير محدد"}\n\n`;
    prompt += this.buildPreviousResponsesSection(ctx?.previousResponses ?? []);
    prompt += `المهمة المطلوبة:\n${taskInput}\n\n`;
    prompt += this.getResonanceInstructions();

    return prompt;
  }

  private buildContentSection(
    ctx: AudienceResonanceContext | undefined,
  ): string {
    const originalText = ctx?.originalText ?? "";
    if (!originalText) return "";
    return `المحتوى المراد تحليله:\n${originalText.substring(0, 2000)}\n\n`;
  }

  private buildAudienceSection(
    targetAudience: AudienceResonanceContext["targetAudience"],
  ): string {
    if (!targetAudience) return "";
    return `معلومات الجمهور المستهدف:\n${this.formatAudienceProfile(targetAudience)}\n\n`;
  }

  private buildPreviousResponsesSection(
    previousResponses: NonNullable<
      AudienceResonanceContext["previousResponses"]
    >,
  ): string {
    if (previousResponses.length === 0) return "";
    let section = `أنماط الاستجابة السابقة:\n`;
    previousResponses.slice(0, 3).forEach((response, index) => {
      section += `${index + 1}. ${response.audienceSegment}: ${response.response} (صدى: ${response.resonanceScore}/10)\n`;
    });
    return section + "\n";
  }

  private getResonanceInstructions(): string {
    return RESONANCE_ANALYSIS_INSTRUCTIONS;
  }

  protected override async postProcess(
    output: StandardAgentOutput,
  ): Promise<StandardAgentOutput> {
    await Promise.resolve();
    // Clean up the analysis text
    const processedText = this.cleanupAnalysis(output.text);

    // Assess analysis quality
    const comprehensiveness = this.assessComprehensiveness(processedText);
    const insightDepth = this.assessInsightDepth(processedText);
    const actionability = this.assessActionability(processedText);

    // Calculate adjusted confidence
    const adjustedConfidence =
      output.confidence * 0.5 +
      comprehensiveness * 0.25 +
      insightDepth * 0.15 +
      actionability * 0.1;

    return {
      ...output,
      text: processedText,
      confidence: adjustedConfidence,
      notes: this.generateAnalysisNotes(
        output,
        comprehensiveness,
        insightDepth,
        actionability,
      ),
      metadata: {
        ...output.metadata,
        comprehensiveness,
        insightDepth,
        actionability,
        analysisType: this.detectAnalysisType(processedText),
        wordCount: processedText.split(/\s+/).length,
      },
    };
  }

  private cleanupAnalysis(text: string): string {
    // Remove JSON artifacts
    text = text.replace(/```json[\s\S]*?```/g, "");
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/\{[\s\S]*?\}/g, (match) => {
      if (match.includes('"') && match.includes(":")) return "";
      return match;
    });

    // Remove excessive whitespace
    text = text.replace(/\n{3,}/g, "\n\n");
    text = text.trim();

    // Structure the output
    const structured = this.structureAnalysis(text);

    return structured || text;
  }

  private structureAnalysis(text: string): string {
    const lines = text.split("\n");
    const structured: string[] = [];

    let currentSection = "";
    for (const line of lines) {
      const trimmed = line.trim();

      // Detect section headers
      if (this.isSectionHeader(trimmed)) {
        if (currentSection) {
          structured.push(currentSection.trim());
          structured.push("");
        }
        currentSection = trimmed + "\n";
      } else if (trimmed) {
        currentSection += trimmed + "\n";
      }
    }

    if (currentSection) {
      structured.push(currentSection.trim());
    }

    return structured.join("\n\n");
  }

  private isSectionHeader(line: string): boolean {
    const headers = [
      "تقييم الصدى العاطفي",
      "التحليل النفسي الاجتماعي",
      "النقاط الحرجة",
      "توقعات الاستجابة",
      "التوصيات",
      "المخاطر والفرص",
      "الخلاصة",
      "ملخص",
    ];
    return (
      headers.some((h) => line.includes(h)) ||
      /^#+\s/.test(line) ||
      /^\*\*\d+\./.test(line) ||
      /^[١-٩]\.\s\*\*/.test(line)
    );
  }

  private assessComprehensiveness(text: string): number {
    let score = 0.5;
    const requiredSections = ["عاطفي", "نفسي", "استجابة", "توصيات", "مخاطر"];
    const sectionsFound = requiredSections.filter((s) =>
      text.includes(s),
    ).length;
    score += (sectionsFound / requiredSections.length) * 0.3;
    if (text.length > 800) score += 0.1;
    if (text.length > 1500) score += 0.1;
    return Math.min(1, score);
  }

  private assessInsightDepth(text: string): number {
    let score = 0.5;
    const analyticalWords = [
      "يرتبط",
      "يعكس",
      "يشير",
      "يكشف",
      "يظهر",
      "نتيجة",
      "سبب",
      "تأثير",
      "علاقة",
      "نمط",
      "ديناميكية",
      "آلية",
    ];
    score += Math.min(
      0.3,
      analyticalWords.filter((w) => text.includes(w)).length * 0.03,
    );
    const psychTerms = [
      "نفسي",
      "عاطفي",
      "معرفي",
      "سلوكي",
      "دافع",
      "محفز",
      "استجابة",
      "تفاعل",
    ];
    score += Math.min(
      0.2,
      psychTerms.filter((t) => text.includes(t)).length * 0.04,
    );
    return Math.min(1, score);
  }

  private assessActionability(text: string): number {
    let score = 0.5;
    const actionVerbs = [
      "يُنصح",
      "يجب",
      "يمكن",
      "ينبغي",
      "يُفضل",
      "تعزيز",
      "تحسين",
      "تجنب",
      "إضافة",
      "تعديل",
    ];
    score += Math.min(
      0.3,
      actionVerbs.filter((v) => text.includes(v)).length * 0.05,
    );
    if (/[١-٩\d]\.\s/.test(text) || /[-•]\s/.test(text)) score += 0.2;
    return Math.min(1, score);
  }

  private detectAnalysisType(text: string): string {
    if (text.includes("ديموغرافي") || text.includes("شريحة"))
      return "تحليل شرائح";
    if (text.includes("عاطفي") && text.includes("نفسي"))
      return "تحليل نفسي-عاطفي";
    if (text.includes("استجابة") || text.includes("تفاعل"))
      return "تحليل استجابة";
    if (text.includes("مخاطر") || text.includes("فرص"))
      return "تحليل مخاطر-فرص";
    return "تحليل شامل";
  }

  private generateAnalysisNotes(
    output: StandardAgentOutput,
    comprehensiveness: number,
    insightDepth: number,
    actionability: number,
  ): string[] {
    const notes: string[] = [];
    if (comprehensiveness > 0.8) notes.push("تحليل شامل ومفصل");
    else if (comprehensiveness > 0.6) notes.push("تحليل جيد");
    else notes.push("يحتاج مزيداً من التفاصيل");
    if (insightDepth > 0.7) notes.push("رؤى عميقة ومدروسة");
    else if (insightDepth > 0.5) notes.push("تحليل مقبول");
    if (actionability > 0.7) notes.push("توصيات قابلة للتنفيذ");
    else if (actionability > 0.5) notes.push("توصيات عامة");
    if (output.confidence > 0.8) notes.push("ثقة عالية في التوقعات");
    else if (output.confidence > 0.6) notes.push("ثقة متوسطة");
    if (output.notes)
      notes.push(...output.notes.filter((n) => !notes.includes(n)));
    return notes;
  }

  /**
   * Format audience profile
   */
  private formatAudienceProfile(
    audience: NonNullable<AudienceResonanceContext["targetAudience"]>,
  ): string {
    const formatted: string[] = [];
    this.formatDemographics(formatted, audience.demographics);
    this.formatPsychographics(formatted, audience.psychographics);
    this.formatPreferences(formatted, audience.preferences);
    return formatted.join("\n") || "ملف جمهور عام";
  }

  private formatDemographics(
    formatted: string[],
    demo: NonNullable<
      AudienceResonanceContext["targetAudience"]
    >["demographics"],
  ): void {
    if (!demo) return;
    formatted.push("**الديموغرافيا:**");
    if (demo.ageRange) formatted.push(`  - الفئة العمرية: ${demo.ageRange}`);
    if (demo.gender) formatted.push(`  - الجنس: ${demo.gender}`);
    if (demo.education)
      formatted.push(`  - المستوى التعليمي: ${demo.education}`);
    if (demo.culturalBackground)
      formatted.push(`  - الخلفية الثقافية: ${demo.culturalBackground}`);
    if (demo.socioeconomicStatus)
      formatted.push(`  - الحالة الاقتصادية: ${demo.socioeconomicStatus}`);
    formatted.push("");
  }

  private formatPsychographics(
    formatted: string[],
    psycho: NonNullable<
      AudienceResonanceContext["targetAudience"]
    >["psychographics"],
  ): void {
    if (!psycho) return;
    formatted.push("**الخصائص النفسية:**");
    if (psycho.values && psycho.values.length > 0)
      formatted.push(`  - القيم: ${psycho.values.join("، ")}`);
    if (psycho.interests && psycho.interests.length > 0)
      formatted.push(`  - الاهتمامات: ${psycho.interests.join("، ")}`);
    if (psycho.lifestyle) formatted.push(`  - نمط الحياة: ${psycho.lifestyle}`);
    if (psycho.emotionalTriggers && psycho.emotionalTriggers.length > 0)
      formatted.push(
        `  - المحفزات العاطفية: ${psycho.emotionalTriggers.join("، ")}`,
      );
    formatted.push("");
  }

  private formatPreferences(
    formatted: string[],
    prefs: NonNullable<
      AudienceResonanceContext["targetAudience"]
    >["preferences"],
  ): void {
    if (!prefs) return;
    formatted.push("**التفضيلات:**");
    if (prefs.genrePreferences && prefs.genrePreferences.length > 0)
      formatted.push(
        `  - الأنواع المفضلة: ${prefs.genrePreferences.join("، ")}`,
      );
    if (prefs.contentStyle)
      formatted.push(`  - أسلوب المحتوى: ${prefs.contentStyle}`);
    if (prefs.complexity)
      formatted.push(`  - مستوى التعقيد: ${prefs.complexity}`);
  }

  protected override async getFallbackResponse(
    input: StandardAgentInput,
  ): Promise<string> {
    await Promise.resolve();
    const ctx = input.context as AudienceResonanceContext;
    const audienceInfo = ctx?.targetAudience ? "محدد" : "عام";

    return `تحليل الصدى الجماهيري (${audienceInfo}):

**تقييم أولي:**
يحتاج المحتوى إلى تحليل أعمق للصدى الجماهيري المحتمل. التقييم الحالي محدود بسبب نقص البيانات أو خطأ في المعالجة.

**توصيات عامة:**
1. توفير معلومات أكثر تفصيلاً عن الجمهور المستهدف
2. تحديد المنصة والسياق الثقافي بوضوح
3. إضافة نماذج من استجابات جماهيرية سابقة إن وجدت

**الخطوة التالية:**
يُنصح بتفعيل جميع الخيارات المتقدمة (RAG، التحليل الدستوري، كشف الهلوسة) للحصول على تحليل دقيق وشامل للصدى الجماهيري.

ملاحظة: هذا تحليل احتياطي. للحصول على نتائج أفضل، يرجى المحاولة مرة أخرى مع توفير سياق أكثر اكتمالاً.`;
  }
}

// Export singleton instance
export const audienceResonanceAgent = new AudienceResonanceAgent();
