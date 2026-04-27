import { BaseStation, StationInput, StationOptions } from "../base-station";
import { GeminiService } from "../gemini-service";

import { analyzeMarketPotential, identifyTargetAudience } from "./analyzers/market";
import { analyzeThemes, generateArtisticReferences } from "./analyzers/themes-and-references";
import { generate3DMap, generateDynamicTone } from "./analyzers/structure";
import { generateElevatorPitch, generateStoryStatements } from "./analyzers/story-and-pitch";
import { generateGenreMatrix, generateHybridGenre } from "./analyzers/genre";
import { buildContextFromStation1 } from "./context";
import { calculateConfidenceScore, getErrorFallback } from "./confidence";
import { STATION2_AGENTS_USED } from "./defaults";
import type { Station2Input, Station2Output } from "./types";

export type {
  ArtisticReferencesResult,
  DynamicToneResult,
  GenreMatrixResult,
  Station2Context,
  Station2Input,
  Station2Output,
  ThemeAnalysis,
  ThreeDMapResult,
} from "./types";

export class Station2ConceptualAnalysis extends BaseStation {
  constructor(geminiService: GeminiService) {
    super(geminiService, "Station 2: Conceptual Analysis", 2);
  }

  protected async execute(
    input: StationInput,
    _options: StationOptions
  ): Promise<Station2Output> {
    const station2Input = input as Station2Input;
    const startTime = Date.now();
    const context = buildContextFromStation1(
      station2Input.station1Output,
      station2Input.text
    );

    try {
      const [
        storyStatements,
        threeDMap,
        hybridGenreOptions,
        themeAnalysis,
        targetAudience,
      ] = await Promise.all([
        generateStoryStatements(this.geminiService, context),
        generate3DMap(this.geminiService, context),
        generateHybridGenre(this.geminiService, context),
        analyzeThemes(this.geminiService, context),
        identifyTargetAudience(this.geminiService, context),
      ]);

      const storyStatement = storyStatements[0] ?? "فشل توليد بيان القصة";
      const hybridGenre = hybridGenreOptions[0] ?? "دراما عامة";

      const [
        elevatorPitch,
        genreMatrix,
        dynamicTone,
        artisticReferences,
        marketAnalysis,
      ] = await Promise.all([
        generateElevatorPitch(this.geminiService, storyStatement, context),
        generateGenreMatrix(this.geminiService, hybridGenre, context),
        generateDynamicTone(this.geminiService, hybridGenre, context),
        generateArtisticReferences(this.geminiService, hybridGenre, context),
        analyzeMarketPotential(this.geminiService, hybridGenre, context),
      ]);

      const processingTime = Date.now() - startTime;

      return {
        storyStatement,
        alternativeStatements: storyStatements.slice(1),
        threeDMap,
        elevatorPitch: elevatorPitch || "فشل توليد العرض المختصر",
        hybridGenre,
        genreAlternatives: hybridGenreOptions.slice(1),
        genreContributionMatrix: genreMatrix,
        dynamicTone,
        artisticReferences,
        themeAnalysis,
        targetAudience,
        marketAnalysis,
        metadata: {
          analysisTimestamp: new Date(),
          status: "Success",
          processingTime,
          confidenceScore: calculateConfidenceScore(
            storyStatements,
            threeDMap,
            themeAnalysis
          ),
        },
      };
    } catch (error) {
      console.error("[Station2] Processing error:", error);
      return getErrorFallback();
    }
  }

  protected getAgentsUsed(): string[] {
    return [...STATION2_AGENTS_USED];
  }
}
