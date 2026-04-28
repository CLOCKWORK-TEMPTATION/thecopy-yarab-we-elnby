import { GeminiModel, GeminiService } from "../gemini-service";

import { Location, TensionAnalysis, TensionPeak, TensionValley } from "./types";
import {
  safeSub,
  asJsonRecord,
  asArray,
  asJsonRecords,
  asNumber,
  asString,
  asStringArray,
} from "./utils";

export class TensionAnalysisEngine {
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  async analyzeTension(
    fullText: string,
    _network: unknown
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

      const analysis = asJsonRecord(JSON.parse(result.content ?? "{}"));
      const recommendations = asJsonRecord(analysis["recommendations"]);

      return {
        tensionCurve: asArray<number>(analysis["tension_curve"]),
        peaks: asJsonRecords(analysis["peaks"]).map(toTensionPeak),
        valleys: asJsonRecords(analysis["valleys"]).map(toTensionValley),
        recommendations: {
          addTension: asJsonRecords(recommendations["add_tension"]).map(
            toLocation
          ),
          reduceTension: asJsonRecords(recommendations["reduce_tension"]).map(
            toLocation
          ),
          redistributeTension: asStringArray(
            recommendations["redistribute_tension"]
          ).map((description) => ({ start: 0, end: 0, description })),
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

function timestampRange(
  record: Record<string, unknown>
): Pick<Location, "start" | "end"> {
  const timestamp = asNumber(record["timestamp"], 0);
  const start = asNumber(record["start"], timestamp);
  const end = asNumber(record["end"], start);

  return { start, end };
}

function toLocation(record: Record<string, unknown>): Location {
  const { start, end } = timestampRange(record);

  return {
    start,
    end,
    description: asString(record["description"], asString(record["location"])),
  };
}

function toTensionPeak(record: Record<string, unknown>): TensionPeak {
  return {
    location: toLocation(record),
    intensity: asNumber(record["intensity"], 0),
    duration: asNumber(record["duration"], 0),
    justification: asString(
      record["justification"],
      asString(record["description"])
    ),
  };
}

function toTensionValley(record: Record<string, unknown>): TensionValley {
  return {
    location: toLocation(record),
    depth: asNumber(record["depth"], asNumber(record["intensity"], 0)),
    duration: asNumber(record["duration"], 0),
    justification: asString(
      record["justification"],
      asString(record["description"])
    ),
  };
}
