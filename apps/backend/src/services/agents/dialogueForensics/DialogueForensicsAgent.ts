import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { DIALOGUE_FORENSICS_AGENT_CONFIG } from "./agent";
import {
  assessAuthenticity,
  assessCharacterization,
  assessFunctionality,
  assessTechnicalQuality,
  countProblems,
  countRecommendations,
  countDialogueSamples,
  cleanupDialogueText,
  translateFocusArea,
  generateDialogueNotes,
} from "./dialogue-assessment";

interface DialogueCharacter {
  name?: string;
  [key: string]: unknown;
}

interface DialogueForensicsContext {
  originalText?: string;
  analysisReport?: Record<string, unknown>;
  characters?: (string | DialogueCharacter)[];
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

    const analyzePatterns = ctx?.analyzePatterns ?? true;
    const identifyProblems = ctx?.identifyProblems ?? true;
    const provideRecommendations = ctx?.provideRecommendations ?? true;

    let prompt = `مهمة تشريح وتحليل الحوار الدرامي\n\n`;
    prompt += this.buildDialogueContextSection(ctx);
    prompt += `المهمة المطلوبة:\n${taskInput}\n\n`;
    prompt += this.buildDialogueInstructions(analyzePatterns, identifyProblems, provideRecommendations);

    return prompt;
  }

  /**
   * Build context section for dialogue forensics prompt
   */
  private buildDialogueContextSection(ctx: DialogueForensicsContext | undefined): string {
    let section = "";
    const originalText = ctx?.originalText || "";
    const characters = ctx?.characters || [];
    const dialogueSamples = ctx?.dialogueSamples || [];
    const focusAreas = ctx?.focusAreas || ["authenticity", "subtext", "character-voice"];

    if (originalText) {
      section += `النص المراد تحليله:\n${originalText.substring(0, 2500)}...\n\n`;
    }

    section += this.formatDialogueCharacters(characters);
    section += this.formatDialogueSamples(dialogueSamples);
    section += `مجالات التركيز: ${focusAreas.map(translateFocusArea).join("، ")}\n`;
    return section;
  }

  /**
   * Format characters list for dialogue prompt
   */
  private formatDialogueCharacters(characters: (string | DialogueCharacter)[]): string {
    if (characters.length === 0) return "";
    let result = `الشخصيات في الحوار:\n`;
    characters.slice(0, 6).forEach((char, idx) => {
      const charName =
        typeof char === "string" ? char : char.name || `شخصية ${idx + 1}`;
      result += `${idx + 1}. ${charName}\n`;
    });
    return result + "\n";
  }

  /**
   * Format dialogue samples for prompt
   */
  private formatDialogueSamples(dialogueSamples: string[]): string {
    if (dialogueSamples.length === 0) return "";
    let result = `نماذج حوارية للتحليل:\n`;
    dialogueSamples.slice(0, 3).forEach((sample, idx) => {
      result += `[حوار ${idx + 1}]: "${sample.substring(0, 200)}..."\n`;
    });
    return result + "\n";
  }

  /**
   * Build dialogue analysis instructions
   */
  private buildDialogueInstructions(
    analyzePatterns: boolean,
    identifyProblems: boolean,
    provideRecommendations: boolean,
  ): string {
    let instructions = `تحليل الأنماط: ${analyzePatterns ? "نعم" : "لا"}\n`;
    instructions += `تحديد المشاكل: ${identifyProblems ? "نعم" : "لا"}\n`;
    instructions += `تقديم توصيات: ${provideRecommendations ? "نعم" : "لا"}\n\n`;
    instructions += this.getBaseDialogueInstructions();
    instructions += this.getOptionalDialogueSections(analyzePatterns, identifyProblems, provideRecommendations);
    instructions += this.getDialogueClosingInstructions();
    return instructions;
  }

  /** Base dialogue analysis instructions (sections 1-6) */
  private getBaseDialogueInstructions(): string {
    return `التعليمات:

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

`;
  }

  /** Optional dialogue analysis sections (7-9) */
  private getOptionalDialogueSections(
    analyzePatterns: boolean,
    identifyProblems: boolean,
    provideRecommendations: boolean,
  ): string {
    let sections = "";
    if (analyzePatterns) {
      sections += `7. **الأنماط المتكررة**:
   - عادات حوارية مميزة
   - تقنيات متكررة (جيدة أو سيئة)
   - الموتيفات الحوارية

`;
    }
    if (identifyProblems) {
      sections += `8. **المشاكل الشائعة**:
   - الحوار التعليمي الواضح (On-the-nose dialogue)
   - الإفراط في الشرح والتوضيح
   - التكرار غير المبرر
   - عدم التمايز بين الشخصيات
   - الافتعال أو عدم الطبيعية

`;
    }
    if (provideRecommendations) {
      sections += `9. **التوصيات والتحسينات**:
   - اقتراحات محددة وقابلة للتطبيق
   - أمثلة على كيفية إعادة صياغة حوارات ضعيفة
   - استراتيجيات لتقوية الحوار

`;
    }
    return sections;
  }

  /** Closing instructions for dialogue analysis */
  private getDialogueClosingInstructions(): string {
    return `10. **التقييم النهائي**: درجة من 10 مع تبرير موجز

اكتب بشكل نصي تحليلي مباشر مع أمثلة حوارية محددة من النص.
استخدم علامات اقتباس لتمييز الحوارات المقتبسة.
لا تستخدم JSON أو جداول معقدة - نص تحليلي واضح فقط.`;
  }

  protected override async postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
    const processedText = cleanupDialogueText(output.text);

    const authenticity = await assessAuthenticity(processedText);
    const characterization = await assessCharacterization(processedText);
    const functionality = await assessFunctionality(processedText);
    const technicalQuality = await assessTechnicalQuality(processedText);

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
      notes: generateDialogueNotes(
        output.notes,
        output.confidence,
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
        problemsIdentified: countProblems(processedText),
        recommendationsProvided: countRecommendations(processedText),
        dialogueSamplesAnalyzed: countDialogueSamples(processedText),
      },
    };
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
