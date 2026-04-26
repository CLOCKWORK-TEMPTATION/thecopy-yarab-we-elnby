import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import { safeCountMultipleTerms, sumCounts } from "../shared/safe-regexp";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { ADAPTIVE_REWRITING_AGENT_CONFIG } from "./agent";
// نفترض وجود هذه الأداة المساعدة أو يمكن استبدالها بـ RegExp عادي مع الحذر

/**
 * واجهة السياق الخاصة بإعادة الكتابة
 */
interface AdaptiveRewritingContext {
  originalText?: string;
  analysisReport?: Record<string, unknown>; // تحسين النوع بدلاً من any
  rewritingGoals?: string[];
  targetAudience?: string;
  targetTone?: string;
  targetLength?: string;
  preserveElements?: string[];
  improvementFocus?: string[]; // e.g., ['pacing', 'dialogue', 'clarity']
  styleGuide?: string;
  constraints?: string[];
}

/**
 * Adaptive Rewriting Agent - وكيل إعادة الكتابة التكيفية
 * يقوم بإعادة صياغة النصوص بناءً على أهداف محددة، جمهور مستهدف، ونبرة معينة.
 * يعتمد على تحليل النص الأصلي وتطبيق تحسينات لغوية وهيكلية.
 */
export class AdaptiveRewritingAgent extends BaseAgent {
  constructor() {
    super(
      "RewriteMaster AI",
      TaskType.ADAPTIVE_REWRITING,
      ADAPTIVE_REWRITING_AGENT_CONFIG?.systemPrompt ??
        "أنت خبير تحرير نصوص ومطور محتوى محترف."
    );

    // رفع الحد الأدنى للثقة لضمان جودة المخرجات
    this.confidenceFloor = 0.75;
  }

  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;
    const opts = this.extractRewritingOptions(context as AdaptiveRewritingContext);

    let prompt = `مهمة: إعادة كتابة تكيفية وتحسين للنص.\n\n`;
    prompt += this.buildInstructionsSection();
    prompt += this.buildOriginalTextSection(opts.originalText);
    prompt += this.buildParametersSection(opts.targetAudience, opts.targetTone, opts.targetLength, opts.improvementFocus);
    prompt += this.buildListSection("goals", opts.rewritingGoals);
    prompt += this.buildPreserveSection(opts.preserveElements);
    prompt += opts.styleGuide ? `<style_guide>\n${opts.styleGuide}\n</style_guide>\n\n` : "";
    prompt += this.buildListSection("constraints", opts.constraints);
    prompt += `<user_request>\n${taskInput}\n</user_request>\n\n`;
    prompt += this.getOutputFormatSection();
    return prompt;
  }

   
  private extractRewritingOptions(ctx: AdaptiveRewritingContext | undefined) {
    return {
      originalText: ctx?.originalText ?? "",
      rewritingGoals: ctx?.rewritingGoals ?? [],
      targetAudience: ctx?.targetAudience ?? "جمهور عام",
      targetTone: ctx?.targetTone ?? "محايدة/احترافية",
      targetLength: ctx?.targetLength ?? "same",
      preserveElements: ctx?.preserveElements ?? [],
      improvementFocus: ctx?.improvementFocus ?? ["clarity", "flow"],
      styleGuide: ctx?.styleGuide ?? "",
      constraints: ctx?.constraints ?? [],
    };
  }

  private buildInstructionsSection(): string {
    return `<instructions>\nقم بتحليل النص الأصلي وإعادة كتابته بالكامل لتحقيق الأهداف المحددة أدناه.\nيجب أن يكون الناتج نصاً مصاغاً ببراعة وجاهزاً للنشر.\n</instructions>\n\n`;
  }

  private buildOriginalTextSection(originalText: string): string {
    if (!originalText) return "";
    return `<original_text>\n${originalText.substring(0, 4000)}\n</original_text>\n\n`;
  }

  private buildParametersSection(
    targetAudience: string,
    targetTone: string,
    targetLength: string,
    improvementFocus: string[]
  ): string {
    let section = `<parameters>\n`;
    section += `- الجمهور المستهدف: ${targetAudience}\n`;
    section += `- النبرة (Tone): ${targetTone}\n`;
    section += `- الطول المستهدف: ${this.translateLength(targetLength)}\n`;
    if (improvementFocus.length > 0) {
      section += `- مجالات التركيز للتحسين: ${improvementFocus.map((f) => this.translateFocus(f)).join("، ")}\n`;
    }
    section += `</parameters>\n\n`;
    return section;
  }

  private buildListSection(tag: string, items: string[]): string {
    if (items.length === 0) return "";
    let section = `<${tag}>\n`;
    items.forEach((item, idx) => (section += `${idx + 1}. ${item}\n`));
    section += `</${tag}>\n\n`;
    return section;
  }

  private buildPreserveSection(preserveElements: string[]): string {
    if (preserveElements.length === 0) return "";
    let section = `<preserve>\n`;
    preserveElements.forEach((elem, idx) => (section += `${idx + 1}. ${elem}\n`));
    section += `</preserve>\n\n`;
    return section;
  }

  private getOutputFormatSection(): string {
    return `
<output_format>
المطلوب منك تقديم الاستجابة بالتنسيق التالي تماماً (بدون استخدام كتل JSON):

1. **التحليل الاستراتيجي**:
   - نقاط القوة في الأصل.
   - نقاط الضعف التي سيتم معالجتها.
   - الخطة المتبعة.

2. **النص المعاد كتابته**:
   [اكتب النص الكامل هنا بدقة عالية]

3. **تقرير التحسينات**:
   - شرح التغييرات الجوهرية ولماذا تخدم الهدف.
   - مقارنة سريعة (قبل/بعد) لجملة محورية.
</output_format>
`;
  }

  protected override async postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
    await Promise.resolve();
    // تنظيف النص من أي بقايا كود أو علامات غير مرغوبة
    const processedText = this.cleanupRewrittenText(output.text);

    // حساب مقاييس الجودة المتعددة
    const goalAchievement = this.assessGoalAchievement(processedText);
    const qualityImprovement =
      this.assessQualityImprovement(processedText);
    const coherence = this.assessCoherence(processedText);
    const creativity = this.assessCreativity(processedText);

    // حساب درجة الجودة الكلية (Weighted Score)
    const qualityScore =
      goalAchievement * 0.35 +
      qualityImprovement * 0.3 +
      coherence * 0.2 +
      creativity * 0.15;

    // تعديل الثقة بناءً على تقييم المحتوى الفعلي
    // نأخذ متوسط ثقة النموذج الخام مع جودة المحتوى المحسوبة
    const adjustedConfidence = output.confidence * 0.4 + qualityScore * 0.6;

    return {
      ...output,
      text: processedText,
      confidence: Number(adjustedConfidence.toFixed(2)), // تقريب لرقمين عشريين
      notes: this.generateRewritingNotes(
        output,
        goalAchievement,
        qualityImprovement,
        coherence,
        creativity
      ),
      metadata: {
        ...output.metadata,
        rewritingMetrics: {
          overallQuality: Number(qualityScore.toFixed(2)),
          goalAchievement,
          qualityImprovement,
          coherence,
          creativity,
        },
        stats: {
          charCount: processedText.length,
          improvementCount: this.countImprovements(processedText),
        },
      },
    };
  }

  private cleanupRewrittenText(text: string): string {
    text = text.replace(/```[a-z]*\n[\s\S]*?\n```/gi, (match) => match.replace(/```[a-z]*/gi, "").trim());
    text = text.replace(/```json[\s\S]*?```/g, "");
    text = text.replace(/^\{[\s\S]*?\}$/gm, "");
    return text.replace(/\n{3,}/g, "\n\n").trim();
  }

  private assessGoalAchievement(text: string): number {
    let score = 0.5;
    const terms = ["تم تحسين", "بنجاح", "أفضل", "أكثر دقة", "تحقيق الهدف", "صياغة أقوى", "معالجة", "تم تطوير", "النسخة المعدلة"];
    score += Math.min(0.3, sumCounts(safeCountMultipleTerms(text, terms)) * 0.05);
    if (text.length > 200) score += 0.2;
    return Math.min(1, score);
  }

  private assessQualityImprovement(text: string): number {
    let score = 0.5;
    const indicators = ["دقة", "وضوح", "إيجاز", "سلاسة", "احترافية", "خالٍ من الأخطاء", "محكم", "بليغ", "منقح"];
    score += Math.min(0.3, sumCounts(safeCountMultipleTerms(text, indicators)) * 0.04);
    if (/ملاحظات|التحسينات|التغييرات/i.test(text)) score += 0.2;
    return Math.min(1, score);
  }

  private assessCoherence(text: string): number {
    let score = 0.6;
    const connectives = ["لذلك", "بالتالي", "علاوة على", "في حين", "بينما", "نتيجة لـ", "من ناحية أخرى", "كما أن", "فضلاً عن"];
    score += Math.min(0.25, sumCounts(safeCountMultipleTerms(text, connectives)) * 0.03);
    if (text.split("\n\n").filter((p) => p.trim().length > 30).length >= 2) score += 0.15;
    return Math.min(1, score);
  }

  private assessCreativity(text: string): number {
    let score = 0.4;
    const words = ["مبتكر", "جذاب", "فريد", "إلهام", "حيوي", "تشبيه", "استعارة", "أسلوب", "بصمة"];
    score += Math.min(0.4, sumCounts(safeCountMultipleTerms(text, words)) * 0.08);
    if (text.includes("!") || text.includes("؟")) score += 0.1;
    return Math.min(1, score);
  }

  private countImprovements(text: string): number {
    const regex = /تحسين|تغيير|إضافة|حذف|تعديل|صياغة|تقوية/gi;
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  private generateRewritingNotes(
    output: StandardAgentOutput,
    goalScore: number,
    qualityScore: number,
    coherenceScore: number,
    creativityScore: number
  ): string[] {
    const notesList: string[] = [];
    const avg =
      (goalScore + qualityScore + coherenceScore + creativityScore) / 4;

    // تصنيف الجودة العامة
    if (avg > 0.85) notesList.push("🟢 جودة إعادة الكتابة: ممتازة");
    else if (avg > 0.7) notesList.push("🟡 جودة إعادة الكتابة: جيدة جداً");
    else notesList.push("🟠 جودة إعادة الكتابة: مقبولة (تحتاج مراجعة)");

    // ملاحظات تفصيلية
    if (goalScore > 0.8) notesList.push("✅ تم تحقيق الأهداف المحددة بدقة.");
    if (coherenceScore > 0.8)
      notesList.push("✅ النص يتمتع بتماسك وترابط قوي.");
    if (creativityScore < 0.5)
      notesList.push("ℹ️ الأسلوب مباشر وتقليدي (يمكن زيادة الإبداع).");

    // دمج أي ملاحظات سابقة من الـ LLM نفسه
    if (output.notes && Array.isArray(output.notes)) {
      notesList.push(...output.notes);
    }

    return notesList;
  }

  // --- أدوات مساعدة للترجمة والعرض ---

  private translateLength(length: string): string {
    const mapping: Record<string, string> = { shorter: "مختصر (أقصر من النص الأصلي)", same: "نفس الطول تقريباً", longer: "مفصل (أطول من النص الأصلي)", double: "موسع جداً (ضعف الطول)", half: "ملخص مركز (نصف الطول)" };
    return mapping[length] ?? length;
  }

  private translateFocus(focus: string): string {
    const mapping: Record<string, string> = { pacing: "ضبط الإيقاع والسرعة", dialogue: "تحسين الحوارات", description: "إغناء الوصف", clarity: "الوضوح والمباشرة", impact: "قوة التأثير العاطفي/الإقناعي", characterization: "عمق الشخصيات", atmosphere: "بناء الأجواء العامة", structure: "الهيكلية والتنظيم", seo: "تحسين محركات البحث" };
    return mapping[focus] ?? focus;
  }

  protected override async getFallbackResponse(
    _input: StandardAgentInput
  ): Promise<string> {
    await Promise.resolve();
    return `عذراً، واجه الوكيل صعوبة في إتمام عملية إعادة الكتابة بشكل كامل.
    
التحليل الأولي:
النص الأصلي محفوظ، ولكن عملية التوليد توقفت.

إجراءات مقترحة:
1. حاول تقليل طول النص المدخل.
2. بسّط أهداف إعادة الكتابة.
3. تأكد من وضوح التعليمات.

يرجى المحاولة مرة أخرى مع تعديل المدخلات.`;
  }
}

// تصدير نسخة وحيدة (Singleton) للاستخدام العام
export const adaptiveRewritingAgent = new AdaptiveRewritingAgent();
