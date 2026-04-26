import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import { asAgentContext } from "../shared/contextAccess";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { TENSION_OPTIMIZER_AGENT_CONFIG } from "./agent";
import {
  buildOriginalTextSection,
  buildSceneBreakdownSection,
  buildTensionInfoSection,
  buildConditionalInstructions,
  getBaseInstructions,
  getMiddleInstructions,
  getClosingInstructions,
} from "./prompt-builder";

interface TensionOptimizerContext {
  originalText?: string;
  analysisReport?: unknown;
  sceneBreakdown?: unknown[];
  currentTensionLevel?: string; // 'low', 'medium', 'high', 'critical'
  targetTensionLevel?: string;
  tensionType?: string; // 'suspense', 'conflict', 'anticipation', 'mystery'
  pacePreference?: string; // 'slow-burn', 'steady', 'rapid', 'explosive'
  provideRecommendations?: boolean;
  identifyPeaks?: boolean;
  analyzeRelease?: boolean;
}

/**
 * Tension Optimizer Agent - وكيل تحسين التوتر الدرامي
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON
 */
export class TensionOptimizerAgent extends BaseAgent {
  constructor() {
    super(
      "TensionMaster AI",
      TaskType.TENSION_OPTIMIZER,
      TENSION_OPTIMIZER_AGENT_CONFIG.systemPrompt ?? ""
    );

    this.confidenceFloor = 0.81;
  }

  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;
    const ctx = asAgentContext(context) as TensionOptimizerContext;

    // Extract context with defaults
    const originalText = ctx?.originalText ?? "";
    const sceneBreakdown = ctx?.sceneBreakdown ?? [];
    const currentTensionLevel = ctx?.currentTensionLevel ?? "medium";
    const targetTensionLevel = ctx?.targetTensionLevel ?? "high";
    const tensionType = ctx?.tensionType ?? "suspense";
    const pacePreference = ctx?.pacePreference ?? "steady";
    const provideRecommendations = ctx?.provideRecommendations ?? true;
    const identifyPeaks = ctx?.identifyPeaks ?? true;
    const analyzeRelease = ctx?.analyzeRelease ?? true;

    // Build prompt sections
    let prompt = `مهمة تحسين وتحليل التوتر الدرامي\n\n`;
    prompt += buildOriginalTextSection(originalText);
    prompt += buildSceneBreakdownSection(sceneBreakdown);
    prompt += buildTensionInfoSection({
      currentLevel: currentTensionLevel,
      targetLevel: targetTensionLevel,
      tensionType,
      pacePreference,
      identifyPeaks,
      analyzeRelease,
      provideRecommendations,
      translateLevel: (level) => this.translateLevel(level),
      translateTensionType: (type) => this.translateTensionType(type),
      translatePace: (pace) => this.translatePace(pace),
    });
    prompt += `المهمة المطلوبة:\n${taskInput}\n\n`;
    prompt += getBaseInstructions();
    prompt += buildConditionalInstructions(
      identifyPeaks,
      analyzeRelease,
      provideRecommendations
    );
    prompt += getMiddleInstructions();
    prompt += getClosingInstructions();

    return prompt;
  }

  protected override async postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
    const processedText = this.cleanupTensionText(output.text);

    const analysisDepth = this.assessAnalysisDepth(processedText);
    const techniqueIdentification =
      this.assessTechniqueIdentification(processedText);
    const practicalValue = this.assessPracticalValue(processedText);
    const insightfulness = this.assessInsightfulness(processedText);

    const qualityScore =
      analysisDepth * 0.3 +
      techniqueIdentification * 0.25 +
      practicalValue * 0.25 +
      insightfulness * 0.2;

    const adjustedConfidence = output.confidence * 0.5 + qualityScore * 0.5;

    return Promise.resolve({
      ...output,
      text: processedText,
      confidence: adjustedConfidence,
      notes: this.generateTensionNotes(
        output,
        analysisDepth,
        techniqueIdentification,
        practicalValue,
        insightfulness
      ),
      metadata: {
        ...output.metadata,
        tensionAnalysisQuality: {
          overall: qualityScore,
          analysisDepth,
          techniqueIdentification,
          practicalValue,
          insightfulness,
        },
        peaksIdentified: this.countPeaks(processedText),
        techniquesIdentified: this.countTechniques(processedText),
        recommendationsProvided: this.countRecommendations(processedText),
      },
    });
  }

  private cleanupTensionText(text: string): string {
    text = text.replace(/```json[\s\S]*?```/g, "");
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/\{[\s\S]*?\}/g, (match) => {
      if (match.includes('"') && match.includes(":")) return "";
      return match;
    });

    return text.replace(/\n{3,}/g, "\n\n").trim();
  }

  private assessAnalysisDepth(text: string): number {
    let score = 0.5;

    const tensionTerms = [
      "توتر",
      "تشويق",
      "ترقب",
      "قلق",
      "خوف",
      "ذروة",
      "تصاعد",
      "تراكم",
    ];
    // SECURITY FIX: Use safe string matching to prevent ReDoS
    const termCount = tensionTerms.reduce((count, term) => {
      // Use simple string matching instead of regex to prevent ReDoS
      const occurrences = text.split(term).length - 1;
      return count + occurrences;
    }, 0);
    score += Math.min(0.25, termCount * 0.02);

    const analyticalTerms = [
      "يتطور",
      "يتصاعد",
      "ينخفض",
      "يبلغ",
      "يحافظ",
      "يبني",
      "يخفف",
    ];
    // SECURITY FIX: Use safe string matching to prevent ReDoS
    const analyticCount = analyticalTerms.reduce((count, term) => {
      // Use simple string matching instead of regex to prevent ReDoS
      const occurrences = text.split(term).length - 1;
      return count + occurrences;
    }, 0);
    score += Math.min(0.15, analyticCount * 0.03);

    if (text.length > 1500) score += 0.1;

    return Math.min(1, score);
  }

  private assessTechniqueIdentification(text: string): number {
    let score = 0.5;

    const techniques = [
      "تأخير",
      "تعليق",
      "غموض",
      "صراع",
      "وقت",
      "رهان",
      "تنبؤ",
      "تلميح",
      "مفاجأة",
    ];
    // SECURITY FIX: Use safe string matching to prevent ReDoS
    const techCount = techniques.reduce((count, tech) => {
      // Use simple string matching instead of regex to prevent ReDoS
      const occurrences = text.split(tech).length - 1;
      return count + occurrences;
    }, 0);
    score += Math.min(0.35, techCount * 0.04);

    const hasTechniqueSection =
      text.includes("تقنيات") || text.includes("أساليب");
    if (hasTechniqueSection) score += 0.15;

    return Math.min(1, score);
  }

  private assessPracticalValue(text: string): number {
    let score = 0.6;

    const practicalTerms = [
      "يمكن",
      "يُنصح",
      "يُفضل",
      "توصية",
      "اقتراح",
      "بدلاً من",
      "الأفضل",
    ];
    // SECURITY FIX: Use safe string matching to prevent ReDoS
    const practicalCount = practicalTerms.reduce((count, term) => {
      // Use simple string matching instead of regex to prevent ReDoS
      const occurrences = text.split(term).length - 1;
      return count + occurrences;
    }, 0);
    score += Math.min(0.25, practicalCount * 0.03);

    const hasExamples = text.includes("مثال") || text.includes("مثل");
    if (hasExamples) score += 0.15;

    return Math.min(1, score);
  }

  private assessInsightfulness(text: string): number {
    let score = 0.5;

    const insightWords = [
      "يكشف",
      "يوضح",
      "الأهمية",
      "التأثير",
      "الفرصة",
      "الإمكانية",
      "نلاحظ",
    ];
    // SECURITY FIX: Use safe string matching to prevent ReDoS
    const insightCount = insightWords.reduce((count, word) => {
      // Use simple string matching instead of regex to prevent ReDoS
      const occurrences = text.split(word).length - 1;
      return count + occurrences;
    }, 0);
    score += Math.min(0.3, insightCount * 0.03);

    const hasEvaluation =
      text.includes("فعال") || text.includes("ناجح") || text.includes("ضعيف");
    if (hasEvaluation) score += 0.2;

    return Math.min(1, score);
  }

  private countPeaks(text: string): number {
    const peakMarkers = text.match(/ذروة|قمة|أقصى|الذروة|نقطة/gi);
    return peakMarkers ? Math.min(peakMarkers.length, 8) : 0;
  }

  private countTechniques(text: string): number {
    const techMarkers = text.match(/تقنية|أسلوب|طريقة|استخدام|يستخدم/gi);
    return techMarkers ? Math.min(techMarkers.length, 10) : 0;
  }

  private countRecommendations(text: string): number {
    const recMarkers = text.match(/يُنصح|يُفضل|توصية|اقتراح|يمكن تحسين/gi);
    return recMarkers ? Math.min(recMarkers.length, 12) : 0;
  }

  private generateTensionNotes(
    output: StandardAgentOutput,
    depth: number,
    techniques: number,
    practical: number,
    insight: number
  ): string[] {
    const notes: string[] = [];

    const avg = (depth + techniques + practical + insight) / 4;
    if (avg > 0.8) notes.push("تحليل توتر ممتاز");
    else if (avg > 0.65) notes.push("تحليل جيد");
    else notes.push("يحتاج عمق أكبر");

    if (depth > 0.8) notes.push("عمق تحليلي عالي");
    if (techniques > 0.75) notes.push("تحديد تقنيات شامل");
    if (practical > 0.75) notes.push("توصيات عملية");
    if (insight > 0.75) notes.push("رؤى ثاقبة");

    if (depth < 0.5) notes.push("يحتاج تحليل أعمق");
    if (techniques < 0.5) notes.push("يحتاج تحديد تقنيات أوضح");
    if (practical < 0.6) notes.push("يحتاج مزيد من التوصيات");

    if (output.notes && Array.isArray(output.notes)) {
      notes.push(...output.notes);
    }

    return notes;
  }

  private translateLevel(level: string): string {
    const levels: Record<string, string> = {
      none: "معدوم",
      low: "منخفض",
      medium: "متوسط",
      high: "عالي",
      critical: "حرج/ذروة",
      extreme: "شديد جداً",
    };
    return levels[level] ?? level;
  }

  private translateTensionType(type: string): string {
    const types: Record<string, string> = {
      suspense: "تشويق وترقب",
      conflict: "صراع",
      anticipation: "توقع وانتظار",
      mystery: "غموض",
      dread: "خوف وقلق",
      urgency: "إلحاح وضيق وقت",
    };
    return types[type] ?? type;
  }

  private translatePace(pace: string): string {
    const paces: Record<string, string> = {
      "slow-burn": "تصاعد بطيء ومستمر",
      steady: "ثابت ومتزن",
      rapid: "سريع ومتصاعد",
      explosive: "انفجاري ومفاجئ",
      variable: "متغير ومتذبذب",
    };
    return paces[pace] ?? pace;
  }

  protected override getFallbackResponse(
    _input: StandardAgentInput
  ): Promise<string> {
    return Promise.resolve(`تقييم التوتر الحالي:
النص يحتوي على مستوى توتر متوسط يحتاج إلى تعزيز وتحسين لتحقيق التأثير الدرامي المطلوب.

تحليل منحنى التوتر:
التوتر يبدأ بمستوى معتدل ويتصاعد تدريجياً، لكن التصاعد ليس حاداً بما يكفي. هناك لحظات واعدة يمكن استغلالها بشكل أفضل.

نقاط الذروة:
ذروة رئيسية واحدة في [موضع تقريبي] حيث يبلغ التوتر أقصاه، لكن البناء نحو هذه الذروة يحتاج تقوية.

لحظات التحرر:
التحرر يأتي سريعاً نوعاً ما بعد الذروة. يمكن إطالة لحظة التوتر القصوى قليلاً لتعزيز التأثير.

تقنيات بناء التوتر:
- التأخير: مستخدم بشكل محدود
- الغموض: موجود لكن يحتاج تعميق
- تصاعد الرهانات: فرصة غير مستغلة بالكامل

التوصيات:
1. تعزيز التلميحات المبكرة للخطر أو الصراع
2. إطالة لحظات الترقب قبل الكشف
3. رفع الرهانات تدريجياً عبر المشاهد
4. إضافة عناصر ضيق الوقت لزيادة الإلحاح
5. تأخير التحرر قليلاً بعد الذروة

التقييم النهائي: 6/10
التوتر موجود وفعال جزئياً، لكن هناك إمكانات كبيرة غير مستغلة لتحويله إلى تجربة أكثر إثارة وإشباعاً.

ملاحظة: يُرجى تفعيل الخيارات المتقدمة وتوفير المزيد من تفاصيل المشاهد للحصول على تحليل توتر أكثر دقة مع توصيات محددة وقابلة للتطبيق.`);
  }
}

export const tensionOptimizerAgent = new TensionOptimizerAgent();
