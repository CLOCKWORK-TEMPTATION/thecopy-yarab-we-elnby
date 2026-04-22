import { TaskType } from "@core/types";
import { BaseAgent } from "../shared/BaseAgent";
import { StandardAgentInput } from "../shared/standardAgentPattern";
import { VISUAL_CINEMATIC_ANALYZER_AGENT_CONFIG } from "./agent";

export class VisualCinematicAnalyzerAgent extends BaseAgent {
  constructor() {
    super(
      "VisualCinematicAnalyzer AI",
      TaskType.VISUAL_CINEMATIC_ANALYZER,
      VISUAL_CINEMATIC_ANALYZER_AGENT_CONFIG.systemPrompt || ""
    );
    this.confidenceFloor = 0.75;
  }

  protected buildPrompt(input: StandardAgentInput): string {
    return `تحليل بصري وسينمائي:\n${input.input}`;
  }
}

export const visualCinematicAnalyzerAgent = new VisualCinematicAnalyzerAgent();
