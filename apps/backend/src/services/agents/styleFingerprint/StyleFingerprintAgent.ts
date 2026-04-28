import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { STYLE_FINGERPRINT_AGENT_CONFIG } from "./agent";

interface StyleFingerprintContext {
  originalText?: string;
  analysisReport?: unknown;
  compareWithText?: string;
  analysisDepth?: string; // 'basic', 'detailed', 'comprehensive'
  focusAreas?: string[]; // ['lexical', 'syntactic', 'rhetorical', 'thematic']
  authorSamples?: string[];
}

/**
 * Style Fingerprint Agent - وكيل بصمة الأسلوب
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON
 */
export class StyleFingerprintAgent extends BaseAgent {
  constructor() {
    super(
      "AuthorDNA AI",
      TaskType.STYLE_FINGERPRINT,
      STYLE_FINGERPRINT_AGENT_CONFIG.systemPrompt ?? "",
    );

    this.confidenceFloor = 0.85;
  }

  private static readonly STYLE_DEFAULTS: Required<
    Pick<
      StyleFingerprintContext,
      | "originalText"
      | "compareWithText"
      | "analysisDepth"
      | "focusAreas"
      | "authorSamples"
    >
  > = {
    originalText: "",
    compareWithText: "",
    analysisDepth: "detailed",
    focusAreas: ["lexical", "syntactic", "rhetorical"],
    authorSamples: [],
  };

  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;
    const raw = (context as StyleFingerprintContext) || {};
    const ctx = { ...StyleFingerprintAgent.STYLE_DEFAULTS, ...raw };

    let prompt = `مهمة استخراج بصمة الأسلوب الأدبي\n\n`;
    prompt += this.buildStyleTextSection(ctx.originalText);
    prompt += this.buildAuthorSamplesSection(ctx.authorSamples);
    prompt += `مستوى العمق: ${this.translateDepth(ctx.analysisDepth)}\n`;
    prompt += `مجالات التركيز: ${ctx.focusAreas.map((area) => this.translateFocusArea(area)).join("، ")}\n\n`;
    prompt += this.buildCompareSection(ctx.compareWithText);
    prompt += `المهمة المطلوبة:\n${taskInput}\n\n`;
    prompt += this.getStyleInstructionsTemplate();

    return prompt;
  }

  private getStyleInstructionsTemplate(): string {
    return `التعليمات:

1. **التحليل المعجمي** (Lexical Analysis):
   - غنى المفردات وتنوعها
   - توزيع تكرار الكلمات
   - استخدام الكلمات النادرة أو المميزة
   - طول الكلمات المتوسط والنطاق

2. **التحليل النحوي** (Syntactic Analysis):
   - بنية الجمل (بسيطة، مركبة، معقدة)
   - طول الجمل المتوسط والتباين
   - أنماط علامات الترقيم
   - الصيغ النحوية المفضلة (مبني للمعلوم/مجهول)

3. **التحليل البلاغي** (Rhetorical Analysis):
   - اللغة المجازية (استعارات، تشبيهات)
   - الأدوات البلاغية (جناس، طباق، سجع)
   - الأساليب الإنشائية (استفهام، أمر، نداء)
   - التكرار والتوازي

4. **التحليل الموضوعي والأسلوبي**:
   - النبرة العامة (رسمية، عامية، شعرية)
   - الحقول الدلالية المهيمنة
   - استراتيجيات السرد (راوي أول شخص، ثالث شخص)
   - الإيقاع والموسيقى اللغوية

5. **البصمة المميزة**:
   - العناصر الأسلوبية الفريدة للمؤلف
   - التوقيع اللغوي المميز
   - العادات الكتابية المتكررة

اكتب بشكل نصي تحليلي واضح ومفصل.
قدم أمثلة محددة من النص لتدعم كل نقطة.
لا تستخدم JSON أو جداول معقدة - نص تحليلي مباشر فقط.`;
  }

  private buildStyleTextSection(text: string): string {
    return text ? `النص المراد تحليله:\n${text.substring(0, 2500)}...\n\n` : "";
  }

  private buildAuthorSamplesSection(samples: string[]): string {
    if (samples.length === 0) return "";
    let s = `نماذج إضافية من نفس المؤلف:\n`;
    samples.slice(0, 2).forEach((sample, idx) => {
      s += `[نموذج ${idx + 1}]: ${sample.substring(0, 300)}...\n`;
    });
    return s + "\n";
  }

  private buildCompareSection(text: string): string {
    return text ? `نص للمقارنة:\n${text.substring(0, 1000)}...\n\n` : "";
  }

  protected override postProcess(
    output: StandardAgentOutput,
  ): Promise<StandardAgentOutput> {
    const processedText = this.cleanupStyleText(output.text);

    const analyticalDepth = this.assessAnalyticalDepth(processedText);
    const specificity = this.assessSpecificity(processedText);
    const comprehensiveness = this.assessComprehensiveness(processedText);
    const evidenceQuality = this.assessEvidenceQuality(processedText);

    const qualityScore =
      analyticalDepth * 0.3 +
      specificity * 0.25 +
      comprehensiveness * 0.25 +
      evidenceQuality * 0.2;

    const adjustedConfidence = output.confidence * 0.5 + qualityScore * 0.5;

    return Promise.resolve({
      ...output,
      text: processedText,
      confidence: adjustedConfidence,
      notes: this.generateStyleNotes(
        output,
        analyticalDepth,
        specificity,
        comprehensiveness,
        evidenceQuality,
      ),
      metadata: {
        ...output.metadata,
        styleAnalysisQuality: {
          overall: qualityScore,
          analyticalDepth,
          specificity,
          comprehensiveness,
          evidenceQuality,
        },
        dimensionsAnalyzed: this.countDimensions(processedText),
        examplesProvided: this.countExamples(processedText),
      },
    });
  }

  private cleanupStyleText(text: string): string {
    text = text.replace(/```json[\s\S]*?```/g, "");
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/\{[\s\S]*?\}/g, (match) => {
      if (match.includes('"') && match.includes(":")) return "";
      return match;
    });

    text = text.replace(/\|[\s\S]*?\|/g, "");

    return text.replace(/\n{3,}/g, "\n\n").trim();
  }

  private assessAnalyticalDepth(text: string): number {
    let score = 0.5;

    const analyticalTerms = [
      "يتميز",
      "يلاحظ",
      "يظهر",
      "يكشف",
      "يوضح",
      "يدل",
      "يشير",
      "يعكس",
      "نلاحظ",
      "نجد",
    ];
    // SECURITY FIX: Use safe string matching to prevent ReDoS
    const termCount = analyticalTerms.reduce((count, term) => {
      // Use simple string matching instead of regex to prevent ReDoS
      const occurrences = text.split(term).length - 1;
      return count + occurrences;
    }, 0);
    score += Math.min(0.25, termCount * 0.02);

    const technicalTerms = [
      "المعجم",
      "النحو",
      "البلاغة",
      "الصرف",
      "الأسلوب",
      "التركيب",
      "الدلالة",
    ];
    // SECURITY FIX: Use safe string matching to prevent ReDoS
    const techCount = technicalTerms.reduce((count, term) => {
      // Use simple string matching instead of regex to prevent ReDoS
      const occurrences = text.split(term).length - 1;
      return count + occurrences;
    }, 0);
    score += Math.min(0.15, techCount * 0.03);

    if (text.length > 1500) score += 0.1;

    return Math.min(1, score);
  }

  private assessSpecificity(text: string): number {
    let score = 0.6;

    const hasQuotes = (text.match(/["«]/g) ?? []).length;
    score += Math.min(0.2, hasQuotes * 0.02);

    const hasExamples = text.includes("مثال") || text.includes("مثل");
    if (hasExamples) score += 0.1;

    const hasNumbers = (text.match(/\d+%|\d+\.\d+|نسبة|معدل|متوسط/g) ?? [])
      .length;
    score += Math.min(0.1, hasNumbers * 0.02);

    return Math.min(1, score);
  }

  private assessComprehensiveness(text: string): number {
    let score = 0.5;

    const dimensions = ["معجم", "نحو", "بلاغ", "أسلوب", "إيقاع", "نبرة"];
    const dimensionsCovered = dimensions.filter((dim) =>
      text.toLowerCase().includes(dim),
    ).length;
    score += (dimensionsCovered / dimensions.length) * 0.3;

    const sections = text.split("\n\n").filter((s) => s.trim().length > 100);
    if (sections.length >= 4) score += 0.2;

    return Math.min(1, score);
  }

  private assessEvidenceQuality(text: string): number {
    let score = 0.6;

    const evidenceWords = [
      "مثل",
      "كما في",
      "نجد",
      "يظهر ذلك",
      "على سبيل المثال",
      "مثلاً",
    ];
    // SECURITY FIX: Use safe string matching to prevent ReDoS
    const evidenceCount = evidenceWords.reduce((count, word) => {
      // Use simple string matching instead of regex to prevent ReDoS
      const occurrences = text.split(word).length - 1;
      return count + occurrences;
    }, 0);
    score += Math.min(0.25, evidenceCount * 0.05);

    const hasDirectQuotes = (text.match(/["«][^"»]{10,}["»]/g) ?? []).length;
    if (hasDirectQuotes >= 3) score += 0.15;

    return Math.min(1, score);
  }

  private countDimensions(text: string): number {
    const dimensionMarkers = ["معجمي", "نحوي", "بلاغي", "موضوعي", "أسلوبي"];
    return dimensionMarkers.filter((marker) =>
      text.toLowerCase().includes(marker),
    ).length;
  }

  private countExamples(text: string): number {
    const exampleMarkers = text.match(/مثال|مثل:|على سبيل المثال|كما في|["«]/g);
    return exampleMarkers ? Math.min(exampleMarkers.length, 20) : 0;
  }

  private generateStyleNotes(
    output: StandardAgentOutput,
    depth: number,
    specificity: number,
    comprehensiveness: number,
    evidence: number,
  ): string[] {
    const notes: string[] = [];
    const avg = (depth + specificity + comprehensiveness + evidence) / 4;
    notes.push(this.overallStyleNote(avg));
    this.addStyleStrengths(
      notes,
      depth,
      specificity,
      comprehensiveness,
      evidence,
    );
    this.addStyleWeaknesses(notes, depth, specificity, comprehensiveness);
    if (output.notes) notes.push(...output.notes);
    return notes;
  }

  private overallStyleNote(avg: number): string {
    if (avg > 0.8) return "تحليل أسلوبي ممتاز";
    if (avg > 0.65) return "تحليل جيد";
    return "يحتاج مزيد من العمق";
  }

  private addStyleStrengths(
    notes: string[],
    d: number,
    s: number,
    c: number,
    e: number,
  ): void {
    if (d > 0.8) notes.push("عمق تحليلي عالي");
    if (s > 0.8) notes.push("أمثلة محددة");
    if (c > 0.75) notes.push("شمولية جيدة");
    if (e > 0.8) notes.push("أدلة قوية");
  }

  private addStyleWeaknesses(
    notes: string[],
    d: number,
    s: number,
    c: number,
  ): void {
    if (d < 0.5) notes.push("يحتاج عمق أكبر");
    if (s < 0.5) notes.push("يحتاج أمثلة أكثر");
    if (c < 0.6) notes.push("يحتاج تغطية أوسع");
  }

  private translateDepth(depth: string): string {
    const depths: Record<string, string> = {
      basic: "أساسي",
      detailed: "مفصل",
      comprehensive: "شامل ومعمق",
    };
    return depths[depth] ?? depth;
  }

  private translateFocusArea(area: string): string {
    const areas: Record<string, string> = {
      lexical: "معجمي",
      syntactic: "نحوي",
      rhetorical: "بلاغي",
      thematic: "موضوعي",
      stylistic: "أسلوبي",
    };
    return areas[area] ?? area;
  }

  protected override getFallbackResponse(
    _input: StandardAgentInput,
  ): Promise<string> {
    return Promise.resolve(`التحليل المعجمي:
النص يظهر تنوعاً معجمياً يعكس مستوى لغوي متوسط إلى مرتفع.

التحليل النحوي:
الجمل متوسطة الطول مع تنوع في البنية بين البسيطة والمركبة.

التحليل البلاغي:
استخدام معتدل للأساليب البلاغية مع بعض الصور المجازية.

البصمة الأسلوبية:
الأسلوب يتميز بـ[خصائص عامة تحتاج تفصيل أكثر].

ملاحظة: يُرجى تفعيل الخيارات المتقدمة وتوفير نص أطول للحصول على تحليل أسلوبي أكثر دقة وشمولاً.`);
  }
}

export const styleFingerprintAgent = new StyleFingerprintAgent();
