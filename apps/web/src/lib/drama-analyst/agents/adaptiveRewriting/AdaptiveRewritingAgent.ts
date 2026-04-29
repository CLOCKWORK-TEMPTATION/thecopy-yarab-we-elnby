import { safeCountMultipleTerms } from "@/lib/security/safe-regexp";
import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
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

  /**
   * بناء الأمر (Prompt) باستخدام هيكلية XML لضمان فهم النموذج للسياق
   */
  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;
    const ctx = context as AdaptiveRewritingContext;

    const originalText = ctx?.originalText ?? "";
    const rewritingGoals = ctx?.rewritingGoals ?? [];
    const targetAudience = ctx?.targetAudience ?? "جمهور عام";
    const targetTone = ctx?.targetTone ?? "محايدة/احترافية";
    const targetLength = ctx?.targetLength ?? "same";
    const preserveElements = ctx?.preserveElements ?? [];
    const improvementFocus = ctx?.improvementFocus ?? ["clarity", "flow"];
    const styleGuide = ctx?.styleGuide ?? "";
    const constraints = ctx?.constraints ?? [];

    // استخدام وسوم XML لتنظيم المدخلات للنموذج اللغوي
    let prompt = `مهمة: إعادة كتابة تكيفية وتحسين للنص.\n\n`;

    prompt += `<instructions>\n`;
    prompt += `قم بتحليل النص الأصلي وإعادة كتابته بالكامل لتحقيق الأهداف المحددة أدناه.\n`;
    prompt += `يجب أن يكون الناتج نصاً مصاغاً ببراعة وجاهزاً للنشر.\n`;
    prompt += `</instructions>\n\n`;

    if (originalText) {
      prompt += `<original_text>\n${originalText.substring(0, 4000)}\n</original_text>\n\n`;
    }

    prompt += `<parameters>\n`;
    prompt += `- الجمهور المستهدف: ${targetAudience}\n`;
    prompt += `- النبرة (Tone): ${targetTone}\n`;
    prompt += `- الطول المستهدف: ${this.translateLength(targetLength)}\n`;

    prompt += this.formatImprovementFocus(improvementFocus);
    prompt += `</parameters>\n\n`;

    prompt += this.formatNumberedXmlBlock("goals", rewritingGoals);
    prompt += this.formatNumberedXmlBlock("preserve", preserveElements);
    prompt += this.formatOptionalXmlBlock("style_guide", styleGuide);
    prompt += this.formatNumberedXmlBlock("constraints", constraints);

    prompt += `<user_request>\n${taskInput}\n</user_request>\n\n`;

    prompt += `
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

    return prompt;
  }

  private formatImprovementFocus(improvementFocus: string[]): string {
    if (improvementFocus.length === 0) return "";
    return `- مجالات التركيز للتحسين: ${improvementFocus.map((f) => this.translateFocus(f)).join("، ")}\n`;
  }

  private formatNumberedXmlBlock(tag: string, items: string[]): string {
    if (items.length === 0) return "";
    const body = items.map((item, idx) => `${idx + 1}. ${item}`).join("\n");
    return `<${tag}>\n${body}\n</${tag}>\n\n`;
  }

  private formatOptionalXmlBlock(tag: string, value: string): string {
    return value ? `<${tag}>\n${value}\n</${tag}>\n\n` : "";
  }

  private calculateQualityMetrics(text: string): {
    goalAchievement: number;
    qualityImprovement: number;
    coherence: number;
    creativity: number;
    overallScore: number;
  } {
    const goalAchievement = this.assessGoalAchievement(text);
    const qualityImprovement = this.assessQualityImprovement(text);
    const coherence = this.assessCoherence(text);
    const creativity = this.assessCreativity(text);

    const overallScore =
      goalAchievement * 0.35 +
      qualityImprovement * 0.3 +
      coherence * 0.2 +
      creativity * 0.15;

    return {
      goalAchievement,
      qualityImprovement,
      coherence,
      creativity,
      overallScore,
    };
  }

  /**
   * معالجة المخرجات وتقييم الجودة (Self-Critique)
   */
  protected override postProcess(
    output: StandardAgentOutput
  ): StandardAgentOutput {
    const processedText = this.cleanupRewrittenText(output.text);
    const metrics = this.calculateQualityMetrics(processedText);
    const adjustedConfidence =
      output.confidence * 0.4 + metrics.overallScore * 0.6;

    return {
      ...output,
      text: processedText,
      confidence: Number(adjustedConfidence.toFixed(2)),
      notes: this.generateRewritingNotes(output, metrics),
      metadata: {
        ...output.metadata,
        rewritingMetrics: {
          overallQuality: Number(metrics.overallScore.toFixed(2)),
          goalAchievement: metrics.goalAchievement,
          qualityImprovement: metrics.qualityImprovement,
          coherence: metrics.coherence,
          creativity: metrics.creativity,
        },
        stats: {
          charCount: processedText.length,
          improvementCount: this.countImprovements(processedText),
        },
      },
    };
  }

  private cleanupRewrittenText(text: string): string {
    // إزالة كتل الكود (Markdown) إذا ظهرت عن طريق الخطأ
    text = text.replace(/```[a-z]*\n[\s\S]*?\n```/gi, (match) => {
      // إذا كان الكود بداخل النص هو النص المعاد كتابته، نحاول استخراجه
      // ولكن هنا نفترض أننا نريد إزالة التنسيق البرمجي فقط
      return match.replace(/```[a-z]*/gi, "").trim();
    });

    // إزالة JSON blocks
    text = text.replace(/```json[\s\S]*?```/g, "");

    // تنظيف الأقواس الزائدة الناتجة عن هلوسة القوالب
    text = text.replace(/^\{[\s\S]*?\}$/gm, "");

    return text.replace(/\n{3,}/g, "\n\n").trim();
  }

  // --- دوال التقييم (Heuristics Evaluation) ---

  private assessGoalAchievement(text: string): number {
    let score = 0.5; // درجة أساسية

    const achievementTerms = [
      "تم تحسين",
      "بنجاح",
      "أفضل",
      "أكثر دقة",
      "تحقيق الهدف",
      "صياغة أقوى",
      "معالجة",
      "تم تطوير",
      "النسخة المعدلة",
    ];

    const termCount = safeCountMultipleTerms(text, achievementTerms);
    score += Math.min(0.3, termCount * 0.05);

    // مكافأة للطول المناسب (افتراض أن النص القصير جداً لم يحقق الهدف)
    if (text.length > 200) score += 0.2;

    return Math.min(1, score);
  }

  private assessQualityImprovement(text: string): number {
    let score = 0.5;

    const qualityIndicators = [
      "دقة",
      "وضوح",
      "إيجاز",
      "سلاسة",
      "احترافية",
      "خالٍ من الأخطاء",
      "محكم",
      "بليغ",
      "منقح",
    ];

    const qualityCount = safeCountMultipleTerms(text, qualityIndicators);
    score += Math.min(0.3, qualityCount * 0.04);

    // التحقق من وجود قسم "ملاحظات التحسين" أو ما يشابهه
    const hasMetaAnalysis = /ملاحظات|التحسينات|التغييرات/i.test(text);
    if (hasMetaAnalysis) score += 0.2;

    return Math.min(1, score);
  }

  private assessCoherence(text: string): number {
    let score = 0.6;

    // أدوات الربط العربية التي تدل على تماسك النص
    const connectiveWords = [
      "لذلك",
      "بالتالي",
      "علاوة على",
      "في حين",
      "بينما",
      "نتيجة لـ",
      "من ناحية أخرى",
      "كما أن",
      "فضلاً عن",
    ];

    const connectiveCount = safeCountMultipleTerms(text, connectiveWords);
    score += Math.min(0.25, connectiveCount * 0.03);

    // التحقق من التنسيق (وجود فقرات)
    const paragraphs = text.split("\n\n").filter((p) => p.trim().length > 30);
    if (paragraphs.length >= 2) score += 0.15;

    return Math.min(1, score);
  }

  private assessCreativity(text: string): number {
    let score = 0.4;

    const creativeWords = [
      "مبتكر",
      "جذاب",
      "فريد",
      "إلهام",
      "حيوي",
      "تشبيه",
      "استعارة",
      "أسلوب",
      "بصمة",
    ];

    const creativeCount = safeCountMultipleTerms(text, creativeWords);
    score += Math.min(0.4, creativeCount * 0.08);

    // تنوع علامات الترقيم قد يدل على تنوع هيكلي (علامات تعجب، استفهام)
    if (text.includes("!") || text.includes("؟")) score += 0.1;

    return Math.min(1, score);
  }

  private countImprovements(text: string): number {
    const regex = /تحسين|تغيير|إضافة|حذف|تعديل|صياغة|تقوية/gi;
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  private getQualityRatingLabel(avg: number): string {
    if (avg > 0.85) return "🟢 جودة إعادة الكتابة: ممتازة";
    if (avg > 0.7) return "🟡 جودة إعادة الكتابة: جيدة جداً";
    return "🟠 جودة إعادة الكتابة: مقبولة (تحتاج مراجعة)";
  }

  private getDetailedNotes(metrics: {
    goalAchievement: number;
    qualityImprovement: number;
    coherence: number;
    creativity: number;
  }): string[] {
    const notes: string[] = [];

    if (metrics.goalAchievement > 0.8)
      notes.push("✅ تم تحقيق الأهداف المحددة بدقة.");
    if (metrics.coherence > 0.8) notes.push("✅ النص يتمتع بتماسك وترابط قوي.");
    if (metrics.creativity < 0.5)
      notes.push("ℹ️ الأسلوب مباشر وتقليدي (يمكن زيادة الإبداع).");

    return notes;
  }

  private generateRewritingNotes(
    output: StandardAgentOutput,
    metrics: {
      goalAchievement: number;
      qualityImprovement: number;
      coherence: number;
      creativity: number;
      overallScore: number;
    }
  ): string[] {
    const notesList: string[] = [];

    notesList.push(this.getQualityRatingLabel(metrics.overallScore));
    notesList.push(...this.getDetailedNotes(metrics));

    if (output.notes && Array.isArray(output.notes)) {
      notesList.push(...output.notes);
    }

    return notesList;
  }

  // --- أدوات مساعدة للترجمة والعرض ---

  private translateLength(length: string): string {
    const mapping: Record<string, string> = {
      shorter: "مختصر (أقصر من النص الأصلي)",
      same: "نفس الطول تقريباً",
      longer: "مفصل (أطول من النص الأصلي)",
      double: "موسع جداً (ضعف الطول)",
      half: "ملخص مركز (نصف الطول)",
    };
    return mapping[length] ?? length;
  }

  private translateFocus(focus: string): string {
    const mapping: Record<string, string> = {
      pacing: "ضبط الإيقاع والسرعة",
      dialogue: "تحسين الحوارات",
      description: "إغناء الوصف",
      clarity: "الوضوح والمباشرة",
      impact: "قوة التأثير العاطفي/الإقناعي",
      characterization: "عمق الشخصيات",
      atmosphere: "بناء الأجواء العامة",
      structure: "الهيكلية والتنظيم",
      seo: "تحسين محركات البحث",
    };
    return mapping[focus] ?? focus;
  }

  protected override getFallbackResponse(_input: StandardAgentInput): string {
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
