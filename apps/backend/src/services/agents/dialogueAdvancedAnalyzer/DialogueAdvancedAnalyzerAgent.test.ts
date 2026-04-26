import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskType } from "@core/types";

import { DialogueAdvancedAnalyzerAgent } from "./DialogueAdvancedAnalyzerAgent";

const { mockExecuteStandardPattern } = vi.hoisted(() => ({
  mockExecuteStandardPattern: vi.fn(),
}));

vi.mock("../shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardPattern,
}));

describe("DialogueAdvancedAnalyzerAgent", () => {
  let agent: DialogueAdvancedAnalyzerAgent;

  beforeEach(() => {
    agent = new DialogueAdvancedAnalyzerAgent();
    mockExecuteStandardPattern.mockReset();
    mockExecuteStandardPattern.mockResolvedValue({
      text: "تحليل الحوار يكشف النص الضمني وتحولات السيطرة داخل المشهد.",
      confidence: 0.76,
      notes: ["رصد جيد للطبقات الضمنية"],
      metadata: { ragUsed: false },
    });
  });

  it("should expose the current backend configuration", () => {
    const config = agent.getConfig();

    expect(config.name).toBe("DialogueDeepScan AI");
    expect(config.taskType).toBe(TaskType.DIALOGUE_ADVANCED_ANALYZER);
    expect(config.confidenceFloor).toBe(0.75);
  });

  it("should include dialogue context in the generated prompt", async () => {
    const result = await agent.executeTask({
      input: "حلل الحوار التالي",
      context: {
        dialogueContext: "مواجهة بين البطل وخصمه في نهاية الفصل",
      },
    });

    expect(mockExecuteStandardPattern).toHaveBeenCalledTimes(1);
    expect(mockExecuteStandardPattern.mock.calls[0]?.[0]).toContain("مواجهة بين البطل وخصمه");
    expect(result.text).toContain("تحليل الحوار");
    expect(result.confidence).toBe(0.76);
    expect(result.metadata?.timestamp).toBeDefined();
  });

  it("should return the fallback response with error metadata on failure", async () => {
    mockExecuteStandardPattern.mockRejectedValueOnce(new Error("dialogue failed"));

    const result = await agent.executeTask({
      input: "حلل الحوار",
    });

    expect(result.text).toContain("تحليل حوار");
    expect(result.metadata?.error).toBe("dialogue failed");
    expect(result.notes[0]).toContain("dialogue failed");
  });
});
