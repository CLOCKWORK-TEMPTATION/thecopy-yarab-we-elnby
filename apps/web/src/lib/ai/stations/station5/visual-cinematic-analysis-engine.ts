import { GeminiService, GeminiModel } from "../../gemini-service";

import { VisualCinematicAnalysis } from "./types";
import {
  safeSub,
  asJsonRecord,
  asArray,
  asStringArray,
  scaledTimestamp,
} from "./utils";

export class VisualCinematicAnalysisEngine {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  async analyzeVisualCinematic(
    fullText: string
  ): Promise<VisualCinematicAnalysis> {
    const prompt = `
    Based on the provided narrative text, analyze the visual and cinematic elements:

    1.  **visual_density**: How visually dense the narrative is (0-10)

    2.  **cinematic_potential**: How well the text would translate to film (0-10)

    3.  **key_visual_moments**: A list of key visual moments, each with:
        - "timestamp": Approximate position in the story
        - "description": What happens visually
        - "visual_type": Type of shot (wide_shot, medium_shot, close_up, etc.)
        - "emotional_impact": Emotional impact of this visual (0-10)
        - "symbolic_elements": Any symbolic elements in this visual

    4.  **color_palette": A list of dominant colors in the narrative

    5.  **visual_motifs**: A list of recurring visual motifs, each with:
        - "motif": Description of the motif
        - "occurrences": How many times it appears
        - "narrative_function": Its purpose in the story

    6.  **cinematography_notes": General notes on cinematography

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

      const keyVisualMoments = asArray<any>(analysis.key_visual_moments).map(
        (moment) => ({
          ...moment,
          timestamp: scaledTimestamp(moment.timestamp),
        })
      );

      return {
        visualDensity: Number(analysis.visual_density) || 5,
        cinematicPotential: Number(analysis.cinematic_potential) || 5,
        keyVisualMoments,
        colorPalette: asStringArray(analysis.color_palette),
        visualMotifs: asArray<any>(analysis.visual_motifs),
        cinematographyNotes: asStringArray(analysis.cinematography_notes),
      };
    } catch (error) {
      console.error("Error in visual cinematic analysis:", error);
      return this.getDefaultVisualResults();
    }
  }

  private getDefaultVisualResults(): VisualCinematicAnalysis {
    return {
      visualDensity: 0,
      cinematicPotential: 0,
      keyVisualMoments: [],
      colorPalette: [],
      visualMotifs: [],
      cinematographyNotes: [],
    };
  }
}
