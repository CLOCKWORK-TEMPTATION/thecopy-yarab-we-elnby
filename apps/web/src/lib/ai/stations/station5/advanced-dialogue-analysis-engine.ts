import { GeminiModel, GeminiService } from "../gemini-service";

import {
  AdvancedDialogueAnalysis,
  EmotionalBeat,
  Location,
  PowerDynamic,
  SubtextAnalysis,
} from "./types";
import {
  safeSub,
  asJsonRecord,
  asJsonRecords,
  asNumber,
  asString,
  asStringArray,
} from "./utils";

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

      const analysis = asJsonRecord(JSON.parse(result.content ?? "{}"));
      const advancedMetrics = asJsonRecord(analysis["advanced_metrics"]);

      const characterVoiceConsistency = new Map<string, number>();
      const data = asJsonRecord(advancedMetrics["character_voice_consistency"]);
      for (const [char, consistency] of Object.entries(data)) {
        characterVoiceConsistency.set(char, asNumber(consistency, 0));
      }

      return {
        subtext: asJsonRecords(analysis["subtext"]).map(toSubtextAnalysis),
        powerDynamics: asJsonRecords(analysis["power_dynamics"]).map(
          toPowerDynamic
        ),
        emotionalBeats: asJsonRecords(analysis["emotional_beats"]).map(
          toEmotionalBeat
        ),
        advancedMetrics: {
          subtextDepth: asNumber(advancedMetrics["subtext_depth"], 5),
          emotionalRange: asNumber(advancedMetrics["emotional_range"], 5),
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

function toLocation(record: Record<string, unknown>): Location {
  const timestamp = asNumber(record["timestamp"], 0);
  const start = asNumber(record["start"], timestamp);
  const end = asNumber(record["end"], start);

  return {
    start,
    end,
    description: asString(record["location"], asString(record["description"])),
  };
}

function toSubtextAnalysis(record: Record<string, unknown>): SubtextAnalysis {
  return {
    location: toLocation(record),
    surfaceText: asString(
      record["surfaceText"],
      asString(record["explicit_text"])
    ),
    subtext: asString(record["subtext"], asString(record["implied_meaning"])),
    speaker: asString(record["speaker"], "unknown"),
    listener: asString(record["listener"], "unknown"),
    intention: asString(record["intention"], "unknown"),
  };
}

function toPowerDynamic(record: Record<string, unknown>): PowerDynamic {
  const dynamic = asString(
    record["dynamic"],
    asString(record["relationship_type"])
  );

  return {
    characters: asStringArray(record["characters"]),
    dynamic: isPowerDynamicValue(dynamic) ? dynamic : "equal",
    evidence: asStringArray(record["evidence"]),
    significance: asNumber(
      record["significance"],
      asNumber(record["power_balance"], 0)
    ),
  };
}

function toEmotionalBeat(record: Record<string, unknown>): EmotionalBeat {
  return {
    location: toLocation(record),
    emotion: asString(record["emotion"], "neutral"),
    intensity: asNumber(record["intensity"], 0),
    character: asString(
      record["character"],
      asStringArray(record["characters"])[0] ?? "unknown"
    ),
    trigger: asString(record["trigger"]),
  };
}

function isPowerDynamicValue(value: string): value is PowerDynamic["dynamic"] {
  return (
    value === "dominant" ||
    value === "submissive" ||
    value === "equal" ||
    value === "conflictual"
  );
}
