import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import { safeCountMultipleTerms, sumCounts } from "../shared/safe-regexp";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { CHARACTER_NETWORK_AGENT_CONFIG } from "./agent";
import { NETWORK_FALLBACK_RESPONSE } from "./instructions";
import {
  buildOriginalTextSection,
  buildCharactersSection,
  buildFocusCharactersSection,
  buildAnalysisOptionsSection,
  buildConditionalInstructions,
  getBaseInstructions,
  getClosingInstructions,
} from "./prompt-builder";

export interface CharacterSummary {
  name: string;
  role?: string;
  description?: string;
}

export interface AnalysisReport {
  summary?: string;
  findings?: string[];
  themes?: string[];
  metadata?: Record<string, unknown>;
}

export interface CharacterNetworkContext {
  originalText?: string;
  analysisReport?: AnalysisReport;
  characters?: CharacterSummary[];
  focusCharacters?: string[];
  relationshipTypes?: string[];
  analyzeEvolution?: boolean;
  trackInfluence?: boolean;
  identifyGroups?: boolean;
  mapPowerDynamics?: boolean;
}

/** وكيل شبكة الشخصيات - Character Network Agent */
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
    const options = this.extractNetworkOptions(ctx);

    let prompt = `مهمة رسم وتحليل شبكة الشخصيات والعلاقات\n\n`;
    prompt += buildOriginalTextSection(options.originalText);
    prompt += buildCharactersSection(options.characters);
    prompt += buildFocusCharactersSection(options.focusCharacters);
    prompt += buildAnalysisOptionsSection({
      analyzeEvolution: options.analyzeEvolution,
      identifyGroups: options.identifyGroups,
      mapPowerDynamics: options.mapPowerDynamics,
      relationshipTypes: options.relationshipTypes,
      trackInfluence: options.trackInfluence,
      translateFn: this.translateRelationType.bind(this),
    });
    prompt += `المهمة المطلوبة:\n${taskInput}\n\n`;
    prompt += getBaseInstructions();
    prompt += buildConditionalInstructions(
      options.analyzeEvolution, options.identifyGroups,
      options.mapPowerDynamics, options.trackInfluence
    );
    prompt += getClosingInstructions();
    return prompt;
  }

  private static readonly DEFAULT_RELATIONSHIP_TYPES = ["family", "romantic", "professional", "friendship", "adversarial"];

  private extractNetworkOptions(ctx: CharacterNetworkContext | undefined) {
    const defaults = { originalText: "", characters: [] as CharacterSummary[], focusCharacters: [] as string[], relationshipTypes: CharacterNetworkAgent.DEFAULT_RELATIONSHIP_TYPES, analyzeEvolution: true, trackInfluence: true, identifyGroups: true, mapPowerDynamics: true };
    if (!ctx) return defaults;
    return { ...defaults, ...Object.fromEntries(Object.entries(ctx).filter(([, v]) => v !== undefined)) };
  }

  protected override async postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
    await Promise.resolve();
    const processedText = this.cleanupNetworkText(output.text);

    const networkComprehensiveness =
      this.assessNetworkComprehensiveness(processedText);
    const relationshipDepth = this.assessRelationshipDepth(processedText);
    const structuralInsight = this.assessStructuralInsight(processedText);
    const evidenceQuality = this.assessEvidenceQuality(processedText);

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
    const networkTerms = ["شبكة", "علاقة", "رابط", "اتصال", "تفاعل", "ارتباط", "شخصية"];
    score += Math.min(0.25, sumCounts(safeCountMultipleTerms(text, networkTerms)) * 0.015);
    const aspectsTerms = ["مركزي", "هامشي", "مجموعة", "تحالف", "نفوذ", "قوة", "تأثير"];
    score += Math.min(0.15, sumCounts(safeCountMultipleTerms(text, aspectsTerms)) * 0.02);
    if (text.length > 1500) score += 0.1;
    return Math.min(1, score);
  }

  private assessRelationshipDepth(text: string): number {
    let score = 0.5;
    const relTypes = ["عائلية", "رومانسية", "صداقة", "عدائية", "مهنية", "سلطوية"];
    score += Math.min(0.25, sumCounts(safeCountMultipleTerms(text, relTypes)) * 0.04);
    const dynamicTerms = ["يتطور", "يتغير", "يتحسن", "يتدهور", "قوي", "ضعيف", "متوازن"];
    score += Math.min(0.15, sumCounts(safeCountMultipleTerms(text, dynamicTerms)) * 0.03);
    if (text.includes("→") || text.includes("←") || text.includes("↔")) score += 0.1;
    return Math.min(1, score);
  }

  private assessStructuralInsight(text: string): number {
    let score = 0.5;
    const structuralTerms = ["بنية", "هيكل", "نمط", "هرمية", "دائرية", "مركزية", "موزعة", "متشابكة"];
    score += Math.min(0.25, sumCounts(safeCountMultipleTerms(text, structuralTerms)) * 0.04);
    const insightTerms = ["يكشف", "يوضح", "يعكس", "الوظيفة", "الأهمية", "التأثير"];
    score += Math.min(0.25, sumCounts(safeCountMultipleTerms(text, insightTerms)) * 0.03);

    return Math.min(1, score);
  }

  private assessEvidenceQuality(text: string): number {
    let score = 0.6;
    const evidenceMarkers = ["مثل", "كما في", "نرى", "يظهر", "في المشهد", "عندما"];
    score += Math.min(0.25, sumCounts(safeCountMultipleTerms(text, evidenceMarkers)) * 0.025);
    if ((text.match(/["«]/g) ?? []).length >= 2) score += 0.15;
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

    this.addScoreNotes(notesList, { comprehensiveness, depth, insight, evidence });
    if (output.notes) notesList.push(...output.notes);
    return notesList;
  }

  private addScoreNotes(
    notesList: string[],
    scores: { comprehensiveness: number; depth: number; insight: number; evidence: number }
  ): void {
    if (scores.comprehensiveness > 0.8) notesList.push("شمولية عالية");
    else if (scores.comprehensiveness < 0.6) notesList.push("يحتاج تغطية أوسع");
    if (scores.depth > 0.8) notesList.push("عمق علائقي قوي");
    else if (scores.depth < 0.5) notesList.push("يحتاج تحليل علاقات أعمق");
    if (scores.insight > 0.75) notesList.push("رؤية بنيوية ثاقبة");
    else if (scores.insight < 0.6) notesList.push("يحتاج رؤية بنيوية أعمق");
    if (scores.evidence > 0.75) notesList.push("أدلة نصية جيدة");
  }

  private translateRelationType(type: string): string {
    const types: Record<string, string> = { family: "عائلية", romantic: "رومانسية", professional: "مهنية", adversarial: "عدائية", friendship: "صداقة", mentor: "إرشادية", rivalry: "تنافسية", alliance: "تحالفية" };
    return types[type] ?? type;
  }

  protected override async getFallbackResponse(
    _input: StandardAgentInput
  ): Promise<string> {
    await Promise.resolve();
    return NETWORK_FALLBACK_RESPONSE;
  }
}

export const characterNetworkAgent = new CharacterNetworkAgent();
