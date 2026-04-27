import { safeCountMultipleTerms } from "@/lib/security/safe-regexp";
import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { CHARACTER_NETWORK_AGENT_CONFIG } from "./agent";
import {
  buildOriginalTextSection,
  buildCharactersSection,
  buildFocusCharactersSection,
  buildAnalysisOptionsSection,
  buildConditionalInstructions,
  getBaseInstructions,
  getClosingInstructions,
} from "./prompt-builder";

export interface CharacterNetworkContext {
  originalText?: string;
  analysisReport?: any;
  characters?: any[];
  focusCharacters?: string[];
  relationshipTypes?: string[]; // ['family', 'romantic', 'professional', 'adversarial', 'friendship']
  analyzeEvolution?: boolean;
  trackInfluence?: boolean;
  identifyGroups?: boolean;
  mapPowerDynamics?: boolean;
}

/**
 * Character Network Agent - وكيل شبكة الشخصيات
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON
 */
export class CharacterNetworkAgent extends BaseAgent {
  constructor() {
    super(
      "SocialGraph AI",
      TaskType.CHARACTER_NETWORK,
      CHARACTER_NETWORK_AGENT_CONFIG.systemPrompt ?? ""
    );

    this.confidenceFloor = 0.82;
  }

  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;
    const ctx = context as CharacterNetworkContext;

    // Extract context with defaults
    const originalText = ctx?.originalText ?? "";
    const characters = ctx?.characters ?? [];
    const focusCharacters = ctx?.focusCharacters ?? [];
    const relationshipTypes = ctx?.relationshipTypes ?? [
      "family",
      "romantic",
      "professional",
      "friendship",
      "adversarial",
    ];
    const analyzeEvolution = ctx?.analyzeEvolution ?? true;
    const trackInfluence = ctx?.trackInfluence ?? true;
    const identifyGroups = ctx?.identifyGroups ?? true;
    const mapPowerDynamics = ctx?.mapPowerDynamics ?? true;

    // Build prompt sections
    let prompt = `مهمة رسم وتحليل شبكة الشخصيات والعلاقات\n\n`;
    prompt += buildOriginalTextSection(originalText);
    prompt += buildCharactersSection(characters);
    prompt += buildFocusCharactersSection(focusCharacters);
    prompt += buildAnalysisOptionsSection(
      relationshipTypes,
      this.translateRelationType.bind(this),
      analyzeEvolution,
      trackInfluence,
      identifyGroups,
      mapPowerDynamics
    );
    prompt += `المهمة المطلوبة:\n${taskInput}\n\n`;
    prompt += getBaseInstructions();
    prompt += buildConditionalInstructions(
      analyzeEvolution,
      identifyGroups,
      mapPowerDynamics,
      trackInfluence
    );
    prompt += getClosingInstructions();

    return prompt;
  }

  protected override async postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
    const processedText = this.cleanupNetworkText(output.text);

    const networkComprehensiveness =
      await this.assessNetworkComprehensiveness(processedText);
    const relationshipDepth = await this.assessRelationshipDepth(processedText);
    const structuralInsight = await this.assessStructuralInsight(processedText);
    const evidenceQuality = await this.assessEvidenceQuality(processedText);

    const qualityScore =
      networkComprehensiveness * 0.3 +
      relationshipDepth * 0.3 +
      structuralInsight * 0.2 +
      evidenceQuality * 0.2;

    const adjustedConfidence = output.confidence * 0.5 + qualityScore * 0.5;

    return {
      ...output,
      text: processedText,
      confidence: adjustedConfidence,
      notes: this.generateNetworkNotes(
        output,
        networkComprehensiveness,
        relationshipDepth,
        structuralInsight,
        evidenceQuality
      ),
      metadata: {
        ...output.metadata,
        timestamp: new Date().toISOString(),
        networkAnalysisQuality: {
          overall: qualityScore,
          networkComprehensiveness,
          relationshipDepth,
          structuralInsight,
          evidenceQuality,
        },
        charactersIdentified: this.countCharacters(processedText),
        relationshipsIdentified: this.countRelationships(processedText),
        groupsIdentified: this.countGroups(processedText),
      },
    };
  }

  private cleanupNetworkText(text: string): string {
    text = text.replace(/```json[\s\S]*?```/g, "");
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/\{[\s\S]*?\}/g, (match) => {
      if (match.includes('"') && match.includes(":")) return "";
      return match;
    });

    return text.replace(/\n{3,}/g, "\n\n").trim();
  }

  private assessNetworkComprehensiveness(text: string): number {
    let score = 0.5;

    const networkTerms = [
      "شبكة",
      "علاقة",
      "رابط",
      "اتصال",
      "تفاعل",
      "ارتباط",
      "شخصية",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const termCount = safeCountMultipleTerms(text, networkTerms);
    score += Math.min(0.25, termCount * 0.015);

    const aspectsTerms = [
      "مركزي",
      "هامشي",
      "مجموعة",
      "تحالف",
      "نفوذ",
      "قوة",
      "تأثير",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const aspectsCount = safeCountMultipleTerms(text, aspectsTerms);
    score += Math.min(0.15, aspectsCount * 0.02);

    if (text.length > 1500) score += 0.1;

    return Math.min(1, score);
  }

  private assessRelationshipDepth(text: string): number {
    let score = 0.5;

    const relTypes = [
      "عائلية",
      "رومانسية",
      "صداقة",
      "عدائية",
      "مهنية",
      "سلطوية",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const typesCount = safeCountMultipleTerms(text, relTypes);
    score += Math.min(0.25, typesCount * 0.04);

    const dynamicTerms = [
      "يتطور",
      "يتغير",
      "يتحسن",
      "يتدهور",
      "قوي",
      "ضعيف",
      "متوازن",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const dynamicCount = safeCountMultipleTerms(text, dynamicTerms);
    score += Math.min(0.15, dynamicCount * 0.03);

    const hasDirectionalIndicators =
      text.includes("→") || text.includes("←") || text.includes("↔");
    if (hasDirectionalIndicators) score += 0.1;

    return Math.min(1, score);
  }

  private assessStructuralInsight(text: string): number {
    let score = 0.5;

    const structuralTerms = [
      "بنية",
      "هيكل",
      "نمط",
      "هرمية",
      "دائرية",
      "مركزية",
      "موزعة",
      "متشابكة",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const structCount = safeCountMultipleTerms(text, structuralTerms);
    score += Math.min(0.25, structCount * 0.04);

    const insightTerms = [
      "يكشف",
      "يوضح",
      "يعكس",
      "الوظيفة",
      "الأهمية",
      "التأثير",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const insightCount = safeCountMultipleTerms(text, insightTerms);
    score += Math.min(0.25, insightCount * 0.03);

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
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const evidenceCount = safeCountMultipleTerms(text, evidenceMarkers);
    score += Math.min(0.25, evidenceCount * 0.025);

    const hasExamples = (text.match(/["«]/g) ?? []).length >= 2;
    if (hasExamples) score += 0.15;

    return Math.min(1, score);
  }

  private countCharacters(text: string): number {
    const names = new Set<string>();
    const matches = text.match(/[أ-ي]{3,}(?:\s+[أ-ي]{3,})?/g);
    if (matches) {
      matches.forEach((name) => {
        if (name.length > 3) names.add(name);
      });
    }
    return Math.min(names.size, 15);
  }

  private countRelationships(text: string): number {
    const relMarkers = text.match(
      /علاقة|رابط|يربط|و\s*[أ-ي]{3,}|مع\s*[أ-ي]{3,}|→|←|↔/g
    );
    return relMarkers ? Math.min(relMarkers.length, 20) : 0;
  }

  private countGroups(text: string): number {
    const groupMarkers = text.match(/مجموعة|فصيل|تحالف|عائلة|طبقة|فريق/gi);
    return groupMarkers ? Math.min(groupMarkers.length, 8) : 0;
  }

  private generateNetworkNotes(
    output: StandardAgentOutput,
    comprehensiveness: number,
    depth: number,
    insight: number,
    evidence: number
  ): string[] {
    const notesList: string[] = [];

    const avg = (comprehensiveness + depth + insight + evidence) / 4;
    if (avg > 0.8) notesList.push("تحليل شبكي ممتاز");
    else if (avg > 0.65) notesList.push("تحليل جيد");
    else notesList.push("يحتاج عمق أكبر");

    if (comprehensiveness > 0.8) notesList.push("شمولية عالية");
    if (depth > 0.8) notesList.push("عمق علائقي قوي");
    if (insight > 0.75) notesList.push("رؤية بنيوية ثاقبة");
    if (evidence > 0.75) notesList.push("أدلة نصية جيدة");

    if (comprehensiveness < 0.6) notesList.push("يحتاج تغطية أوسع");
    if (depth < 0.5) notesList.push("يحتاج تحليل علاقات أعمق");
    if (insight < 0.6) notesList.push("يحتاج رؤية بنيوية أعمق");

    if (output.notes) notesList.push(...output.notes);

    return notesList;
  }

  private translateRelationType(type: string): string {
    const types: Record<string, string> = {
      family: "عائلية",
      romantic: "رومانسية",
      professional: "مهنية",
      adversarial: "عدائية",
      friendship: "صداقة",
      mentor: "إرشادية",
      rivalry: "تنافسية",
      alliance: "تحالفية",
    };
    return types[type] ?? type;
  }

  protected override getFallbackResponse(
    _input: StandardAgentInput
  ): string {
    return `نظرة عامة على الشبكة:
النص يحتوي على عدة شخصيات مترابطة بعلاقات متنوعة تشكل شبكة اجتماعية معقدة.

الشخصيات المركزية:
[شخصية رئيسية] - تلعب دوراً محورياً في ربط الشبكة وتؤثر على معظم العلاقات الأخرى.

العلاقات الرئيسية:
1. [شخصية أ] ↔ [شخصية ب]: علاقة [نوع] تتميز بـ[خصائص عامة تحتاج تفصيل]
2. [شخصية ج] → [شخصية د]: تأثير [طبيعة] يظهر من خلال [أمثلة تحتاج تحديد]

المجموعات والتحالفات:
توجد مجموعتان رئيسيتان تربطهما علاقات متشابكة وأحياناً متوترة.

ديناميكيات القوة:
[شخصية] تمتلك النفوذ الأكبر بينما [شخصية أخرى] في موقع تبعية أو هامشية.

الوظيفة السردية:
الشبكة تخدم [الغرض الدرامي] وتعكس [الثيمات الأساسية].

البنية العامة:
الشبكة ذات طابع [مركزي/موزع/هرمي] مع [خصائص بنيوية تحتاج توضيح].

ملاحظة: يُرجى تفعيل الخيارات المتقدمة وتوفير المزيد من التفاصيل عن الشخصيات والعلاقات للحصول على رسم شبكي أكثر دقة وشمولاً مع أمثلة نصية محددة وتحليل عميق للديناميكيات.`;
  }
}

export const characterNetworkAgent = new CharacterNetworkAgent();
