import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskType } from "@core/types";
import { ProducibilityAnalyzerAgent } from "./ProducibilityAnalyzerAgent";

const { mockExecuteStandardPattern } = vi.hoisted(() => ({
  mockExecuteStandardPattern: vi.fn(),
}));

vi.mock("../shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardPattern,
}));

describe("ProducibilityAnalyzerAgent", () => {
  let agent: ProducibilityAnalyzerAgent;

  beforeEach(() => {
    agent = new ProducibilityAnalyzerAgent();
    mockExecuteStandardPattern.mockReset();
    mockExecuteStandardPattern.mockResolvedValue({
      text: "تحليل إنتاجي يوضح الكلفة والتعقيد اللوجستي بشكل قابل للتنفيذ.",
      confidence: 0.78,
      notes: ["تقدير إنتاجي متزن"],
      metadata: {},
    });
  });

  it("should expose the current backend configuration", () => {
    const config = agent.getConfig();

    expect(config.name).toBe("ProducibilityAnalyzer AI");
    expect(config.taskType).toBe(TaskType.PRODUCIBILITY_ANALYZER);
    expect(config.confidenceFloor).toBe(0.75);
  });

  it("should build the producibility prompt and return normalized output", async () => {
    const result = await agent.executeTask({
      input: "حلل قابلية الإنتاج للمشروع",
    });

    expect(mockExecuteStandardPattern.mock.calls[0]?.[0]).toContain("تحليل قابلية الإنتاج");
    expect(result.text).toContain("تحليل إنتاجي");
    expect(result.confidence).toBe(0.78);
    expect(result.notes).toEqual(["تقدير إنتاجي متزن"]);
    expect(result.metadata?.timestamp).toBeDefined();
  });
});
