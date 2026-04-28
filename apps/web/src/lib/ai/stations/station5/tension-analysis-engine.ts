import { GeminiService, GeminiModel } from "../../gemini-service";

import { TensionAnalysis } from "./types";
import {
  safeSub,
  asJsonRecord,
  asArray,
  asStringArray,
  scaledTimestamp,
} from "./utils";

export class TensionAnalysisEngine {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  async analyzeTension(
    fullText: string,
    _network: any
  ): Promise<TensionAnalysis> {
    const prompt = `
    Based on the provided narrative text and conflict network, analyze the tension curve throughout the story:

    1.  **tension_curve**: An array of numbers (0-10) representing tension levels at different points in the narrative.

    2.  **peaks**: A list of tension peaks, each with:
        - "timestamp": Approximate position in the story (0-1)
        - "intensity": Tension level (0-10)
        - "description": What causes this peak
        - "contributing_factors": Factors contributing to this peak

    3.  **valleys**: A list of tension valleys, each with:
        - "timestamp": Approximate position in the story (0-1)
        - "intensity": Tension level (0-10)
        - "description": What causes this valley
        - "contributing_factors": Factors contributing to this valley

    4.  **recommendations**: Suggestions for improving tension, with:
        - "add_tension": Locations where tension should be increased
        - "reduce_tension": Locations where tension should be decreased
        - "redistribute_tension": General suggestions for redistributing tension

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
      const recommendations = asJsonRecord(analysis.recommendations);

      const peaks = asArray<any>(analysis.peaks).map((peak) => ({
        ...peak,
        timestamp: scaledTimestamp(peak.timestamp),
      }));

      const valleys = asArray<any>(analysis.valleys).map((valley) => ({
        ...valley,
        timestamp: scaledTimestamp(valley.timestamp),
      }));

      const addTension = asArray<any>(recommendations.add_tension).map(
        (loc) => ({
          ...loc,
          timestamp: scaledTimestamp(loc.timestamp),
        })
      );

      const reduceTension = asArray<any>(recommendations.reduce_tension).map(
        (loc) => ({
          ...loc,
          timestamp: scaledTimestamp(loc.timestamp),
        })
      );

      return {
        tensionCurve: asArray<number>(analysis.tension_curve),
        peaks,
        valleys,
        recommendations: {
          addTension,
          reduceTension,
          redistributeTension: asStringArray(
            recommendations.redistribute_tension
          ),
        },
      };
    } catch (error) {
      console.error("Error in tension analysis:", error);
      return this.getDefaultTensionResults();
    }
  }

  private getDefaultTensionResults(): TensionAnalysis {
    return {
      tensionCurve: [],
      peaks: [],
      valleys: [],
      recommendations: {
        addTension: [],
        reduceTension: [],
        redistributeTension: [],
      },
    };
  }
}
