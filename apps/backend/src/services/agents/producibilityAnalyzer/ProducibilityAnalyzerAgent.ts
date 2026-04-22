import { TaskType } from "@core/types";
import { BaseAgent } from "../shared/BaseAgent";
import { StandardAgentInput } from "../shared/standardAgentPattern";
import { PRODUCIBILITY_ANALYZER_AGENT_CONFIG } from "./agent";

export class ProducibilityAnalyzerAgent extends BaseAgent {
  constructor() {
    super(
      "ProducibilityAnalyzer AI",
      TaskType.PRODUCIBILITY_ANALYZER,
      PRODUCIBILITY_ANALYZER_AGENT_CONFIG.systemPrompt || ""
    );
    this.confidenceFloor = 0.75;
  }

  protected buildPrompt(input: StandardAgentInput): string {
    return `تحليل قابلية الإنتاج:\n${input.input}`;
  }
}

export const producibilityAnalyzerAgent = new ProducibilityAnalyzerAgent();
