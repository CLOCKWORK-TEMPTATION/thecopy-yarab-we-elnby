import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskType } from "@core/types";
import { CulturalHistoricalAnalyzerAgent } from "./CulturalHistoricalAnalyzerAgent";

const { mockExecuteStandardPattern } = vi.hoisted(() => ({
  mockExecuteStandardPattern: vi.fn(),
}));

vi.mock("../shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardPattern,
}));

describe("CulturalHistoricalAnalyzerAgent", () => {
  let agent: CulturalHistoricalAnalyzerAgent;

  beforeEach(() => {
    agent = new CulturalHistoricalAnalyzerAgent();
    mockExecuteStandardPattern.mockReset();
    mockExecuteStandardPattern.mockResolvedValue({
      text: "تحليل ثقافي موجز ومدعوم بالسياق التاريخي.",
      confidence: 0.74,
      notes: ["تحقق سياقي جيد"],
      metadata: { ragUsed: false },
    });
  });

  it("should expose the current backend configuration", () => {
    const config = agent.getConfig();

    expect(config.name).toBe("CulturalHistoricalAnalyzer AI");
    expect(config.taskType).toBe(TaskType.CULTURAL_HISTORICAL_ANALYZER);
    expect(config.confidenceFloor).toBe(0.75);
  });

  it("should build the cultural analysis prompt and normalize the result", async () => {
    const result = await agent.executeTask({
      input: "حلل الخلفية الثقافية والتاريخية للمشهد",
    });

    expect(mockExecuteStandardPattern).toHaveBeenCalledTimes(1);
    expect(mockExecuteStandardPattern.mock.calls[0]?.[0]).toContain("تحليل ثقافي وتاريخي");
    expect(result.text).toContain("تحليل ثقافي");
    expect(result.confidence).toBe(0.74);
    expect(result.notes).toEqual(["تحقق سياقي جيد"]);
    expect(result.metadata?.timestamp).toBeDefined();
  });

  it("should surface fallback metadata when execution fails", async () => {
    mockExecuteStandardPattern.mockRejectedValueOnce(new Error("boom"));

    const result = await agent.executeTask({
      input: "حلل النص",
    });

    expect(result.confidence).toBe(0.3);
    expect(result.metadata?.error).toBe("boom");
    expect(result.metadata?.timestamp).toBeDefined();
  });
});
