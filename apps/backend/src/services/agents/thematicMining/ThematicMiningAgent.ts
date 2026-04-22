/* eslint-disable max-lines -- cohesive agent module */
import { TaskType } from "@core/types";
import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";
import { THEMATIC_MINING_AGENT_CONFIG } from "./agent";
import { safeCountMultipleTerms, sumCounts } from "../shared/safe-regexp";

interface ThematicMiningContext {
  originalText?: string;
  analysisReport?: unknown;
  genre?: string;
  culturalContext?: string;
  extractionDepth?: string; // 'surface', 'intermediate', 'deep'
  themeCategories?: string[]; // ['universal', 'social', 'personal', 'philosophical']
  minimumThemes?: number;
  includeSymbols?: boolean;
  includeMotifs?: boolean;
}

/**
 * Thematic Mining Agent - وكيل استخراج الثيمات
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON
 */
export class ThematicMiningAgent extends BaseAgent {
  constructor() {
    super(
      "ThemeMiner AI",
      TaskType.THEMATIC_MINING,
      THEMATIC_MINING_AGENT_CONFIG.systemPrompt || ""
    );

    this.confidenceFloor = 0.8;
  }

  // eslint-disable-next-line complexity
  private extractThematicContext(context: unknown): ThematicMiningContext {
    const ctx = context as ThematicMiningContext;
    return {
      originalText: ctx?.originalText || "",
      genre: ctx?.genre || "غير محدد",
      culturalContext: ctx?.culturalContext || "",
      extractionDepth: ctx?.extractionDepth || "intermediate",
      themeCategories: ctx?.themeCategories || ["universal", "social"],
      minimumThemes: ctx?.minimumThemes || 3,
      includeSymbols: ctx?.includeSymbols ?? true,
      includeMotifs: ctx?.includeMotifs ?? true,
    };
  }

  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;
    const ctx = this.extractThematicContext(context);

    let prompt = `مهمة استخراج الثيمات والموضوعات الأدبية\n\n`;
    prompt += this.buildThematicTextSection(ctx.originalText || "");
    prompt += this.buildContextInfoSection(ctx);
    prompt += `المهمة المطلوبة:\n${taskInput}\n\n`;
    prompt += this.buildThematicInstructions(ctx);

    return prompt;
  }

  private buildThematicTextSection(text: string): string {
    return text ? `النص المراد تحليله:\n${text.substring(0, 2500)}...\n\n` : "";
  }

  private buildContextInfoSection(ctx: ThematicMiningContext): string {
    let s = `معلومات السياق:\n`;
    s += `- النوع الأدبي: ${ctx.genre}\n`;
    if (ctx.culturalContext) s += `- السياق الثقافي: ${ctx.culturalContext}\n`;
    s += `- عمق الاستخراج: ${this.translateDepth(ctx.extractionDepth || "intermediate")}\n`;
    s += `- فئات الثيمات المطلوبة: ${(ctx.themeCategories || []).map(this.translateCategory).join("، ")}\n`;
    s += `- الحد الأدنى للثيمات: ${ctx.minimumThemes}\n`;
    s += `- استخراج الرموز: ${ctx.includeSymbols ? "نعم" : "لا"}\n`;
    s += `- استخراج الموتيفات: ${ctx.includeMotifs ? "نعم" : "لا"}\n\n`;
    return s;
  }

  private buildThematicInstructions(ctx: ThematicMiningContext): string {
    return `التعليمات:

1. **نظرة عامة** (2-3 جمل): لخص الطابع الموضوعي العام للنص

2. **الثيمات الرئيسية**: استخرج وحلل الثيمات الأساسية (${ctx.minimumThemes} على الأقل)
   لكل ثيمة، قدم:
   - **اسم الثيمة**: عنوان واضح ومباشر
   - **الوصف**: شرح الثيمة وكيف تتجلى في النص
   - **الأدلة النصية**: أمثلة محددة من النص تدعم وجود هذه الثيمة
   - **التطور**: كيف تتطور هذه الثيمة عبر النص
   - **الأهمية**: لماذا هذه الثيمة مركزية للعمل

3. **الثيمات الثانوية**: ثيمات فرعية أو داعمة (إن وجدت)

${ctx.includeSymbols ? `4. **الرموز**: الرموز الأدبية المستخدمة ودلالاتها` : ""}

${ctx.includeMotifs ? `5. **الموتيفات المتكررة**: الأنماط والعناصر المتكررة وأهميتها` : ""}

6. **التكامل الموضوعي**: كيف تتشابك الثيمات المختلفة وتخدم الرسالة الكلية

7. **الرسالة الجوهرية**: ما الرسالة أو الفكرة الأساسية التي يريد النص إيصالها

اكتب بشكل نصي تحليلي مباشر مع أمثلة نصية محددة.
لا تستخدم JSON أو قوائم برمجية. نص تحليلي أدبي واضح.`;
  }

  protected override async postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
    const processedText = this.cleanupThematicText(output.text);

    const thematicDepth = await this.assessThematicDepth(processedText);
    const evidenceQuality = await this.assessEvidenceQuality(processedText);
    const insightfulness = await this.assessInsightfulness(processedText);
    const coherence = await this.assessCoherence(processedText);

    const qualityScore =
      thematicDepth * 0.3 +
      evidenceQuality * 0.25 +
      insightfulness * 0.25 +
      coherence * 0.2;

    const adjustedConfidence = output.confidence * 0.5 + qualityScore * 0.5;

    return {
      ...output,
      text: processedText,
      confidence: adjustedConfidence,
      notes: this.generateThematicNotes(
        output,
        thematicDepth,
        evidenceQuality,
        insightfulness,
        coherence
      ),
      metadata: {
        ...output.metadata,
        thematicQuality: {
          overall: qualityScore,
          thematicDepth,
          evidenceQuality,
          insightfulness,
          coherence,
        },
        themesIdentified: this.countThemes(processedText),
        symbolsIdentified: this.countSymbols(processedText),
        evidenceExamplesCount: this.countEvidenceExamples(processedText),
      } as Record<string, unknown>,
    };
  }

  private cleanupThematicText(text: string): string {
    text = text.replace(/```json[\s\S]*?```/g, "");
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/\{[\s\S]*?\}/g, (match) => {
      if (match.includes('"') && match.includes(":")) return "";
      return match;
    });

    return text.replace(/\n{3,}/g, "\n\n").trim();
  }

  private async assessThematicDepth(text: string): Promise<number> {
    let score = 0.5;

    const thematicTerms = [
      "ثيمة",
      "موضوع",
      "فكرة",
      "رسالة",
      "مغزى",
      "دلالة",
      "معنى",
      "قيمة",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const termCount = safeCountMultipleTerms(text, thematicTerms);
    score += Math.min(0.25, sumCounts(termCount) * 0.015);

    const abstractTerms = [
      "الحرية",
      "العدالة",
      "الحب",
      "الموت",
      "الهوية",
      "الصراع",
      "التضحية",
      "الخيانة",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const abstractCount = safeCountMultipleTerms(text, abstractTerms);
    score += Math.min(0.15, sumCounts(abstractCount) * 0.03);

    if (text.length > 1500) score += 0.1;

    return Math.min(1, score);
  }

  private async assessEvidenceQuality(text: string): Promise<number> {
    let score = 0.6;

    const evidenceMarkers = [
      "مثل",
      "كما في",
      "نرى",
      "يظهر",
      "نجد",
      "على سبيل المثال",
      "في المشهد",
      "عندما",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const evidenceCount = safeCountMultipleTerms(text, evidenceMarkers);
    score += Math.min(0.25, sumCounts(evidenceCount) * 0.025);

    const hasQuotes = (text.match(/["«]/g) || []).length;
    score += Math.min(0.15, hasQuotes * 0.015);

    return Math.min(1, score);
  }

  private async assessInsightfulness(text: string): Promise<number> {
    let score = 0.5;

    const insightWords = [
      "يكشف",
      "يوضح",
      "يعكس",
      "يدل على",
      "يشير إلى",
      "نستنتج",
      "نلاحظ",
      "الأهمية",
      "التأثير",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const insightCount = safeCountMultipleTerms(text, insightWords);
    score += Math.min(0.3, sumCounts(insightCount) * 0.03);

    const hasAnalysis =
      text.includes("لماذا") ||
      text.includes("السبب") ||
      text.includes("نتيجة");
    if (hasAnalysis) score += 0.2;

    return Math.min(1, score);
  }

  private async assessCoherence(text: string): Promise<number> {
    let score = 0.7;

    const connectiveWords = [
      "بالإضافة",
      "كما",
      "أيضاً",
      "علاوة",
      "من جهة أخرى",
      "بالمقابل",
      "وهكذا",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const connectiveCount = safeCountMultipleTerms(text, connectiveWords);
    score += Math.min(0.2, sumCounts(connectiveCount) * 0.04);

    const hasStructure =
      text.includes("أولاً") || text.includes("ثانياً") || text.match(/\d\./);
    if (hasStructure) score += 0.1;

    return Math.min(1, score);
  }

  private countThemes(text: string): number {
    const themeMarkers = text.match(
      /ثيمة|الموضوع|الفكرة الرئيسية|الثيمة الأولى|الثيمة الثانية/gi
    );
    return themeMarkers ? Math.min(themeMarkers.length, 10) : 0;
  }

  private countSymbols(text: string): number {
    const symbolMarkers = text.match(/رمز|يرمز|رمزية|الدلالة الرمزية/gi);
    return symbolMarkers ? Math.min(symbolMarkers.length, 8) : 0;
  }

  private countEvidenceExamples(text: string): number {
    const exampleMarkers = text.match(/مثل|مثال|كما في|نرى|يظهر|["«]/g);
    return exampleMarkers ? Math.min(exampleMarkers.length, 20) : 0;
  }

  private generateThematicNotes(
    output: StandardAgentOutput,
    depth: number,
    evidence: number,
    insight: number,
    coherence: number
  ): string[] {
    const notes: string[] = [];
    const avg = (depth + evidence + insight + coherence) / 4;
    notes.push(this.overallThematicNote(avg));
    this.addThematicStrengths(notes, depth, evidence, insight, coherence);
    this.addThematicWeaknesses(notes, depth, evidence, insight);
    if (output.notes && Array.isArray(output.notes)) notes.push(...output.notes);
    return notes;
  }

  private overallThematicNote(avg: number): string {
    if (avg > 0.8) return "تحليل موضوعي ممتاز";
    if (avg > 0.65) return "تحليل جيد";
    return "يحتاج عمق أكبر";
  }

  private addThematicStrengths(notes: string[], d: number, e: number, i: number, c: number): void {
    if (d > 0.8) notes.push("عمق موضوعي قوي");
    if (e > 0.8) notes.push("أدلة نصية غنية");
    if (i > 0.75) notes.push("رؤى ثاقبة");
    if (c > 0.8) notes.push("تماسك ممتاز");
  }

  private addThematicWeaknesses(notes: string[], d: number, e: number, i: number): void {
    if (d < 0.5) notes.push("يحتاج استكشاف أعمق");
    if (e < 0.5) notes.push("يحتاج مزيد من الأدلة");
    if (i < 0.6) notes.push("يحتاج تحليل أعمق");
  }

  private translateDepth(depth: string): string {
    const depths: Record<string, string> = {
      surface: "سطحي - الثيمات الظاهرة",
      intermediate: "متوسط - تحليل متوازن",
      deep: "عميق - استكشاف شامل",
    };
    return depths[depth] || depth;
  }

  private translateCategory(category: string): string {
    const categories: Record<string, string> = {
      universal: "عالمية",
      social: "اجتماعية",
      personal: "شخصية",
      philosophical: "فلسفية",
      political: "سياسية",
      existential: "وجودية",
      moral: "أخلاقية",
    };
    return categories[category] || category;
  }

  protected override async getFallbackResponse(
    _input: StandardAgentInput
  ): Promise<string> {
    return `نظرة عامة:
النص يحمل طابعاً موضوعياً يستكشف قضايا إنسانية وفكرية متنوعة.

الثيمة الرئيسية الأولى:
[ثيمة عامة] - تظهر من خلال الأحداث والشخصيات وتتطور عبر النص.
الأدلة: [أمثلة من النص تحتاج تحديد أدق]

الثيمة الرئيسية الثانية:
[ثيمة ثانوية] - تدعم الثيمة الأولى وتضيف بعداً إضافياً.
الأدلة: [أمثلة تحتاج تفصيل]

الرسالة الجوهرية:
النص يسعى لإيصال رسالة حول [موضوع عام يحتاج تحديد].

ملاحظة: يُرجى تفعيل الخيارات المتقدمة وتوفير نص أطول للحصول على استخراج موضوعي أكثر عمقاً ودقة مع أمثلة نصية محددة.`;
  }
}

export const thematicMiningAgent = new ThematicMiningAgent();
