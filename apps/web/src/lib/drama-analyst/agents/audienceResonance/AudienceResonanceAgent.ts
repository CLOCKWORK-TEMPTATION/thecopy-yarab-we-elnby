import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { AUDIENCE_RESONANCE_AGENT_CONFIG } from "./agent";

interface AudienceProfile {
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
}

interface AudienceResonanceContext {
  originalText?: string;
  analysisReport?: unknown;
  targetAudience?: AudienceProfile;
  contentType?: string;
  platform?: string;
  previousResponses?: {
    audienceSegment: string;
    response: string;
    resonanceScore: number;
  }[];
}

/**
 * Audience Resonance Agent - وكيل مصفوفة التعاطف الجماهيري
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON
 */
export class AudienceResonanceAgent extends BaseAgent {
  constructor() {
    super(
      "EmpathyMatrix AI",
      TaskType.AUDIENCE_RESONANCE,
      AUDIENCE_RESONANCE_AGENT_CONFIG.systemPrompt ?? ""
    );

    // Set agent-specific confidence floor
    this.confidenceFloor = 0.75;
  }

  /**
   * Build prompt for audience resonance analysis
   */
  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;

    // Extract relevant context
    const ctx = context as AudienceResonanceContext;
    const originalText = ctx?.originalText ?? "";
    const targetAudience = ctx?.targetAudience ?? null;
    const contentType = ctx?.contentType ?? "محتوى درامي";
    const platform = ctx?.platform ?? "غير محدد";
    const previousResponses = ctx?.previousResponses ?? [];

    // Build structured prompt
    let prompt = `[مهمة تحليل الصدى الجماهيري]\n\n`;

    // Add content information
    if (originalText) {
      prompt += `المحتوى المراد تحليله:\n${originalText.substring(0, 2000)}\n\n`;
    }

    // Add target audience details
    if (targetAudience) {
      prompt += `معلومات الجمهور المستهدف:\n`;
      prompt += this.formatAudienceProfile(targetAudience);
      prompt += "\n\n";
    }

    // Add content type and platform
    prompt += `نوع المحتوى: ${contentType}\n`;
    prompt += `المنصة: ${platform}\n\n`;

    // Add previous response patterns if available
    if (previousResponses.length > 0) {
      prompt += `أنماط الاستجابة السابقة:\n`;
      previousResponses.slice(0, 3).forEach((response, index) => {
        prompt += `${index + 1}. ${response.audienceSegment}: ${response.response} (صدى: ${response.resonanceScore}/10)\n`;
      });
      prompt += "\n";
    }

    // Add specific task
    prompt += `المهمة المطلوبة:\n${taskInput}\n\n`;

    // Add analysis instructions
    prompt += `التعليمات:

قدم تحليلاً شاملاً للصدى الجماهيري يتضمن:

**1. تقييم الصدى العاطفي** (3-4 فقرات):
   - تحديد المحفزات العاطفية الرئيسية في المحتوى
   - تحليل مدى توافقها مع الجمهور المستهدف
   - توقع الاستجابات العاطفية المحتملة (إيجابية، سلبية، مختلطة)

**2. التحليل النفسي الاجتماعي** (2-3 فقرات):
   - دراسة العوامل النفسية التي تؤثر على التقبل
   - تحليل القيم والمعتقدات المنعكسة في المحتوى
   - مدى توافق المحتوى مع الهوية الاجتماعية للجمهور

**3. النقاط الحرجة للتأثير** (قائمة مرقمة):
   - تحديد اللحظات أو العناصر الأكثر احتمالاً لإحداث صدى
   - شرح سبب قوة التأثير المتوقعة
   - تقييم درجة الخطورة أو الحساسية لكل عنصر

**4. توقعات الاستجابة حسب الشرائح** (جدول أو قائمة):
   - تقسيم الجمهور إلى شرائح رئيسية
   - توقع استجابة كل شريحة
   - تقدير نسبة الصدى الإيجابي لكل شريحة

**5. التوصيات التحسينية** (قائمة مرقمة):
   - اقتراحات لتعزيز الصدى الإيجابي
   - تحذيرات من عناصر قد تسبب رفضاً أو انزعاجاً
   - استراتيجيات للتواصل الفعال مع الجمهور

**6. تقييم المخاطر والفرص**:
   - المخاطر المحتملة في استقبال المحتوى
   - الفرص القابلة للاستغلال لزيادة التأثير

اكتب بلغة عربية فصحى واضحة، مع الحفاظ على الموضوعية والدقة في التحليل.
استخدم البيانات الديموغرافية والنفسية المتاحة لدعم استنتاجاتك.
لا تستخدم JSON أو تنسيقات البرمجة - قدم تحليلاً نصياً مباشراً ومنظماً.`;

    return prompt;
  }

  /**
   * Post-process the audience resonance output
   */
  protected override postProcess(
    output: StandardAgentOutput
  ): StandardAgentOutput {
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
        actionability
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

  /**
   * Clean up analysis text
   */
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

  /**
   * Structure the analysis output
   */
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

  /**
   * Check if line is a section header
   */
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
      headers.some((header) => line.includes(header)) ||
      /^#+\s/.test(line) ||
      /^\*\*\d+\./.test(line) ||
      /^[١-٩]\.\s\*\*/.test(line)
    );
  }

  /**
   * Assess comprehensiveness of analysis
   */
  private assessComprehensiveness(text: string): number {
    let score = 0.5; // Base score

    // Check for required sections
    const requiredSections = ["عاطفي", "نفسي", "استجابة", "توصيات", "مخاطر"];
    const sectionsFound = requiredSections.filter((section) =>
      text.includes(section)
    ).length;
    score += (sectionsFound / requiredSections.length) * 0.3;

    // Check text length (comprehensive analysis should be detailed)
    if (text.length > 800) score += 0.1;
    if (text.length > 1500) score += 0.1;

    return Math.min(1, score);
  }

  /**
   * Assess insight depth
   */
  private assessInsightDepth(text: string): number {
    let score = 0.5; // Base score

    // Check for analytical depth indicators
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

    const analyticalCount = analyticalWords.filter((word) =>
      text.includes(word)
    ).length;
    score += Math.min(0.3, analyticalCount * 0.03);

    // Check for psychological terminology
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
    const psychCount = psychTerms.filter((term) => text.includes(term)).length;
    score += Math.min(0.2, psychCount * 0.04);

    return Math.min(1, score);
  }

  /**
   * Assess actionability of recommendations
   */
  private assessActionability(text: string): number {
    let score = 0.5; // Base score

    // Check for actionable language
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

    const actionCount = actionVerbs.filter((verb) =>
      text.includes(verb)
    ).length;
    score += Math.min(0.3, actionCount * 0.05);

    // Check for specific recommendations (numbered or bulleted)
    const hasNumberedList = /[١-٩\d]\.\s/.test(text);
    const hasBulletList = /[-•]\s/.test(text);

    if (hasNumberedList || hasBulletList) {
      score += 0.2;
    }

    return Math.min(1, score);
  }

  /**
   * Detect analysis type
   */
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

  /**
   * Generate notes about the analysis
   */
  private generateAnalysisNotes(
    output: StandardAgentOutput,
    comprehensiveness: number,
    insightDepth: number,
    actionability: number
  ): string[] {
    const notes: string[] = [];

    // Comprehensiveness
    if (comprehensiveness > 0.8) {
      notes.push("تحليل شامل ومفصل");
    } else if (comprehensiveness > 0.6) {
      notes.push("تحليل جيد");
    } else {
      notes.push("يحتاج مزيداً من التفاصيل");
    }

    // Insight depth
    if (insightDepth > 0.7) {
      notes.push("رؤى عميقة ومدروسة");
    } else if (insightDepth > 0.5) {
      notes.push("تحليل مقبول");
    }

    // Actionability
    if (actionability > 0.7) {
      notes.push("توصيات قابلة للتنفيذ");
    } else if (actionability > 0.5) {
      notes.push("توصيات عامة");
    }

    // Overall confidence
    if (output.confidence > 0.8) {
      notes.push("ثقة عالية في التوقعات");
    } else if (output.confidence > 0.6) {
      notes.push("ثقة متوسطة");
    }

    // Add original notes
    if (output.notes) {
      notes.push(...output.notes.filter((note) => !notes.includes(note)));
    }

    return notes;
  }

  /**
   * Format audience profile
   */
  private formatAudienceProfile(audience: AudienceProfile): string {
    const formatted: string[] = [];

    // Demographics
    if (audience.demographics) {
      formatted.push("**الديموغرافيا:**");
      const demo = audience.demographics;
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

    // Psychographics
    if (audience.psychographics) {
      formatted.push("**الخصائص النفسية:**");
      const psycho = audience.psychographics;
      if (psycho.values && psycho.values.length > 0)
        formatted.push(`  - القيم: ${psycho.values.join("، ")}`);
      if (psycho.interests && psycho.interests.length > 0)
        formatted.push(`  - الاهتمامات: ${psycho.interests.join("، ")}`);
      if (psycho.lifestyle)
        formatted.push(`  - نمط الحياة: ${psycho.lifestyle}`);
      if (psycho.emotionalTriggers && psycho.emotionalTriggers.length > 0)
        formatted.push(
          `  - المحفزات العاطفية: ${psycho.emotionalTriggers.join("، ")}`
        );
      formatted.push("");
    }

    // Preferences
    if (audience.preferences) {
      formatted.push("**التفضيلات:**");
      const prefs = audience.preferences;
      if (prefs.genrePreferences && prefs.genrePreferences.length > 0)
        formatted.push(
          `  - الأنواع المفضلة: ${prefs.genrePreferences.join("، ")}`
        );
      if (prefs.contentStyle)
        formatted.push(`  - أسلوب المحتوى: ${prefs.contentStyle}`);
      if (prefs.complexity)
        formatted.push(`  - مستوى التعقيد: ${prefs.complexity}`);
    }

    return formatted.join("\n") || "ملف جمهور عام";
  }

  /**
   * Generate fallback response
   */
  protected override getFallbackResponse(input: StandardAgentInput): string {
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
