import { IntegratedAgent } from "../../services/agents/core/integratedAgent";
import { TaskType } from "../../types/types";

import { CHARACTER_DEEP_ANALYZER_AGENT_CONFIG } from "./characterDeepAnalyzerConfig";

import type { ProcessedFile } from "../../services/agents/core/fileReaderService";
import type { GeminiServiceResponse } from "../../services/agents/core/geminiService";

export class CharacterDeepAnalyzerAgent extends IntegratedAgent {
  constructor(apiKey: string) {
    super(CHARACTER_DEEP_ANALYZER_AGENT_CONFIG, apiKey);
  }

  public async execute(
    files: ProcessedFile[],
    specialRequirements: string,
    additionalInfo: string,
  ): Promise<GeminiServiceResponse> {
    const result = await this.geminiService.processTextsWithGemini({
      processedFiles: files,
      taskType: TaskType.CHARACTER_DEEP_ANALYZER,
      specialRequirements: specialRequirements,
      additionalInfo: additionalInfo,
    });

    return result;
  }
}
