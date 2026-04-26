import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskType } from "@core/types";

import { VisualCinematicAnalyzerAgent } from "./VisualCinematicAnalyzerAgent";

const { mockExecuteStandardPattern } = vi.hoisted(() => ({
  mockExecuteStandardPattern: vi.fn(),
}));

vi.mock("../shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardPattern,
}));

describe("VisualCinematicAnalyzerAgent", () => {
  let agent: VisualCinematicAnalyzerAgent;

  beforeEach(() => {
    agent = new VisualCinematicAnalyzerAgent();
    mockExecuteStandardPattern.mockReset();
    mockExecuteStandardPattern.mockResolvedValue({
      text: "تحليل بصري يحدد الكادرات المسيطرة والإيقاع الحركي للمشهد.",
      confidence: 0.79,
      notes: ["رؤية سينمائية واضحة"],
      metadata: {},
    });
  });

  it("should expose the current backend configuration", () => {
    const config = agent.getConfig();

    expect(config.name).toBe("VisualCinematicAnalyzer AI");
    expect(config.taskType).toBe(TaskType.VISUAL_CINEMATIC_ANALYZER);
    expect(config.confidenceFloor).toBe(0.75);
  });

  it("should build the visual analysis prompt and normalize the result", async () => {
    const result = await agent.executeTask({
      input: "حلل الجانب البصري والسينمائي",
    });

    expect(mockExecuteStandardPattern.mock.calls[0]?.[0]).toContain("تحليل بصري وسينمائي");
    expect(result.text).toContain("تحليل بصري");
    expect(result.confidence).toBe(0.79);
    expect(result.metadata?.timestamp).toBeDefined();
  });
});
