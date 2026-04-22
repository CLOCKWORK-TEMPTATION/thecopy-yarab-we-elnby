import { TaskType } from "@core/types";
import { BaseAgent } from "../shared/BaseAgent";
import { StandardAgentInput } from "../shared/standardAgentPattern";
import { THEMES_MESSAGES_ANALYZER_AGENT_CONFIG } from "./agent";

export class ThemesMessagesAnalyzerAgent extends BaseAgent {
  constructor() {
    super(
      "ThemesMessagesAnalyzer AI",
      TaskType.THEMES_MESSAGES_ANALYZER,
      THEMES_MESSAGES_ANALYZER_AGENT_CONFIG.systemPrompt || ""
    );
    this.confidenceFloor = 0.75;
  }

  protected buildPrompt(input: StandardAgentInput): string {
    return `تحليل الموضوعات والرسائل:\n${input.input}`;
  }
}

export const themesMessagesAnalyzerAgent = new ThemesMessagesAnalyzerAgent();
