import { TaskType } from "@core/types";
import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";
import { DIALOGUE_FORENSICS_AGENT_CONFIG } from "./agent";
import { safeCountMultipleTerms } from "@/lib/security/safe-regexp";

interface DialogueForensicsContext {
  originalText?: string;
  analysisReport?: any;
  characters?: any[];
  dialogueSamples?: string[];
  focusAreas?: string[]; // ['authenticity', 'subtext', 'rhythm', 'character-voice', 'exposition']
  analyzePatterns?: boolean;
  identifyProblems?: boolean;
  provideRecommendations?: boolean;
}

/**
 * Dialogue Forensics Agent - وكيل تشريح الحوار
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON
 */
export class DialogueForensicsAgent extends BaseAgent {
  constructor() {
    super(
      "DialogueForensics AI",
      TaskType.DIALOGUE_FORENSICS,
      DIALOGUE_FORENSICS_AGENT_CONFIG.systemPrompt || ""
    );

    this.confidenceFloor = 0.83;
  }

  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;
    const ctx = context as DialogueForensicsContext;

    const originalText = ctx?.originalText || "";
    const characters = ctx?.characters || [];
    const dialogueSamples = ctx?.dialogueSamples || [];
    const focusAreas = ctx?.focusAreas || [
      "authenticity",
      "subtext",
      "character-voice",
    ];
    const analyzePatterns = ctx?.analyzePatterns ?? true;
    const identifyProblems = ctx?.identifyProblems ?? true;
    const provideRecommendations = ctx?.provideRecommendations ?? true;

    let prompt = `مهمة تشريح وتحليل الحوار الدرامي\n\n`;

    if (originalText) {
      prompt += `النص المراد تحليله:\n${originalText.substring(0, 2500)}...\n\n`;
    }

    if (characters.length > 0) {
      prompt += `الشخصيات في الحوار:\n`;
      characters.slice(0, 6).forEach((char: any, idx: number) => {
        const charName =
          typeof char === "string" ? char : char.name || `شخصية ${idx + 1}`;
        prompt += `${idx + 1}. ${charName}\n`;
      });
      prompt += "\n";
    }

    if (dialogueSamples.length > 0) {
      prompt += `نماذج حوارية للتحليل:\n`;
      dialogueSamples.slice(0, 3).forEach((sample, idx) => {
        prompt += `[حوار ${idx + 1}]: "${sample.substring(0, 200)}..."\n`;
      });
      prompt += "\n";
    }

    prompt += `مجالات التركيز: ${focusAreas.map(this.translateFocusArea).join("، ")}\n`;
    prompt += `تحليل الأنماط: ${analyzePatterns ? "نعم" : "لا"}\n`;
    prompt += `تحديد المشاكل: ${identifyProblems ? "نعم" : "لا"}\n`;
    prompt += `تقديم توصيات: ${provideRecommendations ? "نعم" : "لا"}\n\n`;

    prompt += `المهمة المطلوبة:\n${taskInput}\n\n`;

    prompt += `التعليمات:

1. **نظرة عامة** (2-3 جمل): قيّم الجودة العامة للحوار في النص

2. **الأصالة والطبيعية** (Authenticity):
   - هل يبدو الحوار طبيعياً وواقعياً؟
   - هل يعكس كيف يتحدث الناس فعلياً؟
   - أمثلة من حوارات ناجحة وأخرى تحتاج تحسين

3. **النص الباطني** (Subtext):
   - ما الذي يُقال تحت السطح؟
   - الصراعات والمشاعر غير المُصرّح بها
   - فعالية التلميح مقابل التصريح المباشر

4. **صوت الشخصية** (Character Voice):
   - تمايز الأصوات بين الشخصيات
   - اتساق صوت كل شخصية
   - مدى تعبير الحوار عن هوية الشخصية

5. **الإيقاع والتدفق** (Rhythm & Flow):
   - تنوع طول الجمل والعبارات
   - التوازن بين الحوار والحركة
   - وتيرة التبادل بين الشخصيات

6. **الوظيفة الدرامية**:
   - هل يدفع الحوار الحبكة للأمام؟
   - هل يكشف عن الشخصيات؟
   - هل يبني التوتر أو يحل الصراع؟

${
  analyzePatterns
    ? `7. **الأنماط المتكررة**:
   - عادات حوارية مميزة
   - تقنيات متكررة (جيدة أو سيئة)
   - الموتيفات الحوارية`
    : ""
}

${
  identifyProblems
    ? `8. **المشاكل الشائعة**:
   - الحوار التعليمي الواضح (On-the-nose dialogue)
   - الإفراط في الشرح والتوضيح
   - التكرار غير المبرر
   - عدم التمايز بين الشخصيات
   - الافتعال أو عدم الطبيعية`
    : ""
}

${
  provideRecommendations
    ? `9. **التوصيات والتحسينات**:
   - اقتراحات محددة وقابلة للتطبيق
   - أمثلة على كيفية إعادة صياغة حوارات ضعيفة
   - استراتيجيات لتقوية الحوار`
    : ""
}

10. **التقييم النهائي**: درجة من 10 مع تبرير موجز

اكتب بشكل نصي تحليلي مباشر مع أمثلة حوارية محددة من النص.
استخدم علامات اقتباس لتمييز الحوارات المقتبسة.
لا تستخدم JSON أو جداول معقدة - نص تحليلي واضح فقط.`;

    return prompt;
  }

  protected override async postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
    let processedText = this.cleanupDialogueText(output.text);

    const authenticity = await this.assessAuthenticity(processedText);
    const characterization = await this.assessCharacterization(processedText);
    const functionality = await this.assessFunctionality(processedText);
    const technicalQuality = await this.assessTechnicalQuality(processedText);

    const qualityScore =
      authenticity * 0.3 +
      characterization * 0.25 +
      functionality * 0.25 +
      technicalQuality * 0.2;

    const adjustedConfidence = output.confidence * 0.5 + qualityScore * 0.5;

    return {
      ...output,
      text: processedText,
      confidence: adjustedConfidence,
      notes: this.generateDialogueNotes(
        output,
        authenticity,
        characterization,
        functionality,
        technicalQuality
      ),
      metadata: {
        ...output.metadata,
        dialogueAnalysisQuality: {
          overall: qualityScore,
          authenticity,
          characterization,
          functionality,
          technicalQuality,
        },
        problemsIdentified: this.countProblems(processedText),
        recommendationsProvided: this.countRecommendations(processedText),
        dialogueSamplesAnalyzed: this.countDialogueSamples(processedText),
      } as any,
    };
  }

  private cleanupDialogueText(text: string): string {
    text = text.replace(/```json[\s\S]*?```/g, "");
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/\{[\s\S]*?\}/g, (match) => {
      if (match.includes('"') && match.includes(":")) return "";
      return match;
    });

    return text.replace(/\n{3,}/g, "\n\n").trim();
  }

  private async assessAuthenticity(text: string): Promise<number> {
    let score = 0.5;

    const authenticityTerms = [
      "طبيعي",
      "واقعي",
      "أصيل",
      "حقيقي",
      "مقنع",
      "صادق",
      "عفوي",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const termCount = safeCountMultipleTerms(text, authenticityTerms);
    score += Math.min(0.25, termCount * 0.04);

    const negativeTerms = ["مفتعل", "غير طبيعي", "متكلف", "مصطنع"];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const negCount = safeCountMultipleTerms(text, negativeTerms);
    score -= Math.min(0.2, negCount * 0.05);

    const hasExamples = (text.match(/["«]/g) || []).length >= 3;
    if (hasExamples) score += 0.15;

    return Math.min(1, Math.max(0, score));
  }

  private async assessCharacterization(text: string): Promise<number> {
    let score = 0.6;

    const charTerms = [
      "صوت الشخصية",
      "تمايز",
      "مميز",
      "فريد",
      "اتساق",
      "متسق",
      "يعكس",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const charCount = safeCountMultipleTerms(text, charTerms);
    score += Math.min(0.25, charCount * 0.03);

    const hasVoiceAnalysis = text.includes("الشخصية") && text.includes("حوار");
    if (hasVoiceAnalysis) score += 0.15;

    return Math.min(1, score);
  }

  private async assessFunctionality(text: string): Promise<number> {
    let score = 0.5;

    const functionalTerms = [
      "يدفع",
      "يكشف",
      "يطور",
      "يبني",
      "وظيفة",
      "يخدم",
      "يساهم",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const funcCount = safeCountMultipleTerms(text, functionalTerms);
    score += Math.min(0.3, funcCount * 0.03);

    const hasPurposeAnalysis =
      text.includes("الغرض") ||
      text.includes("الهدف") ||
      text.includes("الوظيفة");
    if (hasPurposeAnalysis) score += 0.2;

    return Math.min(1, score);
  }

  private async assessTechnicalQuality(text: string): Promise<number> {
    let score = 0.6;

    const technicalTerms = [
      "إيقاع",
      "تدفق",
      "توازن",
      "وتيرة",
      "تنوع",
      "بنية",
      "صياغة",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const techCount = safeCountMultipleTerms(text, technicalTerms);
    score += Math.min(0.25, techCount * 0.04);

    if (text.length > 1500) score += 0.15;

    return Math.min(1, score);
  }

  private countProblems(text: string): number {
    const problemMarkers = text.match(
      /مشكلة|خطأ|ضعف|يحتاج تحسين|افتعال|تكرار غير مبرر/gi
    );
    return problemMarkers ? Math.min(problemMarkers.length, 10) : 0;
  }

  private countRecommendations(text: string): number {
    const recMarkers = text.match(
      /يُنصح|يُفضل|توصية|اقتراح|يمكن تحسين|بدلاً من|الأفضل/gi
    );
    return recMarkers ? Math.min(recMarkers.length, 12) : 0;
  }

  private countDialogueSamples(text: string): number {
    const samples = text.match(/["«]/g);
    return samples ? Math.floor(samples.length / 2) : 0;
  }

  private generateDialogueNotes(
    output: StandardAgentOutput,
    authenticity: number,
    characterization: number,
    functionality: number,
    technical: number
  ): string[] {
    const notes: string[] = [];

    const avg =
      (authenticity + characterization + functionality + technical) / 4;
    if (avg > 0.8) notes.push("تحليل حواري ممتاز");
    else if (avg > 0.65) notes.push("تحليل جيد");
    else notes.push("يحتاج عمق أكبر");

    if (authenticity > 0.75) notes.push("تقييم أصالة دقيق");
    if (characterization > 0.75) notes.push("تحليل أصوات قوي");
    if (functionality > 0.75) notes.push("تقييم وظيفي جيد");
    if (technical > 0.75) notes.push("تحليل تقني شامل");

    if (authenticity < 0.5) notes.push("يحتاج تركيز على الطبيعية");
    if (characterization < 0.5) notes.push("يحتاج تحليل أعمق للأصوات");
    if (functionality < 0.5) notes.push("يحتاج تقييم أفضل للوظيفة");

    if (output.notes) notes.push(...output.notes);

    return notes;
  }

  private translateFocusArea(area: string): string {
    const areas: Record<string, string> = {
      authenticity: "الأصالة والطبيعية",
      subtext: "النص الباطني",
      rhythm: "الإيقاع والتدفق",
      "character-voice": "صوت الشخصية",
      exposition: "الشرح والتوضيح",
      conflict: "بناء الصراع",
      pacing: "الوتيرة",
    };
    return areas[area] || area;
  }

  protected override async getFallbackResponse(
    _input: StandardAgentInput
  ): Promise<string> {
    return `نظرة عامة:
الحوار في النص يحتاج إلى تقييم شامل للأصالة والوظيفة الدرامية.

الأصالة والطبيعية:
الحوار يتراوح بين الطبيعي والمفتعل في بعض المواضع. يحتاج مزيد من العفوية.

صوت الشخصية:
درجة التمايز بين الشخصيات متوسطة. بعض الشخصيات لها أصوات مميزة بينما أخرى متشابهة.

الوظيفة الدرامية:
الحوار يخدم الحبكة بشكل عام لكن هناك مواضع تحتاج تركيز أكثر على دفع الأحداث.

المشاكل الشائعة:
- بعض الحوار التعليمي المباشر
- تكرار غير مبرر في بعض العبارات
- حاجة لمزيد من النص الباطني

التوصيات:
- تعزيز التمايز بين أصوات الشخصيات
- تقليل الشرح المباشر لصالح الإيحاء
- إضافة مزيد من التوتر والصراع في الحوارات الرئيسية

التقييم: 6.5/10 - حوار وظيفي يحتاج صقل وتعميق

ملاحظة: يُرجى تفعيل الخيارات المتقدمة وتوفير المزيد من نماذج الحوار للحصول على تحليل تشريحي أكثر تفصيلاً ودقة مع أمثلة محددة وتوصيات قابلة للتطبيق.`;
  }
}

export const dialogueForensicsAgent = new DialogueForensicsAgent();
