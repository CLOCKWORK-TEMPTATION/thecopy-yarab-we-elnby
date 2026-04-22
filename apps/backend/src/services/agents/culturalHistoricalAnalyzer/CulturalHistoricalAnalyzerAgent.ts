import { TaskType } from "@core/types";
import { BaseAgent } from "../shared/BaseAgent";
import { StandardAgentInput } from "../shared/standardAgentPattern";
import { CULTURAL_HISTORICAL_ANALYZER_AGENT_CONFIG } from "./agent";

export class CulturalHistoricalAnalyzerAgent extends BaseAgent {
  constructor() {
    super(
      "CulturalHistoricalAnalyzer AI",
      TaskType.CULTURAL_HISTORICAL_ANALYZER,
      CULTURAL_HISTORICAL_ANALYZER_AGENT_CONFIG.systemPrompt || ""
    );
    this.confidenceFloor = 0.75;
  }

  protected buildPrompt(input: StandardAgentInput): string {
    return `تحليل ثقافي وتاريخي:\n${input.input}`;
  }
}

export const culturalHistoricalAnalyzerAgent = new CulturalHistoricalAnalyzerAgent();
