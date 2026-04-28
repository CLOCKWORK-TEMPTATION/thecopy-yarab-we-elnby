import { GeminiService, GeminiModel } from "../../gemini-service";

import { AdvancedDialogueAnalysis } from "./types";
import { safeSub, asJsonRecord, asArray, scaledTimestamp } from "./utils";

export class AdvancedDialogueAnalysisEngine {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  async analyzeDialogue(
    fullText: string,
    _characters: Map<string, unknown>
  ): Promise<AdvancedDialogueAnalysis> {
    const prompt = `
    Based on the provided narrative text and character information, analyze the dialogue in depth:

    1.  **subtext**: A list of subtextual moments, each with:
        - "location": Approximate position in the story
        - "explicit_text": What is actually said
        - "implied_meaning": What is meant but not said
        - "confidence": How confident you are in this interpretation (0-10)

    2.  **power_dynamics**: A list of power dynamics between characters, each with:
        - "characters": The characters involved
        - "relationship_type": Type of relationship
        - "power_balance": Power balance (-1 to 1)
        - "evolution": How this balance changes over time

    3.  **emotional_beats**: Key emotional moments in dialogue, each with:
        - "timestamp": Approximate position in the story
        - "emotion": The emotion expressed
        - "intensity": Intensity of the emotion (0-10)
        - "characters": Characters involved
        - "trigger": What triggers this emotion

    4.  **advanced_metrics**: Overall metrics including:
        - "subtext_depth": Depth of subtext (0-10)
        - "emotional_range": Range of emotions expressed (0-10)
        - "character_voice_consistency": How consistent each character's voice is

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
      const advancedMetrics = asJsonRecord(analysis.advanced_metrics);

      const emotionalBeats = asArray<any>(analysis.emotional_beats).map(
        (beat) => ({
          ...beat,
          timestamp: scaledTimestamp(beat.timestamp),
        })
      );

      const characterVoiceConsistency = new Map<string, number>();
      const data = asJsonRecord(advancedMetrics.character_voice_consistency);
      for (const [char, consistency] of Object.entries(data)) {
        characterVoiceConsistency.set(char, Number(consistency) || 0);
      }

      return {
        subtext: asArray<any>(analysis.subtext),
        powerDynamics: asArray<any>(analysis.power_dynamics),
        emotionalBeats,
        advancedMetrics: {
          subtextDepth: Number(advancedMetrics.subtext_depth) || 5,
          emotionalRange: Number(advancedMetrics.emotional_range) || 5,
          characterVoiceConsistency,
        },
      };
    } catch (error) {
      console.error("Error in advanced dialogue analysis:", error);
      return this.getDefaultDialogueResults();
    }
  }

  private getDefaultDialogueResults(): AdvancedDialogueAnalysis {
    return {
      subtext: [],
      powerDynamics: [],
      emotionalBeats: [],
      advancedMetrics: {
        subtextDepth: 0,
        emotionalRange: 0,
        characterVoiceConsistency: new Map(),
      },
    };
  }
}
