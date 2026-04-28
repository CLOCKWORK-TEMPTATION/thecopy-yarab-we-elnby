import { BaseStation, StationInput, StationOptions } from "../base-station";
import { GeminiService } from "../gemini-service";

import {
  analyzeCharactersInDepth,
  identifyMajorCharacters,
} from "./analyzers/characters";
import { analyzeDialogue } from "./analyzers/dialogue";
import { generateLogline } from "./analyzers/logline";
import { analyzeNarrativeStyle } from "./analyzers/narrative-style";
import { analyzeVoices } from "./analyzers/voices";
import {
  AGENTS_USED,
  getDefaultDialogueMetrics,
  getDefaultVoiceAnalysis,
} from "./defaults";
import { calculateTextStatistics, chunkText } from "./text-utils";
import { buildUncertaintyReport } from "./uncertainty";

import type {
  CharacterProfile,
  DialogueMetrics,
  Station1Input,
  Station1Output,
  VoiceAnalysis,
} from "./types";

export type {
  CharacterProfile,
  DialogueMetrics,
  NarrativeStyleAnalysis,
  Station1Input,
  Station1Output,
  VoiceAnalysis,
  VoiceProfile,
} from "./types";

export class Station1TextAnalysis extends BaseStation {
  constructor(geminiService: GeminiService) {
    super(geminiService, "Station 1: Text Analysis", 1);
  }

  protected async execute(
    input: StationInput,
    _options: StationOptions
  ): Promise<Station1Output> {
    const station1Input = input as Station1Input;
    const startTime = Date.now();
    const textLength = station1Input.text.length;
    const chunks = chunkText(station1Input.text);

    try {
      const [logline, charactersData, narrativeStyle] = await Promise.all([
        generateLogline(this.geminiService, station1Input.text),
        identifyMajorCharacters(this.geminiService, station1Input.text),
        analyzeNarrativeStyle(this.geminiService, station1Input.text),
      ]);

      const characters = await analyzeCharactersInDepth(
        this.geminiService,
        station1Input.text,
        charactersData
      );

      let dialogueAnalysis: DialogueMetrics;
      let voiceAnalysis: VoiceAnalysis;

      if (station1Input.station1Options?.enableDialogueAnalysis !== false) {
        [dialogueAnalysis, voiceAnalysis] = await Promise.all([
          analyzeDialogue(this.geminiService, station1Input.text, characters),
          analyzeVoices(this.geminiService, station1Input.text, characters),
        ]);
      } else {
        dialogueAnalysis = getDefaultDialogueMetrics();
        voiceAnalysis = getDefaultVoiceAnalysis();
      }

      const textStats = calculateTextStatistics(station1Input.text);
      const uncertaintyReport = buildUncertaintyReport(
        characters,
        dialogueAnalysis,
        voiceAnalysis
      );

      const characterAnalysis = new Map<string, CharacterProfile>();
      characters.forEach((char) => characterAnalysis.set(char.name, char));

      return {
        logline,
        majorCharacters: characters.slice(0, 7),
        characterAnalysis,
        dialogueAnalysis,
        voiceAnalysis,
        narrativeStyleAnalysis: narrativeStyle,
        textStatistics: textStats,
        uncertaintyReport,
        metadata: {
          analysisTimestamp: new Date(),
          status: "Success",
          agentsUsed: this.getAgentsUsed(),
          executionTime: Date.now() - startTime,
          textLength,
          chunksProcessed: chunks.length,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Station 1 execution failed: ${errorMessage}`);
    }
  }

  protected getAgentsUsed(): string[] {
    return [...AGENTS_USED];
  }
}
