import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { CONFLICT_DYNAMICS_AGENT_CONFIG } from "./agent";
import {
  assessConflictIdentification,
  assessAnalysisDepth,
  assessEvidenceQuality,
  assessInsightfulness,
  countConflicts,
  identifyConflictTypes,
  assessIntensityLevel,
  cleanupConflictText,
} from "./conflict-assessment";

interface ConflictCharacter {
  name?: string;
  [key: string]: unknown;
}

interface ConflictPlotPoint {
  description?: string;
  [key: string]: unknown;
}

interface ConflictDynamicsContext {
  originalText?: string;
  analysisReport?: Record<string, unknown>;
  characters?: (string | ConflictCharacter)[];
  plotPoints?: (string | ConflictPlotPoint)[];
  conflictTypes?: string[]; // ['internal', 'interpersonal', 'societal', 'man-vs-nature']
  analyzeEvolution?: boolean;
  trackIntensity?: boolean;
  identifyResolution?: boolean;
}

/**
 * Conflict Dynamics Agent - وكيل ديناميكيات الصراع
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON
 */
export class ConflictDynamicsAgent extends BaseAgent {
  constructor() {
    super(
      "ConflictAnalyzer AI",
      TaskType.CONFLICT_DYNAMICS,
      CONFLICT_DYNAMICS_AGENT_CONFIG.systemPrompt || ""
    );

    this.confidenceFloor = 0.82;
  }

  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;
    const ctx = context as ConflictDynamicsContext;

    const analyzeEvolution = ctx?.analyzeEvolution ?? true;
    const trackIntensity = ctx?.trackIntensity ?? true;
    const identifyResolution = ctx?.identifyResolution ?? true;

    let prompt = `مهمة تحليل ديناميكيات الصراع الدرامي\n\n`;
    prompt += this.buildConflictContextSection(ctx);
    prompt += `المهمة المطلوبة:\n${taskInput}\n\n`;
    prompt += this.buildConflictInstructions(analyzeEvolution, trackIntensity, identifyResolution);

    return prompt;
  }

  /**
   * Build context section for conflict analysis prompt
   */
  private buildConflictContextSection(ctx: ConflictDynamicsContext | undefined): string {
    let section = "";
    const originalText = ctx?.originalText || "";
    const characters = ctx?.characters || [];
    const plotPoints = ctx?.plotPoints || [];
    const conflictTypes = ctx?.conflictTypes || ["internal", "interpersonal"];

    if (originalText) {
      section += `النص المراد تحليله:\n${originalText.substring(0, 2500)}...\n\n`;
    }

    section += this.formatCharactersList(characters);
    section += this.formatPlotPointsList(plotPoints);
    section += `أنواع الصراعات المطلوب تحليلها: ${conflictTypes
      .map((type) => this.translateConflictType(type))
      .join("، ")}\n`;
    return section;
  }

  /**
   * Format characters list for prompt
   */
  private formatCharactersList(characters: (string | ConflictCharacter)[]): string {
    if (characters.length === 0) return "";
    let result = `الشخصيات الرئيسية:\n`;
    characters.slice(0, 5).forEach((char, idx) => {
      const charName =
        typeof char === "string" ? char : char.name || `شخصية ${idx + 1}`;
      result += `${idx + 1}. ${charName}\n`;
    });
    return result + "\n";
  }

  /**
   * Format plot points list for prompt
   */
  private formatPlotPointsList(plotPoints: (string | ConflictPlotPoint)[]): string {
    if (plotPoints.length === 0) return "";
    let result = `نقاط الحبكة الرئيسية:\n`;
    plotPoints.slice(0, 4).forEach((point, idx) => {
      const pointText =
        typeof point === "string" ? point : point.description || `نقطة ${idx + 1}`;
      result += `${idx + 1}. ${pointText}\n`;
    });
    return result + "\n";
  }

  /**
   * Build conflict analysis instructions
   */
  private buildConflictInstructions(
    analyzeEvolution: boolean,
    trackIntensity: boolean,
    identifyResolution: boolean,
  ): string {
    let instructions = `تحليل التطور: ${analyzeEvolution ? "نعم" : "لا"}\n`;
    instructions += `تتبع الشدة: ${trackIntensity ? "نعم" : "لا"}\n`;
    instructions += `تحديد الحل: ${identifyResolution ? "نعم" : "لا"}\n\n`;

    instructions += `التعليمات:

1. **نظرة عامة** (2-3 جمل): لخص الطبيعة العامة للصراعات في النص

2. **الصراعات الرئيسية**: حدد وحلل كل صراع رئيسي
   لكل صراع:
   - **نوع الصراع**: (داخلي، بين شخصي، مجتمعي، إلخ)
   - **الأطراف المتصارعة**: من هم المتورطون وما هي مواقفهم
   - **جذور الصراع**: ما الذي يسبب أو يغذي هذا الصراع
   - **الرهانات**: ما الذي على المحك، ما الذي يمكن أن يُفقد أو يُكسب
   - **الأدلة النصية**: أمثلة محددة من النص توضح الصراع

`;

    if (analyzeEvolution) {
      instructions += `3. **تطور الصراع**: كيف يتطور كل صراع عبر النص
   - نقطة البداية
   - التصعيد والذروة
   - لحظات التحول الحاسمة

`;
    }

    if (trackIntensity) {
      instructions += `4. **شدة الصراع**: تقييم مستوى الشدة والتوتر
   - المستوى الحالي (منخفض، متوسط، عالي، حرج)
   - التقلبات والتذبذبات
   - المشاهد ذات الشدة القصوى

`;
    }

    if (identifyResolution) {
      instructions += `5. **الحل أو الخاتمة**: كيف يُحل أو يُختم كل صراع
   - نوع الحل (انتصار، هزيمة، تسوية، عدم حل)
   - رضا الأطراف
   - التأثير على الشخصيات

`;
    }

    instructions += `6. **التشابك والتفاعل**: كيف تتشابك الصراعات المختلفة وتؤثر على بعضها

7. **الوظيفة الدرامية**: كيف تخدم هذه الصراعات البنية الدرامية والثيمات

8. **التقييم النهائي**: مدى فعالية وعمق الصراعات في تحريك القصة

اكتب بشكل نصي تحليلي واضح مع أمثلة نصية محددة.
لا تستخدم JSON أو جداول. نص تحليلي درامي مباشر.`;

    return instructions;
  }

  protected override async postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
    const processedText = cleanupConflictText(output.text);

    const conflictIdentification =
      await assessConflictIdentification(processedText);
    const analysisDepth = await assessAnalysisDepth(processedText);
    const evidenceQuality = await assessEvidenceQuality(processedText);
    const insightfulness = await assessInsightfulness(processedText);

    const qualityScore =
      conflictIdentification * 0.3 +
      analysisDepth * 0.3 +
      evidenceQuality * 0.2 +
      insightfulness * 0.2;

    const adjustedConfidence = output.confidence * 0.5 + qualityScore * 0.5;

    return {
      ...output,
      text: processedText,
      confidence: adjustedConfidence,
      notes: this.generateConflictNotes(
        output,
        conflictIdentification,
        analysisDepth,
        evidenceQuality,
        insightfulness
      ),
      metadata: {
        ...output.metadata,
        conflictAnalysisQuality: {
          overall: qualityScore,
          conflictIdentification,
          analysisDepth,
          evidenceQuality,
          insightfulness,
        },
        conflictsIdentified: countConflicts(processedText),
        conflictTypes: identifyConflictTypes(processedText),
        intensityLevel: assessIntensityLevel(processedText),
      },
    };
  }

  private generateConflictNotes(
    output: StandardAgentOutput,
    identification: number,
    depth: number,
    evidence: number,
    insight: number
  ): string[] {
    const notes: string[] = [];

    const avg = (identification + depth + evidence + insight) / 4;
    if (avg > 0.8) notes.push("تحليل صراعات ممتاز");
    else if (avg > 0.65) notes.push("تحليل جيد");
    else notes.push("يحتاج عمق أكبر");

    this.addThresholdNotes(notes, [
      {
        value: identification,
        high: 0.8,
        highMsg: "تحديد دقيق للصراعات",
        low: 0.6,
        lowMsg: "يحتاج تحديد أوضح",
      },
      {
        value: depth,
        high: 0.8,
        highMsg: "عمق تحليلي قوي",
        low: 0.5,
        lowMsg: "يحتاج تحليل أعمق",
      },
      {
        value: evidence,
        high: 0.75,
        highMsg: "أدلة نصية جيدة",
        low: 0.5,
        lowMsg: "يحتاج مزيد من الأدلة",
      },
      { value: insight, high: 0.75, highMsg: "رؤى ثاقبة" },
    ]);

    if (output.notes) notes.push(...output.notes);

    return notes;
  }

  /**
   * Add notes based on threshold checks
   */
  private addThresholdNotes(
    notes: string[],
    checks: {
      value: number;
      high: number;
      highMsg: string;
      low?: number;
      lowMsg?: string;
    }[]
  ): void {
    for (const check of checks) {
      if (check.value > check.high) notes.push(check.highMsg);
      else if (
        check.low !== undefined &&
        check.lowMsg &&
        check.value < check.low
      ) {
        notes.push(check.lowMsg);
      }
    }
  }

  private translateConflictType(type: string): string {
    const types: Record<string, string> = {
      internal: "داخلي (الإنسان ضد نفسه)",
      interpersonal: "بين شخصي (شخص ضد شخص)",
      societal: "مجتمعي (فرد ضد مجتمع)",
      "man-vs-nature": "ضد الطبيعة",
      "man-vs-fate": "ضد القدر",
      "man-vs-technology": "ضد التكنولوجيا",
      "man-vs-supernatural": "ضد الخارق",
    };
    return types[type] || type;
  }

  protected override async getFallbackResponse(
    _input: StandardAgentInput
  ): Promise<string> {
    return `نظرة عامة:
النص يحتوي على عدة مستويات من الصراعات التي تحرك الأحداث وتطور الشخصيات.

الصراع الرئيسي:
[نوع الصراع] - يتمحور حول [موضوع عام يحتاج تحديد أدق]
الأطراف: [شخصيات متصارعة تحتاج تعريف]
الرهانات: [ما على المحك]
الأدلة: [أمثلة من النص تحتاج تحديد]

تطور الصراع:
يبدأ الصراع بـ[نقطة البداية] ويتصاعد عبر [مراحل] حتى يصل إلى [ذروة أو حل].

الوظيفة الدرامية:
هذه الصراعات تخدم [الغرض الدرامي] وتساهم في [التأثير على الحبكة].

ملاحظة: يُرجى تفعيل الخيارات المتقدمة وتوفير المزيد من التفاصيل عن الشخصيات والأحداث للحصول على تحليل صراعات أكثر دقة وعمقاً مع أمثلة نصية محددة.`;
  }
}

export const conflictDynamicsAgent = new ConflictDynamicsAgent();
