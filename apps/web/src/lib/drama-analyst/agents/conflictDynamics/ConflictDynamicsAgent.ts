import { safeCountMultipleTerms } from "@/lib/security/safe-regexp";
import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { CONFLICT_DYNAMICS_AGENT_CONFIG } from "./agent";

interface ConflictDynamicsContext {
  originalText?: string;
  analysisReport?: unknown;
  characters?: unknown[];
  plotPoints?: unknown[];
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
      CONFLICT_DYNAMICS_AGENT_CONFIG.systemPrompt ?? ""
    );

    this.confidenceFloor = 0.82;
  }

  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;
    const ctx = context as ConflictDynamicsContext;

    const originalText = ctx?.originalText ?? "";
    const characters = ctx?.characters ?? [];
    const plotPoints = ctx?.plotPoints ?? [];
    const conflictTypes = ctx?.conflictTypes ?? ["internal", "interpersonal"];
    const analyzeEvolution = ctx?.analyzeEvolution ?? true;
    const trackIntensity = ctx?.trackIntensity ?? true;
    const identifyResolution = ctx?.identifyResolution ?? true;

    let prompt = `مهمة تحليل ديناميكيات الصراع الدرامي\n\n`;

    if (originalText) {
      prompt += `النص المراد تحليله:\n${originalText.substring(0, 2500)}...\n\n`;
    }

    if (characters.length > 0) {
      prompt += `الشخصيات الرئيسية:\n`;
      characters.slice(0, 5).forEach((char: unknown, idx: number) => {
        const charName =
          typeof char === "string"
            ? char
            : this.readStringField(char, "name", `شخصية ${idx + 1}`);
        prompt += `${idx + 1}. ${charName}\n`;
      });
      prompt += "\n";
    }

    if (plotPoints.length > 0) {
      prompt += `نقاط الحبكة الرئيسية:\n`;
      plotPoints.slice(0, 4).forEach((point: unknown, idx: number) => {
        const pointText =
          typeof point === "string"
            ? point
            : this.readStringField(point, "description", `نقطة ${idx + 1}`);
        prompt += `${idx + 1}. ${pointText}\n`;
      });
      prompt += "\n";
    }

    prompt += `أنواع الصراعات المطلوب تحليلها: ${conflictTypes.map(this.translateConflictType).join("، ")}\n`;
    prompt += `تحليل التطور: ${analyzeEvolution ? "نعم" : "لا"}\n`;
    prompt += `تتبع الشدة: ${trackIntensity ? "نعم" : "لا"}\n`;
    prompt += `تحديد الحل: ${identifyResolution ? "نعم" : "لا"}\n\n`;

    prompt += `المهمة المطلوبة:\n${taskInput}\n\n`;

    prompt += `التعليمات:

1. **نظرة عامة** (2-3 جمل): لخص الطبيعة العامة للصراعات في النص

2. **الصراعات الرئيسية**: حدد وحلل كل صراع رئيسي
   لكل صراع:
   - **نوع الصراع**: (داخلي، بين شخصي، مجتمعي، إلخ)
   - **الأطراف المتصارعة**: من هم المتورطون وما هي مواقفهم
   - **جذور الصراع**: ما الذي يسبب أو يغذي هذا الصراع
   - **الرهانات**: ما الذي على المحك، ما الذي يمكن أن يُفقد أو يُكسب
   - **الأدلة النصية**: أمثلة محددة من النص توضح الصراع

${
  analyzeEvolution
    ? `3. **تطور الصراع**: كيف يتطور كل صراع عبر النص
   - نقطة البداية
   - التصعيد والذروة
   - لحظات التحول الحاسمة`
    : ""
}

${
  trackIntensity
    ? `4. **شدة الصراع**: تقييم مستوى الشدة والتوتر
   - المستوى الحالي (منخفض، متوسط، عالي، حرج)
   - التقلبات والتذبذبات
   - المشاهد ذات الشدة القصوى`
    : ""
}

${
  identifyResolution
    ? `5. **الحل أو الخاتمة**: كيف يُحل أو يُختم كل صراع
   - نوع الحل (انتصار، هزيمة، تسوية، عدم حل)
   - رضا الأطراف
   - التأثير على الشخصيات`
    : ""
}

6. **التشابك والتفاعل**: كيف تتشابك الصراعات المختلفة وتؤثر على بعضها

7. **الوظيفة الدرامية**: كيف تخدم هذه الصراعات البنية الدرامية والثيمات

8. **التقييم النهائي**: مدى فعالية وعمق الصراعات في تحريك القصة

اكتب بشكل نصي تحليلي واضح مع أمثلة نصية محددة.
لا تستخدم JSON أو جداول. نص تحليلي درامي مباشر.`;

    return prompt;
  }

  protected override postProcess(
    output: StandardAgentOutput
  ): StandardAgentOutput {
    const processedText = this.cleanupConflictText(output.text);

    const conflictIdentification =
      this.assessConflictIdentification(processedText);
    const analysisDepth = this.assessAnalysisDepth(processedText);
    const evidenceQuality = this.assessEvidenceQuality(processedText);
    const insightfulness = this.assessInsightfulness(processedText);

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
        conflictsIdentified: this.countConflicts(processedText),
        conflictTypes: this.identifyConflictTypes(processedText),
        intensityLevel: this.assessIntensityLevel(processedText),
      },
    };
  }

  private cleanupConflictText(text: string): string {
    text = text.replace(/```json[\s\S]*?```/g, "");
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/\{[\s\S]*?\}/g, (match) => {
      if (match.includes('"') && match.includes(":")) return "";
      return match;
    });

    return text.replace(/\n{3,}/g, "\n\n").trim();
  }

  private assessConflictIdentification(text: string): number {
    let score = 0.5;

    const conflictTerms = [
      "صراع",
      "نزاع",
      "خلاف",
      "مواجهة",
      "تضارب",
      "تعارض",
      "صدام",
      "احتكاك",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const termCount = safeCountMultipleTerms(text, conflictTerms);
    score += Math.min(0.25, termCount * 0.02);

    const typeTerms = ["داخلي", "خارجي", "بين شخصي", "مجتمعي", "فردي"];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const typeCount = safeCountMultipleTerms(text, typeTerms);
    score += Math.min(0.15, typeCount * 0.05);

    if (text.includes("الأطراف") || text.includes("المتصارع")) score += 0.1;

    return Math.min(1, score);
  }

  private assessAnalysisDepth(text: string): number {
    let score = 0.5;

    const depthIndicators = [
      "جذور",
      "أسباب",
      "يؤدي إلى",
      "ينتج عن",
      "يتطور",
      "يتصاعد",
      "ذروة",
      "حل",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const depthCount = safeCountMultipleTerms(text, depthIndicators);
    score += Math.min(0.25, depthCount * 0.025);

    const hasCausality =
      text.includes("لأن") || text.includes("بسبب") || text.includes("نتيجة");
    if (hasCausality) score += 0.15;

    if (text.length > 1500) score += 0.1;

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
      "عندما",
      "حيث",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const evidenceCount = safeCountMultipleTerms(text, evidenceMarkers);
    score += Math.min(0.25, evidenceCount * 0.025);

    const hasQuotes = (text.match(/["«]/g) ?? []).length;
    score += Math.min(0.15, hasQuotes * 0.015);

    return Math.min(1, score);
  }

  private assessInsightfulness(text: string): number {
    let score = 0.5;

    const insightWords = [
      "يكشف",
      "يوضح",
      "يعكس",
      "الأهمية",
      "التأثير",
      "الدلالة",
      "يشير",
      "نستنتج",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const insightCount = safeCountMultipleTerms(text, insightWords);
    score += Math.min(0.3, insightCount * 0.03);

    const hasFunctionAnalysis =
      text.includes("وظيفة") || text.includes("دور") || text.includes("يخدم");
    if (hasFunctionAnalysis) score += 0.2;

    return Math.min(1, score);
  }

  private countConflicts(text: string): number {
    const conflictMarkers = text.match(
      /الصراع الأول|الصراع الثاني|الصراع الرئيسي|صراع|نزاع رئيسي/gi
    );
    return conflictMarkers ? Math.min(conflictMarkers.length, 8) : 0;
  }

  private identifyConflictTypes(text: string): string[] {
    const types: string[] = [];
    if (text.includes("داخلي") || text.includes("النفس")) types.push("داخلي");
    if (text.includes("بين شخصي") || text.includes("شخصية"))
      types.push("بين شخصي");
    if (text.includes("مجتمعي") || text.includes("اجتماعي"))
      types.push("مجتمعي");
    if (text.includes("الطبيعة") || text.includes("البيئة"))
      types.push("ضد الطبيعة");
    if (text.includes("القدر") || text.includes("المصير"))
      types.push("ضد القدر");
    return types;
  }

  private assessIntensityLevel(text: string): string {
    const highIntensity = ["حاد", "شديد", "عنيف", "حرج", "ذروة", "انفجار"];
    const mediumIntensity = ["متوسط", "متصاعد", "متزايد"];
    const lowIntensity = ["هادئ", "خفيف", "كامن", "مكبوت"];

    // SECURITY FIX: Use safe string matching to prevent ReDoS
    const highCount = highIntensity.reduce((count, term) => {
      const occurrences =
        text.toLowerCase().split(term.toLowerCase()).length - 1;
      return count + occurrences;
    }, 0);
    const mediumCount = mediumIntensity.reduce((count, term) => {
      const occurrences =
        text.toLowerCase().split(term.toLowerCase()).length - 1;
      return count + occurrences;
    }, 0);
    const lowCount = lowIntensity.reduce((count, term) => {
      const occurrences =
        text.toLowerCase().split(term.toLowerCase()).length - 1;
      return count + occurrences;
    }, 0);

    if (highCount > mediumCount && highCount > lowCount) return "عالي";
    if (lowCount > mediumCount && lowCount > highCount) return "منخفض";
    return "متوسط";
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

    if (identification > 0.8) notes.push("تحديد دقيق للصراعات");
    if (depth > 0.8) notes.push("عمق تحليلي قوي");
    if (evidence > 0.75) notes.push("أدلة نصية جيدة");
    if (insight > 0.75) notes.push("رؤى ثاقبة");

    if (identification < 0.6) notes.push("يحتاج تحديد أوضح");
    if (depth < 0.5) notes.push("يحتاج تحليل أعمق");
    if (evidence < 0.5) notes.push("يحتاج مزيد من الأدلة");

    if (output.notes) notes.push(...output.notes);

    return notes;
  }

  private readStringField(
    candidate: unknown,
    field: string,
    fallback: string
  ): string {
    if (
      typeof candidate === "object" &&
      candidate !== null &&
      !Array.isArray(candidate)
    ) {
      const value = (candidate as Record<string, unknown>)[field];
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }
    return fallback;
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
    return types[type] ?? type;
  }

  protected override getFallbackResponse(_input: StandardAgentInput): string {
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
