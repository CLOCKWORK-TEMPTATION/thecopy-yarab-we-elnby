import {
  isUnknownRecord,
  stringArrayFromUnknown,
  stringifyUnknown,
} from "@/lib/utils/unknown-values";

import { BaseStation, type StationConfig } from "../core/pipeline/base-station";
import { toText } from "../gemini-core";

import { GeminiService, GeminiModel } from "./gemini-service";
import { Station3Output } from "./station3-network-builder";

// Interfaces for Station 4
export interface Station4Input {
  station3Output: Station3Output;
  originalText: string;
  options?: {
    enableConstitutionalAI?: boolean;
    enableUncertaintyQuantification?: boolean;
    temperature?: number;
  };
}

export interface EfficiencyMetrics {
  overallEfficiencyScore: number; // 0-100
  overallRating: "Excellent" | "Good" | "Fair" | "Poor" | "Critical";
  conflictCohesion: number;
  dramaticBalance: {
    balanceScore: number;
    characterInvolvementGini: number;
  };
  narrativeEfficiency: {
    characterEfficiency: number;
    relationshipEfficiency: number;
    conflictEfficiency: number;
  };
  narrativeDensity: number;
  redundancyMetrics: {
    characterRedundancy: number;
    relationshipRedundancy: number;
    conflictRedundancy: number;
  };
}

export interface QualityAssessment {
  literary: number;
  technical: number;
  commercial: number;
  overall: number;
}

interface LiteraryQualityAssessment {
  overallQuality: number;
  proseQuality: number;
  structureQuality: number;
  characterDevelopmentQuality: number;
  dialogueQuality: number;
  thematicDepth: number;
}

export interface ProducibilityAnalysis {
  technicalFeasibility: number; // 0-10
  budgetEstimate: "low" | "medium" | "high" | "very_high";
  productionChallenges: {
    type: string;
    description: string;
    severity: "low" | "medium" | "high";
  }[];
  locationRequirements: string[];
  specialEffectsNeeded: boolean;
  castSize: number;
}

export interface RhythmAnalysis {
  overallPace: "very_slow" | "slow" | "medium" | "fast" | "very_fast";
  paceVariation: number;
  sceneLengths: number[];
  actBreakdown: {
    act: number;
    averagePace: string;
    tensionProgression: number[];
  }[];
  recommendations: string[];
}

export interface Recommendation {
  type: "character" | "relationship" | "conflict" | "structure" | "dialogue";
  priority: "high" | "medium" | "low";
  description: string;
  impact: number; // 0-10
  implementationComplexity: "low" | "medium" | "high";
}

export interface UncertaintyReport {
  overallConfidence: number;
  uncertainties: {
    type: "epistemic" | "aleatoric";
    aspect: string;
    note: string;
  }[];
}

export interface Station4Output {
  efficiencyMetrics: EfficiencyMetrics;
  qualityAssessment: QualityAssessment;
  producibilityAnalysis: ProducibilityAnalysis;
  rhythmAnalysis: RhythmAnalysis;
  recommendations: {
    priorityActions: string[];
    quickFixes: string[];
    structuralRevisions: string[];
  };
  uncertaintyReport: UncertaintyReport;
  metadata: {
    analysisTimestamp: Date;
    status: "Success" | "Partial" | "Failed";
    analysisTime: number;
    agentsUsed: string[];
    tokensUsed: number;
  };
}

type RecommendationBuckets = Station4Output["recommendations"];

const defaultLiteraryQuality: LiteraryQualityAssessment = {
  overallQuality: 50,
  proseQuality: 50,
  structureQuality: 50,
  characterDevelopmentQuality: 50,
  dialogueQuality: 50,
  thematicDepth: 50,
};

const defaultProducibility: ProducibilityAnalysis = {
  technicalFeasibility: 5,
  budgetEstimate: "medium",
  productionChallenges: [],
  locationRequirements: [],
  specialEffectsNeeded: false,
  castSize: 5,
};

const defaultRhythm: RhythmAnalysis = {
  overallPace: "medium",
  paceVariation: 5,
  sceneLengths: [],
  actBreakdown: [],
  recommendations: [],
};

const defaultRecommendations: RecommendationBuckets = {
  priorityActions: ["فشل توليد التوصيات"],
  quickFixes: [],
  structuralRevisions: [],
};

function parseJsonRecord(text: string): Record<string, unknown> | null {
  const parsed: unknown = JSON.parse(text || "{}");
  return isUnknownRecord(parsed) ? parsed : null;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function finiteNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is number => typeof item === "number" && Number.isFinite(item)
  );
}

function parseLiteraryQuality(text: string): LiteraryQualityAssessment {
  const parsed = parseJsonRecord(text);
  if (!parsed) {
    return defaultLiteraryQuality;
  }

  return {
    overallQuality: finiteNumber(parsed["overallQuality"], 50),
    proseQuality: finiteNumber(parsed["proseQuality"], 50),
    structureQuality: finiteNumber(parsed["structureQuality"], 50),
    characterDevelopmentQuality: finiteNumber(
      parsed["characterDevelopmentQuality"],
      50
    ),
    dialogueQuality: finiteNumber(parsed["dialogueQuality"], 50),
    thematicDepth: finiteNumber(parsed["thematicDepth"], 50),
  };
}

function parseBudgetEstimate(
  value: unknown
): ProducibilityAnalysis["budgetEstimate"] {
  return value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "very_high"
    ? value
    : "medium";
}

function parseSeverity(
  value: unknown
): ProducibilityAnalysis["productionChallenges"][number]["severity"] {
  return value === "low" || value === "medium" || value === "high"
    ? value
    : "medium";
}

function parseProductionChallenges(
  value: unknown
): ProducibilityAnalysis["productionChallenges"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((challenge) => {
    if (!isUnknownRecord(challenge)) {
      return [];
    }

    return [
      {
        type: stringifyUnknown(challenge["type"], "unknown"),
        description: stringifyUnknown(challenge["description"]),
        severity: parseSeverity(challenge["severity"]),
      },
    ];
  });
}

function parseProducibility(text: string): ProducibilityAnalysis {
  const parsed = parseJsonRecord(text);
  if (!parsed) {
    return defaultProducibility;
  }

  return {
    technicalFeasibility: finiteNumber(parsed["technicalFeasibility"], 5),
    budgetEstimate: parseBudgetEstimate(parsed["budgetEstimate"]),
    productionChallenges: parseProductionChallenges(
      parsed["productionChallenges"]
    ),
    locationRequirements: stringArrayFromUnknown(
      parsed["locationRequirements"]
    ),
    specialEffectsNeeded:
      typeof parsed["specialEffectsNeeded"] === "boolean"
        ? parsed["specialEffectsNeeded"]
        : false,
    castSize: finiteNumber(parsed["castSize"], 5),
  };
}

function parsePace(value: unknown): RhythmAnalysis["overallPace"] {
  return value === "very_slow" ||
    value === "slow" ||
    value === "medium" ||
    value === "fast" ||
    value === "very_fast"
    ? value
    : "medium";
}

function parseActBreakdown(value: unknown): RhythmAnalysis["actBreakdown"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((act) => {
    if (!isUnknownRecord(act)) {
      return [];
    }

    return [
      {
        act: finiteNumber(act["act"], 0),
        averagePace: stringifyUnknown(act["averagePace"], "medium"),
        tensionProgression: finiteNumberArray(act["tensionProgression"]),
      },
    ];
  });
}

function parseRhythm(text: string): RhythmAnalysis {
  const parsed = parseJsonRecord(text);
  if (!parsed) {
    return defaultRhythm;
  }

  return {
    overallPace: parsePace(parsed["overallPace"]),
    paceVariation: finiteNumber(parsed["paceVariation"], 5),
    sceneLengths: finiteNumberArray(parsed["sceneLengths"]),
    actBreakdown: parseActBreakdown(parsed["actBreakdown"]),
    recommendations: stringArrayFromUnknown(parsed["recommendations"]),
  };
}

function parseRecommendations(text: string): RecommendationBuckets {
  const parsed = parseJsonRecord(text);
  if (!parsed) {
    return defaultRecommendations;
  }

  return {
    priorityActions: stringArrayFromUnknown(parsed["priorityActions"]),
    quickFixes: stringArrayFromUnknown(parsed["quickFixes"]),
    structuralRevisions: stringArrayFromUnknown(parsed["structuralRevisions"]),
  };
}

// Literary Quality Analyzer Agent
class LiteraryQualityAnalyzer {
  constructor(private geminiService: GeminiService) {}

  async assess(
    text: string,
    previousAnalysis: Station3Output
  ): Promise<LiteraryQualityAssessment> {
    const prompt = `
    قم بتقييم الجودة الأدبية للنص التالي بناءً على التحليل السابق للشبكة الدرامية.

    النص:
    ${text.substring(0, 3000)}

    تحليل الشبكة:
    ${JSON.stringify(previousAnalysis.networkAnalysis, null, 2)}

    قم بتقييم الجودة في المجالات التالية (من 0 إلى 100):
    1. الجودة النثرية (أسلوب الكتابة، اللغة، الوصف)
    2. جودة الهيكل (بداية، وسط، نهاية)
    3. جودة تطوير الشخصيات
    4. جودة الحوار
    5. العمق الموضوعي

    قدم النتائج بتنسيق JSON:
    {
      "overallQuality": 85,
      "proseQuality": 80,
      "structureQuality": 85,
      "characterDevelopmentQuality": 90,
      "dialogueQuality": 75,
      "thematicDepth": 85
    }
    `;

    const result = await this.geminiService.generate<string>({
      prompt,
      model: GeminiModel.PRO,
      temperature: 0.3,
    });

    try {
      return parseLiteraryQuality(toText(result.content));
    } catch (e) {
      console.error("Failed to parse literary quality assessment:", e);
      return defaultLiteraryQuality;
    }
  }
}

// Producibility Analyzer Agent
class ProducibilityAnalyzer {
  constructor(private geminiService: GeminiService) {}

  async evaluate(
    text: string,
    network: Station3Output["conflictNetwork"]
  ): Promise<ProducibilityAnalysis> {
    const prompt = `
    قم بتقييم إمكانية إنتاج النص التالي بناءً على شبكة الصراعات والشخصيات.

    النص:
    ${text.substring(0, 3000)}

    شبكة الصراعات:
    ${JSON.stringify(network, null, 2)}

    قم بتقييم:
    1. الجدوى التقنية (0-10)
    2. تقدير الميزانية (low/medium/high/very_high)
    3. تحديات الإنتاج (حدد 3-5 تحديات رئيسية مع وصف وشدة)
    4. متطلبات المواقع (حدد المواقع المطلوبة)
    5. هل هناك حاجة لمؤثرات خاصة؟
    6. حجم الطاقم التمثيلي

    قدم النتائج بتنسيق JSON:
    {
      "technicalFeasibility": 7,
      "budgetEstimate": "medium",
      "productionChallenges": [
        {
          "type": "location",
          "description": "مواقع تاريخية صعبة الوصول",
          "severity": "medium"
        }
      ],
      "locationRequirements": ["قصر تاريخي", "مدينة قديمة"],
      "specialEffectsNeeded": true,
      "castSize": 12
    }
    `;

    const result = await this.geminiService.generate<string>({
      prompt,
      model: GeminiModel.PRO,
      temperature: 0.3,
    });

    try {
      return parseProducibility(toText(result.content));
    } catch (e) {
      console.error("Failed to parse producibility analysis:", e);
      return defaultProducibility;
    }
  }
}

// Rhythm Mapping Agent
class RhythmMappingAgent {
  constructor(private geminiService: GeminiService) {}

  async analyze(text: string): Promise<RhythmAnalysis> {
    const prompt = `
    قم بتحليل إيقاع النص التالي وتحديد وتيرة المشاهد والتوتر.

    النص:
    ${text.substring(0, 4000)}

    قم بتحليل:
    1. الإيقاع العام (very_slow/slow/medium/fast/very_fast)
    2. تباين الإيقاع (0-10)
    3. أطوال المشاهد (قائمة بالأرقام)
    4. تحليل الأفعال (متوسط الإيقاع والتوتر لكل فعل)
    5. توصيات لتحسين الإيقاع

    قدم النتائج بتنسيق JSON:
    {
      "overallPace": "medium",
      "paceVariation": 6,
      "sceneLengths": [5, 8, 12, 6, 15],
      "actBreakdown": [
        {
          "act": 1,
          "averagePace": "medium",
          "tensionProgression": [3, 5, 7, 4]
        }
      ],
      "recommendations": ["زيادة التوتر في الفعل الثاني", "تقصير المشاهد الطويلة"]
    }
    `;

    const result = await this.geminiService.generate<string>({
      prompt,
      model: GeminiModel.PRO,
      temperature: 0.3,
    });

    try {
      return parseRhythm(toText(result.content));
    } catch (e) {
      console.error("Failed to parse rhythm analysis:", e);
      return defaultRhythm;
    }
  }
}

// Recommendations Generator
class RecommendationsGenerator {
  constructor(private geminiService: GeminiService) {}

  async generate(
    metrics: EfficiencyMetrics,
    quality: QualityAssessment,
    producibility: ProducibilityAnalysis,
    rhythm: RhythmAnalysis
  ): Promise<{
    priorityActions: string[];
    quickFixes: string[];
    structuralRevisions: string[];
  }> {
    const prompt = `
    بناءً على التحليلات التالية، قم بتوليد توصيات محددة وعملية لتحسين النص:

    مقاييس الكفاءة:
    ${JSON.stringify(metrics, null, 2)}

    تقييم الجودة:
    ${JSON.stringify(quality, null, 2)}

    تحليل الإنتاج:
    ${JSON.stringify(producibility, null, 2)}

    تحليل الإيقاع:
    ${JSON.stringify(rhythm, null, 2)}

    قدم التوصيات في ثلاث فئات:
    1. إجراءات الأولوية (إجراءات عاجلة وعالية التأثير)
    2. إصلاحات سريعة (تغييرات بسيطة وسريعة التنفيذ)
    3. مراجعات هيكلية (تغييرات أكبر قد تتطلب إعادة كتابة)

    قدم النتائج بتنسيق JSON:
    {
      "priorityActions": ["إجراء 1", "إجراء 2"],
      "quickFixes": ["إصلاح 1", "إصلاح 2"],
      "structuralRevisions": ["مراجعة 1", "مراجعة 2"]
    }
    `;

    const result = await this.geminiService.generate<string>({
      prompt,
      model: GeminiModel.PRO,
      temperature: 0.4,
    });

    try {
      return parseRecommendations(toText(result.content));
    } catch (e) {
      console.error("Failed to parse recommendations:", e);
      return defaultRecommendations;
    }
  }
}

// Main Station 4 Class
export class Station4EfficiencyMetrics extends BaseStation<
  Station4Input,
  Station4Output
> {
  private literaryQualityAnalyzer: LiteraryQualityAnalyzer;
  private producibilityAnalyzer: ProducibilityAnalyzer;
  private rhythmMappingAgent: RhythmMappingAgent;
  private recommendationsGenerator: RecommendationsGenerator;

  constructor(
    config: StationConfig<Station4Input, Station4Output>,
    geminiService: GeminiService
  ) {
    super(config, geminiService);
    this.literaryQualityAnalyzer = new LiteraryQualityAnalyzer(geminiService);
    this.producibilityAnalyzer = new ProducibilityAnalyzer(geminiService);
    this.rhythmMappingAgent = new RhythmMappingAgent(geminiService);
    this.recommendationsGenerator = new RecommendationsGenerator(geminiService);
  }

  protected async process(input: Station4Input): Promise<Station4Output> {
    const startTime = Date.now();
    const agentsUsed: string[] = [];
    const tokensUsed = 0;

    // Extract options with defaults
    const options = {
      enableConstitutionalAI: input.options?.enableConstitutionalAI ?? true,
      enableUncertaintyQuantification:
        input.options?.enableUncertaintyQuantification ?? true,
      temperature: input.options?.temperature ?? 0.3,
    };

    try {
      // 1. Calculate efficiency metrics
      const efficiencyMetrics = this.calculateEfficiencyMetrics(
        input.station3Output.conflictNetwork
      );
      agentsUsed.push("EfficiencyMetrics");

      // 2. Assess literary quality
      const literaryQuality = await this.literaryQualityAnalyzer.assess(
        input.originalText,
        input.station3Output
      );
      agentsUsed.push("LiteraryQualityAnalyzer");

      // 3. Evaluate producibility
      const producibilityAnalysis = await this.producibilityAnalyzer.evaluate(
        input.originalText,
        input.station3Output.conflictNetwork
      );
      agentsUsed.push("ProducibilityAnalyzer");

      // 4. Analyze rhythm
      const rhythmAnalysis = await this.rhythmMappingAgent.analyze(
        input.originalText
      );
      agentsUsed.push("RhythmMappingAgent");

      // 5. Calculate overall quality assessment
      const qualityAssessment: QualityAssessment = {
        literary: literaryQuality.overallQuality,
        technical: producibilityAnalysis.technicalFeasibility * 10,
        commercial: this.calculateCommercialPotential(
          literaryQuality,
          producibilityAnalysis
        ),
        overall: 0, // Will be calculated below
      };
      qualityAssessment.overall =
        qualityAssessment.literary * 0.4 +
        qualityAssessment.technical * 0.3 +
        qualityAssessment.commercial * 0.3;

      // 6. Generate recommendations
      const recommendations = await this.recommendationsGenerator.generate(
        efficiencyMetrics,
        qualityAssessment,
        producibilityAnalysis,
        rhythmAnalysis
      );
      agentsUsed.push("RecommendationsGenerator");

      // 7. Apply Constitutional AI if enabled
      let finalRecommendations = recommendations;
      if (options.enableConstitutionalAI) {
        const constitutionalCheck = this.checkConstitutionalCompliance(
          JSON.stringify(recommendations),
          input.originalText
        );

        if (!constitutionalCheck.compliant) {
          finalRecommendations = this.parseRecommendationBuckets(
            constitutionalCheck.correctedAnalysis
          );
        }
        agentsUsed.push("ConstitutionalAI");
      }

      // 8. Quantify uncertainty if enabled
      let uncertaintyReport: UncertaintyReport = {
        overallConfidence: 0.8,
        uncertainties: [],
      };

      if (options.enableUncertaintyQuantification) {
        uncertaintyReport = this.quantifyUncertainty(
          JSON.stringify({
            efficiencyMetrics,
            qualityAssessment,
            producibilityAnalysis,
            rhythmAnalysis,
            recommendations: finalRecommendations,
          }),
          input.originalText
        );
        agentsUsed.push("UncertaintyQuantification");
      }

      const analysisTime = Date.now() - startTime;

      return {
        efficiencyMetrics,
        qualityAssessment,
        producibilityAnalysis,
        rhythmAnalysis,
        recommendations: finalRecommendations,
        uncertaintyReport,
        metadata: {
          analysisTimestamp: new Date(),
          status: "Success",
          analysisTime,
          agentsUsed,
          tokensUsed,
        },
      };
    } catch (error) {
      console.error("Error in Station 4:", error);
      return this.getErrorFallback();
    }
  }

  private calculateEfficiencyMetrics(
    conflictNetwork: Station3Output["conflictNetwork"]
  ): EfficiencyMetrics {
    // Calculate basic metrics from the conflict network
    const charactersCount = conflictNetwork.characters.size;
    const relationshipsCount = conflictNetwork.relationships.size;
    const conflictsCount = conflictNetwork.conflicts.size;

    // Calculate efficiency scores
    const characterEfficiency = Math.min(
      100,
      Math.max(0, 100 - (charactersCount - 7) * 5)
    );
    const relationshipEfficiency = Math.min(
      100,
      Math.max(0, 100 - (relationshipsCount - charactersCount * 1.5) * 3)
    );
    const conflictEfficiency = Math.min(
      100,
      Math.max(0, 100 - (conflictsCount - charactersCount * 0.8) * 4)
    );

    // Calculate narrative efficiency
    const narrativeEfficiency = {
      characterEfficiency,
      relationshipEfficiency,
      conflictEfficiency,
    };

    // Calculate overall efficiency score
    const overallEfficiencyScore =
      characterEfficiency * 0.3 +
      relationshipEfficiency * 0.3 +
      conflictEfficiency * 0.4;

    // Determine overall rating
    let overallRating: "Excellent" | "Good" | "Fair" | "Poor" | "Critical";
    if (overallEfficiencyScore >= 80) overallRating = "Excellent";
    else if (overallEfficiencyScore >= 60) overallRating = "Good";
    else if (overallEfficiencyScore >= 40) overallRating = "Fair";
    else if (overallEfficiencyScore >= 20) overallRating = "Poor";
    else overallRating = "Critical";

    // Calculate conflict cohesion (simplified)
    const conflictCohesion = Math.min(
      1,
      Math.max(0, conflictsCount / charactersCount)
    );

    // Calculate dramatic balance
    const dramaticBalance = {
      balanceScore: Math.min(
        1,
        Math.max(0, 1 - Math.abs(1 - conflictsCount / charactersCount))
      ),
      characterInvolvementGini: this.calculateGiniCoefficient(conflictNetwork),
    };

    // Calculate narrative density
    const narrativeDensity =
      (conflictsCount + relationshipsCount) / charactersCount;

    // Calculate redundancy metrics
    const redundancyMetrics = {
      characterRedundancy: Math.max(0, (charactersCount - 7) / charactersCount),
      relationshipRedundancy: Math.max(
        0,
        (relationshipsCount - charactersCount * 1.5) / relationshipsCount
      ),
      conflictRedundancy: Math.max(
        0,
        (conflictsCount - charactersCount * 0.8) / conflictsCount
      ),
    };

    return {
      overallEfficiencyScore,
      overallRating,
      conflictCohesion,
      dramaticBalance,
      narrativeEfficiency,
      narrativeDensity,
      redundancyMetrics,
    };
  }

  private calculateGiniCoefficient(
    conflictNetwork: Station3Output["conflictNetwork"]
  ): number {
    // Simplified Gini coefficient calculation for character involvement
    const characterInvolvement: number[] = [];

    // Count conflicts per character
    for (const [characterId] of conflictNetwork.characters) {
      let involvementCount = 0;

      // Count direct conflicts
      for (const [, conflict] of conflictNetwork.conflicts) {
        if (conflict.involvedCharacters.includes(characterId)) {
          involvementCount++;
        }
      }

      characterInvolvement.push(involvementCount);
    }

    // Sort values
    characterInvolvement.sort((a, b) => a - b);

    // Calculate Gini coefficient
    const n = characterInvolvement.length;
    if (n === 0) return 0;

    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += (2 * (i + 1) - n - 1) * characterInvolvement[i]!;
    }

    const totalInvolvement = characterInvolvement.reduce((a, b) => a + b, 0);

    if (totalInvolvement === 0) return 0;

    return sum / (n * totalInvolvement);
  }

  private calculateCommercialPotential(
    literaryQuality: LiteraryQualityAssessment,
    producibility: ProducibilityAnalysis
  ): number {
    // Simplified commercial potential calculation
    const literaryScore = literaryQuality.overallQuality;
    const technicalScore = producibility.technicalFeasibility * 10;

    // Budget factor (medium budget is optimal)
    let budgetScore = 50;
    if (producibility.budgetEstimate === "low") budgetScore = 40;
    else if (producibility.budgetEstimate === "medium") budgetScore = 70;
    else if (producibility.budgetEstimate === "high") budgetScore = 60;
    else if (producibility.budgetEstimate === "very_high") budgetScore = 30;

    // Cast size factor (5-10 is optimal)
    let castScore: number;
    if (producibility.castSize <= 5) castScore = 40;
    else if (producibility.castSize <= 10) castScore = 70;
    else if (producibility.castSize <= 15) castScore = 60;
    else castScore = 30;

    return Math.round(
      literaryScore * 0.4 +
        technicalScore * 0.2 +
        budgetScore * 0.2 +
        castScore * 0.2
    );
  }

  /**
   * Check constitutional compliance of analysis.
   */
  private checkConstitutionalCompliance(
    analysis: string,
    originalText: string
  ): {
    compliant: boolean;
    correctedAnalysis: string;
    improvementScore: number;
  } {
    try {
      const recommendations = this.parseRecommendationBuckets(analysis);
      const violations = this.detectConstitutionalViolations(
        recommendations,
        originalText
      );

      const correctedRecommendations =
        violations.length === 0
          ? recommendations
          : this.addConstitutionalCorrection(recommendations, violations);

      return {
        compliant: violations.length === 0,
        correctedAnalysis: JSON.stringify(correctedRecommendations),
        improvementScore: violations.length === 0 ? 1 : 0.75,
      };
    } catch (error) {
      console.error("Constitutional check failed:", error);
      return {
        compliant: true,
        correctedAnalysis: analysis,
        improvementScore: 1.0,
      };
    }
  }

  /**
   * Quantify uncertainty in analysis results.
   */
  private quantifyUncertainty(
    analysis: string,
    originalText: string
  ): UncertaintyReport {
    try {
      const parsed = this.tryParseJsonObject(analysis);
      const words = originalText.trim().split(/\s+/).filter(Boolean).length;
      const uncertainties: UncertaintyReport["uncertainties"] = [];
      let penalty = 0;

      if (words < 300) {
        penalty += 0.2;
        uncertainties.push({
          type: "epistemic",
          aspect: "sample_size",
          note: "النص قصير وقد لا يكفي لتقدير جودة البنية والإيقاع بثقة عالية",
        });
      }

      if (!this.hasCompleteMetricSet(parsed)) {
        penalty += 0.15;
        uncertainties.push({
          type: "epistemic",
          aspect: "metric_coverage",
          note: "بعض المقاييس غير مكتملة أو غير قابلة للتحقق من المخرجات",
        });
      }

      if (this.countRecommendationItems(parsed["recommendations"]) < 3) {
        penalty += 0.1;
        uncertainties.push({
          type: "aleatoric",
          aspect: "recommendation_density",
          note: "عدد التوصيات قليل مقارنة باتساع التحليل المطلوب",
        });
      }

      return {
        overallConfidence: Math.max(0.35, Math.min(0.95, 0.9 - penalty)),
        uncertainties,
      };
    } catch (error) {
      console.error("Uncertainty quantification failed:", error);
      return {
        overallConfidence: 0.5,
        uncertainties: [
          {
            type: "epistemic",
            aspect: "general",
            note: "فشل في تقييم عدم اليقين",
          },
        ],
      };
    }
  }

  private parseRecommendationBuckets(analysis: string): RecommendationBuckets {
    const parsed = this.tryParseJsonObject(analysis);
    return {
      priorityActions: this.sanitizeRecommendationList(
        parsed["priorityActions"]
      ),
      quickFixes: this.sanitizeRecommendationList(parsed["quickFixes"]),
      structuralRevisions: this.sanitizeRecommendationList(
        parsed["structuralRevisions"]
      ),
    };
  }

  private sanitizeRecommendationList(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private detectConstitutionalViolations(
    recommendations: RecommendationBuckets,
    originalText: string
  ): string[] {
    const combined = [
      ...recommendations.priorityActions,
      ...recommendations.quickFixes,
      ...recommendations.structuralRevisions,
      originalText,
    ].join("\n");

    const blockedPatterns = [
      /استبعد.+(?:دين|عرق|جنس|إعاقة|لهجة)/i,
      /احذف.+(?:دين|عرق|جنس|إعاقة|لهجة)/i,
      /(?:دين|عرق|جنس|إعاقة|لهجة).+(?:أدنى|أسوأ|منحط)/i,
    ];

    return blockedPatterns
      .filter((pattern) => pattern.test(combined))
      .map((pattern) => pattern.source);
  }

  private addConstitutionalCorrection(
    recommendations: RecommendationBuckets,
    violations: string[]
  ): RecommendationBuckets {
    return {
      ...recommendations,
      priorityActions: [
        "مراجعة التوصيات لتجنب الاستبعاد أو التعميم على أساس هوية محمية",
        ...recommendations.priorityActions,
      ],
      structuralRevisions: [
        ...recommendations.structuralRevisions,
        `تصحيح ${violations.length} مؤشرات لغوية قد تنتج تحيزاً أو توصية غير عادلة`,
      ],
    };
  }

  private tryParseJsonObject(value: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(value) as unknown;
      return this.isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private hasCompleteMetricSet(parsed: Record<string, unknown>): boolean {
    return [
      "efficiencyMetrics",
      "qualityAssessment",
      "producibilityAnalysis",
      "rhythmAnalysis",
    ].every((key) => this.isRecord(parsed[key]));
  }

  private countRecommendationItems(value: unknown): number {
    if (!this.isRecord(value)) {
      return 0;
    }

    return ["priorityActions", "quickFixes", "structuralRevisions"].reduce(
      (total, key) =>
        total + this.sanitizeRecommendationList(value[key]).length,
      0
    );
  }

  protected extractRequiredData(input: Station4Input): Record<string, unknown> {
    return {
      charactersCount: input.station3Output.conflictNetwork.characters.size,
      relationshipsCount:
        input.station3Output.conflictNetwork.relationships.size,
      conflictsCount: input.station3Output.conflictNetwork.conflicts.size,
    };
  }

  protected getErrorFallback(): Station4Output {
    return {
      efficiencyMetrics: {
        overallEfficiencyScore: 0,
        overallRating: "Critical",
        conflictCohesion: 0,
        dramaticBalance: {
          balanceScore: 0,
          characterInvolvementGini: 1,
        },
        narrativeEfficiency: {
          characterEfficiency: 0,
          relationshipEfficiency: 0,
          conflictEfficiency: 0,
        },
        narrativeDensity: 0,
        redundancyMetrics: {
          characterRedundancy: 0,
          relationshipRedundancy: 0,
          conflictRedundancy: 0,
        },
      },
      qualityAssessment: {
        literary: 0,
        technical: 0,
        commercial: 0,
        overall: 0,
      },
      producibilityAnalysis: {
        technicalFeasibility: 0,
        budgetEstimate: "very_high",
        productionChallenges: [],
        locationRequirements: [],
        specialEffectsNeeded: false,
        castSize: 0,
      },
      rhythmAnalysis: {
        overallPace: "medium",
        paceVariation: 0,
        sceneLengths: [],
        actBreakdown: [],
        recommendations: [],
      },
      recommendations: {
        priorityActions: ["خطأ في التحليل"],
        quickFixes: ["خطأ في التحليل"],
        structuralRevisions: ["خطأ في التحليل"],
      },
      uncertaintyReport: {
        overallConfidence: 0,
        uncertainties: [],
      },
      metadata: {
        analysisTimestamp: new Date(),
        status: "Failed",
        analysisTime: 0,
        agentsUsed: [],
        tokensUsed: 0,
      },
    };
  }
}
