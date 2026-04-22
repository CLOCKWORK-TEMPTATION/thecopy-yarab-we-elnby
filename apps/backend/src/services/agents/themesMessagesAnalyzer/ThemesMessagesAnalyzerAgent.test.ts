import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskType } from "@core/types";
import { ThemesMessagesAnalyzerAgent } from "./ThemesMessagesAnalyzerAgent";

const { mockExecuteStandardPattern } = vi.hoisted(() => ({
  mockExecuteStandardPattern: vi.fn(),
}));

vi.mock("../shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardPattern,
}));

describe("ThemesMessagesAnalyzerAgent", () => {
  let agent: ThemesMessagesAnalyzerAgent;

  beforeEach(() => {
    agent = new ThemesMessagesAnalyzerAgent();
    mockExecuteStandardPattern.mockReset();
    mockExecuteStandardPattern.mockResolvedValue({
      text: "تحليل الموضوعات يكشف محور الهوية والعدالة في النص.",
      confidence: 0.77,
      notes: ["ربط جيد بين الرسائل والبنية"],
      metadata: {},
    });
  });

  it("should expose the current backend configuration", () => {
    const config = agent.getConfig();

    expect(config.name).toBe("ThemesMessagesAnalyzer AI");
    expect(config.taskType).toBe(TaskType.THEMES_MESSAGES_ANALYZER);
    expect(config.confidenceFloor).toBe(0.75);
  });

  it("should build the themes prompt and normalize the execution result", async () => {
    const result = await agent.executeTask({
      input: "حلل الموضوعات والرسائل",
    });

    expect(mockExecuteStandardPattern.mock.calls[0]?.[0]).toContain("تحليل الموضوعات والرسائل");
    expect(result.text).toContain("تحليل الموضوعات");
    expect(result.confidence).toBe(0.77);
    expect(result.metadata?.timestamp).toBeDefined();
  });
});
