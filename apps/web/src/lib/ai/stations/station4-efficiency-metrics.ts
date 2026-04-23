import { BaseStation, type StationConfig } from "../core/pipeline/base-station";
import { GeminiService, GeminiModel } from "./gemini-service";
import { Station3Output } from "./station3-network-builder";
import { toText } from "../gemini-core";

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

export interface ProducibilityAnalysis {
  technicalFeasibility: number; // 0-10
  budgetEstimate: "low" | "medium" | "high" | "very_high";
  productionChallenges: Array<{
    type: string;
    description: string;
    severity: "low" | "medium" | "high";
  }>;
  locationRequirements: string[];
  specialEffectsNeeded: boolean;
  castSize: number;
}

export interface RhythmAnalysis {
  overallPace: "very_slow" | "slow" | "medium" | "fast" | "very_fast";
  paceVariation: number;
  sceneLengths: number[];
  actBreakdown: Array<{
    act: number;
    averagePace: string;
    tensionProgression: number[];
  }>;
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
  uncertainties: Array<{
    type: "epistemic" | "aleatoric";
    aspect: string;
    note: string;
  }>;
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

// Literary Quality Analyzer Agent
class LiteraryQualityAnalyzer {
  constructor(private geminiService: GeminiService) {}

  async assess(
    text: string,
    previousAnalysis: Station3Output
  ): Promise<{
    overallQuality: number; // 0-100
    proseQuality: number;
    structureQuality: number;
    characterDevelopmentQuality: number;
    dialogueQuality: number;
    thematicDepth: number;
  }> {
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
      return JSON.parse(toText(result.content) || "{}");
    } catch (e) {
      console.error("Failed to parse literary quality assessment:", e);
      return {
        overallQuality: 50,
        proseQuality: 50,
        structureQuality: 50,
        characterDevelopmentQuality: 50,
        dialogueQuality: 50,
        thematicDepth: 50,
      };
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
      return JSON.parse(toText(result.content) || "{}");
    } catch (e) {
      console.error("Failed to parse producibility analysis:", e);
      return {
        technicalFeasibility: 5,
        budgetEstimate: "medium",
        productionChallenges: [],
        locationRequirements: [],
        specialEffectsNeeded: false,
        castSize: 5,
      };
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
      return JSON.parse(toText(result.content) || "{}");
    } catch (e) {
      console.error("Failed to parse rhythm analysis:", e);
      return {
        overallPace: "medium",
        paceVariation: 5,
        sceneLengths: [],
        actBreakdown: [],
        recommendations: [],
      };
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
      return JSON.parse(toText(result.content) || "{}");
    } catch (e) {
      console.error("Failed to parse recommendations:", e);
      return {
        priorityActions: ["فشل توليد التوصيات"],
        quickFixes: [],
        structuralRevisions: [],
      };
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
    let tokensUsed = 0;

    // Extract options with defaults
    const options = {
      enableConstitutionalAI: input.options?.enableConstitutionalAI ?? true,
      enableUncertaintyQuantification:
        input.options?.enableUncertaintyQuantification ?? true,
      temperature: input.options?.temperature ?? 0.3,
    };

    try {
      // 1. Calculate efficiency metrics
      const efficiencyMetrics = await this.calculateEfficiencyMetrics(
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
        const constitutionalCheck = await this.checkConstitutionalCompliance(
          JSON.stringify(recommendations),
          input.originalText
        );

        if (!constitutionalCheck.compliant) {
          finalRecommendations = JSON.parse(
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
        uncertaintyReport = await this.quantifyUncertainty(
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

  private async calculateEfficiencyMetrics(
    conflictNetwork: Station3Output["conflictNetwork"]
  ): Promise<EfficiencyMetrics> {
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
    literaryQuality: any,
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
   * Check constitutional compliance of analysis
   *
   * DEV STUB: Always returns compliant
   * TODO PRODUCTION: Implement actual constitutional AI validation
   *
   * Production implementation should:
   * 1. Validate analysis against constitutional AI principles
   * 2. Check for bias, fairness, and ethical considerations
   * 3. Apply corrections if needed
   * 4. Calculate improvement score
   */
  private async checkConstitutionalCompliance(
    analysis: string,
    _originalText: string
  ): Promise<{
    compliant: boolean;
    correctedAnalysis: string;
    improvementScore: number;
  }> {
    try {
      // DEV MODE: Placeholder - always returns compliant
      // TODO PRODUCTION: Implement constitutional AI check
      return {
        compliant: true,
        correctedAnalysis: analysis,
        improvementScore: 1.0,
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
   * Quantify uncertainty in analysis results
   *
   * DEV STUB: Returns fixed confidence score
   * TODO PRODUCTION: Implement statistical uncertainty quantification
   *
   * Production implementation should:
   * 1. Calculate epistemic and aleatoric uncertainties
   * 2. Measure confidence intervals for metrics
   * 3. Identify areas with insufficient data
   * 4. Provide statistical backing for confidence scores
   */
  private async quantifyUncertainty(
    _analysis: string,
    _originalText: string
  ): Promise<UncertaintyReport> {
    try {
      // DEV MODE: Placeholder - returns fixed confidence
      // TODO PRODUCTION: Implement proper uncertainty quantification
      return {
        overallConfidence: 0.8,
        uncertainties: [
          {
            type: "epistemic",
            aspect: "metric_calculation",
            note: "بعض المقاييس قد تحتاج إلى مزيد من البيانات",
          },
        ],
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
