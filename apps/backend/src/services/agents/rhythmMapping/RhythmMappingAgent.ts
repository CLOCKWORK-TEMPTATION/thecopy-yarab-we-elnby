 
import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import { safeCountMultipleTerms, sumCounts } from "../shared/safe-regexp";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { RHYTHM_MAPPING_AGENT_CONFIG } from "./agent";

interface RhythmSceneItem {
  description?: string;
  length?: number;
}

interface RhythmMappingContext {
  originalText?: string;
  analysisReport?: unknown;
  sceneBreakdown?: (string | RhythmSceneItem)[];
  focusAspects?: string[];
  identifyPatterns?: boolean;
  analyzeVariation?: boolean;
  compareGenreNorms?: boolean;
  provideOptimization?: boolean;
  genre?: string;
}

/**
 * Rhythm Mapping Agent - وكيل خريطة الإيقاع السردي
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON
 */
export class RhythmMappingAgent extends BaseAgent {
  constructor() {
    super(
      "RhythmMapper AI",
      TaskType.RHYTHM_MAPPING,
      RHYTHM_MAPPING_AGENT_CONFIG.systemPrompt ?? ""
    );

    this.confidenceFloor = 0.8;
  }

  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;
    const ctx = context as RhythmMappingContext;

    const focusAspects = ctx?.focusAspects ?? ["pacing", "tempo", "flow"];
    const genre = ctx?.genre ?? "غير محدد";

    let prompt = `مهمة رسم خريطة الإيقاع السردي\n\n`;
    prompt += this.buildTextSection(ctx?.originalText ?? "");
    prompt += this.buildSceneSection(ctx?.sceneBreakdown ?? []);
    prompt += this.buildAnalysisInfo(ctx, genre, focusAspects);
    prompt += `المهمة المطلوبة:\n${taskInput}\n\n`;
    prompt += this.buildRhythmInstructions(ctx, genre);

    return prompt;
  }

  private buildTextSection(text: string): string {
    return text ? `النص المراد تحليله:\n${text.substring(0, 2500)}...\n\n` : "";
  }

  private buildSceneSection(scenes: (string | RhythmSceneItem)[]): string {
    if (scenes.length === 0) return "";
    let section = `تفصيل المشاهد:\n`;
    scenes.slice(0, 6).forEach((scene, idx) => {
      const desc = typeof scene === "string" ? scene : (scene.description ?? `مشهد ${idx + 1}`);
      const len = typeof scene === "object" && scene.length ? ` (${scene.length} كلمة)` : "";
      section += `${idx + 1}. ${desc}${len}\n`;
    });
    return section + "\n";
  }

   
  private buildAnalysisInfo(ctx: RhythmMappingContext | undefined, genre: string, focusAspects: string[]): string {
    let section = `معلومات التحليل:\n`;
    section += `- النوع الأدبي: ${genre}\n`;
    section += `- جوانب التركيز: ${focusAspects.map((aspect) => this.translateAspect(aspect)).join("، ")}\n`;
    section += `- تحديد الأنماط: ${(ctx?.identifyPatterns ?? true) ? "نعم" : "لا"}\n`;
    section += `- تحليل التنوع: ${(ctx?.analyzeVariation ?? true) ? "نعم" : "لا"}\n`;
    section += `- مقارنة بمعايير النوع: ${(ctx?.compareGenreNorms ?? false) ? "نعم" : "لا"}\n`;
    section += `- تحسينات مقترحة: ${(ctx?.provideOptimization ?? true) ? "نعم" : "لا"}\n\n`;
    return section;
  }

   
  private buildRhythmInstructions(ctx: RhythmMappingContext | undefined, genre: string): string {
    const identifyPatterns = ctx?.identifyPatterns ?? true;
    const analyzeVariation = ctx?.analyzeVariation ?? true;
    const compareGenreNorms = ctx?.compareGenreNorms ?? false;
    const provideOptimization = ctx?.provideOptimization ?? true;

    return `التعليمات:

1. **نظرة عامة على الإيقاع** (3-4 جمل):
   - الطابع الإيقاعي العام للنص
   - السرعة الإجمالية (بطيء، متوسط، سريع)
   - مدى التنوع والديناميكية
   - الانطباع العام على القارئ

2. **تحليل الوتيرة** (Pacing):
   - سرعة تطور الأحداث
   - التوازن بين الحركة والسكون
   - المشاهد السريعة مقابل المشاهد البطيئة
   - فعالية الوتيرة في كل قسم
   - الأدلة النصية: أمثلة محددة

3. **النبضات السردية** (Narrative Beats):
   - اللحظات المحورية (Beats) الرئيسية
   - توقيت وتوزيع النبضات
   - كثافة الأحداث في كل قسم
   - النبضات الكبرى (Major Beats) مقابل الصغرى (Minor Beats)

4. **الإيقاع الزمني** (Tempo):
   - التسارع والتباطؤ
   - المقاطع المندفعة والهادئة
   - التحولات في السرعة ومبرراتها
   - الإيقاع المثالي لكل نوع من المشاهد

5. **التدفق والسلاسة** (Flow):
   - الانتقالات بين المشاهد والفصول
   - العوائق أو الانقطاعات في التدفق
   - الاستمرارية والتماسك الإيقاعي
   - السلاسة الزمنية والمكانية

${identifyPatterns ? `6. **الأنماط الإيقاعية**:
   - الدورات المتكررة (إن وجدت)
   - البنى الإيقاعية (مثل: بطيء-سريع-بطيء)
   - التناوب والتبادل
   - التوازي والتماثل` : ""}

${analyzeVariation ? `7. **التنوع والديناميكية**:
   - مدى تنوع الإيقاع
   - تجنب الرتابة والملل
   - التباين بين الأقسام
   - المفاجآت الإيقاعية` : ""}

8. **البنية الإيقاعية الكلية**:
   - القوس الإيقاعي للنص بأكمله
   - البداية، الوسط، النهاية إيقاعياً
   - نقاط التحول الإيقاعية الكبرى
   - التصاعد والهبوط العام

${compareGenreNorms ? `9. **المقارنة بمعايير النوع**:
   - كيف يقارن الإيقاع بما هو معتاد في نوع ${genre}
   - الانحرافات الإيجابية أو السلبية
   - مدى تلبية توقعات القراء` : ""}

${provideOptimization ? `10. **التحسينات المقترحة**:
   - مواضع تحتاج تسريع
   - مواضع تحتاج إبطاء
   - فرص لتحسين التدفق
   - اقتراحات لزيادة التنوع
   - تعديلات على البنية الإيقاعية` : ""}

11. **الرسم البياني الوصفي**:
    وصف نصي لمنحنى الإيقاع عبر النص:
    - استخدم مؤشرات نصية (▲ للتسارع، ▼ للتباطؤ، ━ للثبات)
    - وصف الموجات الإيقاعية
    - تحديد القمم والقيعان

12. **التقييم النهائي**:
    - فعالية الإيقاع الحالي (درجة من 10)
    - نقاط القوة الإيقاعية
    - المجالات الأكثر حاجة للتحسين

اكتب بشكل نصي تحليلي واضح مع أمثلة محددة من النص.
استخدم وصف نصي للأنماط والمنحنيات.
لا تستخدم JSON أو رسومات معقدة - وصف تحليلي مباشر فقط.`;
  }

  protected override postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
    const processedText = this.cleanupRhythmText(output.text);

    const analysisComprehensiveness =
      this.assessAnalysisComprehensiveness(processedText);
    const technicalPrecision =
      this.assessTechnicalPrecision(processedText);
    const practicalInsight = this.assessPracticalInsight(processedText);
    const evidenceQuality = this.assessEvidenceQuality(processedText);

    const qualityScore =
      analysisComprehensiveness * 0.3 +
      technicalPrecision * 0.25 +
      practicalInsight * 0.25 +
      evidenceQuality * 0.2;

    const adjustedConfidence = output.confidence * 0.5 + qualityScore * 0.5;

    return Promise.resolve({
      ...output,
      text: processedText,
      confidence: adjustedConfidence,
      notes: this.generateRhythmNotes(
        output,
        analysisComprehensiveness,
        technicalPrecision,
        practicalInsight,
        evidenceQuality
      ),
      metadata: {
        ...output.metadata,
        rhythmAnalysisQuality: {
          overall: qualityScore,
          analysisComprehensiveness,
          technicalPrecision,
          practicalInsight,
          evidenceQuality,
        },
        patternsIdentified: this.countPatterns(processedText),
        beatsIdentified: this.countBeats(processedText),
        optimizationSuggestions: this.countOptimizations(processedText),
      },
    });
  }

  private cleanupRhythmText(text: string): string {
    text = text.replace(/```json[\s\S]*?```/g, "");
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/\{[\s\S]*?\}/g, (match) => {
      if (match.includes('"') && match.includes(":")) return "";
      return match;
    });

    return text.replace(/\n{3,}/g, "\n\n").trim();
  }

  private assessAnalysisComprehensiveness(text: string): number {
    let score = 0.5;

    const rhythmTerms = [
      "إيقاع",
      "وتيرة",
      "سرعة",
      "نبض",
      "تدفق",
      "تسارع",
      "تباطؤ",
      "ديناميكية",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const termCount = safeCountMultipleTerms(text, rhythmTerms);
    score += Math.min(0.25, sumCounts(termCount) * 0.015);

    const aspectsTerms = [
      "سريع",
      "بطيء",
      "متوسط",
      "هادئ",
      "مندفع",
      "ثابت",
      "متغير",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const aspectsCount = safeCountMultipleTerms(text, aspectsTerms);
    score += Math.min(0.15, sumCounts(aspectsCount) * 0.02);

    if (text.length > 1500) score += 0.1;

    return Math.min(1, score);
  }

  private assessTechnicalPrecision(text: string): number {
    let score = 0.6;

    const technicalTerms = [
      "نبضة",
      "beat",
      "tempo",
      "pacing",
      "قوس",
      "منحنى",
      "تصاعد",
      "هبوط",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const techCount = safeCountMultipleTerms(text, technicalTerms);
    score += Math.min(0.25, sumCounts(techCount) * 0.03);

    const hasVisualIndicators =
      text.includes("▲") || text.includes("▼") || text.includes("━");
    if (hasVisualIndicators) score += 0.15;

    return Math.min(1, score);
  }

  private assessPracticalInsight(text: string): number {
    let score = 0.5;

    const insightWords = [
      "يمكن",
      "يُنصح",
      "يُفضل",
      "توصية",
      "تحسين",
      "تعديل",
      "فرصة",
      "إمكانية",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const insightCount = safeCountMultipleTerms(text, insightWords);
    score += Math.min(0.3, sumCounts(insightCount) * 0.03);

    const hasOptimization = text.includes("تحسين") || text.includes("اقتراح");
    if (hasOptimization) score += 0.2;

    return Math.min(1, score);
  }

  private assessEvidenceQuality(text: string): number {
    let score = 0.6;

    const evidenceMarkers = [
      "مثل",
      "كما في",
      "نرى",
      "يظهر",
      "في المشهد",
      "المقطع",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const evidenceCount = safeCountMultipleTerms(text, evidenceMarkers);
    score += Math.min(0.25, sumCounts(evidenceCount) * 0.025);

    const hasExamples = (text.match(/["«]/g) ?? []).length >= 2;
    if (hasExamples) score += 0.15;

    return Math.min(1, score);
  }

  private countPatterns(text: string): number {
    const patternMarkers = text.match(/نمط|دورة|تكرار|تناوب|توازي/gi);
    return patternMarkers ? Math.min(patternMarkers.length, 8) : 0;
  }

  private countBeats(text: string): number {
    const beatMarkers = text.match(/نبضة|beat|لحظة محورية|حدث رئيسي/gi);
    return beatMarkers ? Math.min(beatMarkers.length, 15) : 0;
  }

  private countOptimizations(text: string): number {
    const optMarkers = text.match(/يُنصح|يُفضل|تحسين|اقتراح|تعديل|يمكن/gi);
    return optMarkers ? Math.min(optMarkers.length, 12) : 0;
  }

  private generateRhythmNotes(
    output: StandardAgentOutput,
    comprehensiveness: number,
    precision: number,
    insight: number,
    evidence: number
  ): string[] {
    const notes: string[] = [];
    const avg = (comprehensiveness + precision + insight + evidence) / 4;
    notes.push(this.overallRhythmNote(avg));
    this.addRhythmStrengthNotes(notes, comprehensiveness, precision, insight, evidence);
    this.addRhythmWeaknessNotes(notes, comprehensiveness, precision, insight);
    if (output.notes) notes.push(...output.notes);
    return notes;
  }

  private overallRhythmNote(avg: number): string {
    if (avg > 0.8) return "تحليل إيقاعي ممتاز";
    if (avg > 0.65) return "تحليل جيد";
    return "يحتاج عمق أكبر";
  }

  private addRhythmStrengthNotes(notes: string[], c: number, p: number, i: number, e: number): void {
    if (c > 0.8) notes.push("شمولية عالية");
    if (p > 0.75) notes.push("دقة تقنية جيدة");
    if (i > 0.75) notes.push("رؤى عملية ثاقبة");
    if (e > 0.75) notes.push("أدلة نصية جيدة");
  }

  private addRhythmWeaknessNotes(notes: string[], c: number, p: number, i: number): void {
    if (c < 0.6) notes.push("يحتاج تغطية أوسع");
    if (p < 0.5) notes.push("يحتاج دقة تقنية أكبر");
    if (i < 0.6) notes.push("يحتاج مزيد من التوصيات");
  }

  private translateAspect(aspect: string): string {
    const aspects: Record<string, string> = {
      pacing: "الوتيرة",
      beats: "النبضات السردية",
      tempo: "الإيقاع الزمني",
      flow: "التدفق والسلاسة",
      structure: "البنية الإيقاعية",
      variation: "التنوع والديناميكية",
      patterns: "الأنماط المتكررة",
    };
    return aspects[aspect] ?? aspect;
  }

  protected override getFallbackResponse(
    _input: StandardAgentInput
  ): Promise<string> {
    return Promise.resolve(`نظرة عامة على الإيقاع:
النص يتبع إيقاعاً متوسط السرعة مع تنوع معتدل بين المشاهد السريعة والبطيئة.

تحليل الوتيرة:
الوتيرة العامة متوازنة، مع ميل نحو البطء في المشاهد الوصفية والتسارع في مشاهد الحركة والصراع.

النبضات السردية:
النبضات الرئيسية موزعة بشكل معقول عبر النص، مع كثافة أعلى في الثلث الأخير.

الإيقاع الزمني:
البداية: ━━━━ (ثابت)
الوسط: ━━▲▲━ (تسارع تدريجي)
النهاية: ▲▲▲▼ (تسارع ثم تحرر)

التدفق والسلاسة:
الانتقالات بين المشاهد سلسة عموماً، مع بعض القفزات المفاجئة التي قد تحتاج نعومة أكبر.

الأنماط الإيقاعية:
نمط "تصاعد-ذروة-هبوط" يتكرر عدة مرات بشكل صغير قبل الذروة الكبرى النهائية.

التنوع والديناميكية:
تنوع معتدل. هناك فرص لزيادة التباين بين المشاهد لتجنب الرتابة.

البنية الإيقاعية الكلية:
القوس الإيقاعي يتبع البنية الكلاسيكية: بداية هادئة، تصاعد تدريجي، ذروة، ثم حل سريع نسبياً.

التحسينات المقترحة:
1. تسريع الثلث الأول قليلاً لجذب الانتباه مبكراً
2. إضافة "نبضات صغرى" أكثر في الوسط لكسر الرتابة
3. إبطاء الحل النهائي قليلاً لإعطاء إشباع أكبر
4. تعزيز التباين بين المشاهد السريعة والبطيئة
5. تحسين الانتقالات في 2-3 مواضع محددة

الرسم البياني الوصفي:
البداية (صفحات 1-30): ━━━━ (وتيرة ثابتة، متوسطة)
الصعود (صفحات 31-70): ━━▲▲▲ (تسارع تدريجي)
الذروة (صفحات 71-85): ▲▲▲ (سرعة قصوى، كثافة عالية)
الحل (صفحات 86-100): ▼▼━ (هبوط سريع ثم استقرار)

التقييم النهائي: 7/10
الإيقاع فعال بشكل عام ويخدم القصة، لكن هناك فرص لتحسينه وجعله أكثر ديناميكية وإشباعاً.

نقاط القوة: التصاعد المتزن، الذروة القوية، التوزيع المعقول للنبضات
المجالات المحتاجة تحسين: البداية تحتاج حيوية أكبر، الوسط يحتاج مزيد من التنوع، الحل سريع نسبياً

ملاحظة: يُرجى تفعيل الخيارات المتقدمة وتوفير المزيد من تفاصيل المشاهد والنوع الأدبي للحصول على خريطة إيقاعية أكثر دقة وتفصيلاً مع تحليل عميق للأنماط وتوصيات محددة قابلة للتطبيق.`);
  }
}

export const rhythmMappingAgent = new RhythmMappingAgent();
