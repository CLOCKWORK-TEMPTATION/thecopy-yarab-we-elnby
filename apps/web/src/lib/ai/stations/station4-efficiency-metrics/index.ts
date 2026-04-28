import {
  BaseStation,
  type StationConfig,
} from "../../core/pipeline/base-station";
import { GeminiService } from "../gemini-service";

import { LiteraryQualityAnalyzer } from "./agents/literary-quality";
import { ProducibilityAnalyzer } from "./agents/producibility";
import { RecommendationsGenerator } from "./agents/recommendations";
import { RhythmMappingAgent } from "./agents/rhythm";
import {
  calculateCommercialPotential,
  calculateEfficiencyMetrics,
} from "./calculators";
import {
  checkConstitutionalCompliance,
  parseRecommendationBuckets,
} from "./constitutional";
import { getErrorFallback } from "./defaults";
import { quantifyUncertainty } from "./uncertainty";

import type {
  QualityAssessment,
  Station4Input,
  Station4Output,
  UncertaintyReport,
} from "./types";

export type {
  EfficiencyMetrics,
  ProducibilityAnalysis,
  QualityAssessment,
  Recommendation,
  RhythmAnalysis,
  Station4Input,
  Station4Output,
  UncertaintyReport,
} from "./types";

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
      const efficiencyMetrics = calculateEfficiencyMetrics(
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
        commercial: calculateCommercialPotential(
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
        const constitutionalCheck = checkConstitutionalCompliance(
          JSON.stringify(recommendations),
          input.originalText
        );

        if (!constitutionalCheck.compliant) {
          finalRecommendations = parseRecommendationBuckets(
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
        uncertaintyReport = quantifyUncertainty(
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
      return getErrorFallback();
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
    return getErrorFallback();
  }
}
