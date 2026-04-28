import { GeminiService, GeminiModel } from "../../gemini-service";

import { StylisticAnalysis } from "./types";
import { safeSub, asJsonRecord, asArray, asStringArray, asNumber } from "./utils";

export class StylisticAnalysisEngine {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  async analyzeStyle(fullText: string): Promise<StylisticAnalysis> {
    const prompt = `
    Based on the provided narrative text, analyze and provide an assessment of the following stylistic elements:

    1.  **overall_tone_assessment**:
        - "primary_tone": The main tone.
        - "secondary_tones": A list of secondary tones.
        - "tone_consistency": A score (0-10) for tone consistency.
        - "explanation": A brief explanation.

    2.  **language_complexity**:
        - "level": The complexity level ("simple", "moderate", "complex", "highly_complex").
        - "readability_score": A score (0-10) for readability.
        - "vocabulary_richness": A score (0-10) for vocabulary richness.

    3.  **pacing_impression**:
        - "overall_pacing": The overall pacing ("very_slow", "slow", "balanced", "fast", "very_fast").
        - "pacing_variation": A score (0-10) for pacing variation.
        - "scene_length_distribution": An approximate list of scene lengths.

    4.  **descriptive_richness**:
        - "visual_detail_level": A score (0-10) for the level of visual detail.
        - "sensory_engagement": A score (0-10) for sensory engagement.
        - "atmospheric_quality": A score (0-10) for atmospheric quality.

    Respond **exclusively** in valid JSON format with the keys mentioned above.
    `;

    try {
      const result = await this.geminiService.generate<string>({
        prompt,
        context: safeSub(fullText, 0, 30000),
        model: GeminiModel.FLASH,
        temperature: 0.6,
      });

      const analysis = asJsonRecord(JSON.parse(result.content || "{}"));
      const toneAssessment = asJsonRecord(analysis.overall_tone_assessment);
      const languageComplexity = asJsonRecord(analysis.language_complexity);
      const pacingImpression = asJsonRecord(analysis.pacing_impression);
      const descriptiveRichness = asJsonRecord(analysis.descriptive_richness);

      return {
        toneAssessment: {
          primaryTone:
            typeof toneAssessment.primary_tone === "string"
              ? toneAssessment.primary_tone
              : "Unknown",
          secondaryTones: asStringArray(toneAssessment.secondary_tones),
          toneConsistency: asNumber(toneAssessment.tone_consistency, 5),
          explanation:
            typeof toneAssessment.explanation === "string"
              ? toneAssessment.explanation
              : "Analysis failed",
        },
        languageComplexity: {
          level:
            languageComplexity.level === "simple" ||
            languageComplexity.level === "moderate" ||
            languageComplexity.level === "complex" ||
            languageComplexity.level === "highly_complex"
              ? languageComplexity.level
              : "moderate",
          readabilityScore: asNumber(languageComplexity.readability_score, 5),
          vocabularyRichness: asNumber(
            languageComplexity.vocabulary_richness,
            5
          ),
        },
        pacingAnalysis: {
          overallPacing:
            pacingImpression.overall_pacing === "very_slow" ||
            pacingImpression.overall_pacing === "slow" ||
            pacingImpression.overall_pacing === "balanced" ||
            pacingImpression.overall_pacing === "fast" ||
            pacingImpression.overall_pacing === "very_fast"
              ? pacingImpression.overall_pacing
              : "balanced",
          pacingVariation: asNumber(pacingImpression.pacing_variation, 5),
          sceneLengthDistribution: asArray<number>(
            pacingImpression.scene_length_distribution
          ),
        },
        descriptiveRichness: {
          visualDetailLevel: asNumber(
            descriptiveRichness.visual_detail_level,
            5
          ),
          sensoryEngagement: asNumber(
            descriptiveRichness.sensory_engagement,
            5
          ),
          atmosphericQuality: asNumber(
            descriptiveRichness.atmospheric_quality,
            5
          ),
        },
      };
    } catch (error) {
      console.error("Error in stylistic analysis:", error);
      return this.getDefaultStylisticResults();
    }
  }

  private getDefaultStylisticResults(): StylisticAnalysis {
    return {
      toneAssessment: {
        primaryTone: "Unknown",
        secondaryTones: [],
        toneConsistency: 0,
        explanation: "Analysis failed",
      },
      languageComplexity: {
        level: "moderate",
        readabilityScore: 5,
        vocabularyRichness: 5,
      },
      pacingAnalysis: {
        overallPacing: "balanced",
        pacingVariation: 5,
        sceneLengthDistribution: [],
      },
      descriptiveRichness: {
        visualDetailLevel: 5,
        sensoryEngagement: 5,
        atmosphericQuality: 5,
      },
    };
  }
}