import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskType } from "@core/types";

import { CharacterDeepAnalyzerAgent } from "./CharacterDeepAnalyzerAgent";

const { mockExecuteStandardPattern } = vi.hoisted(() => ({
  mockExecuteStandardPattern: vi.fn(),
}));

vi.mock("../shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardPattern,
}));

describe("CharacterDeepAnalyzerAgent", () => {
  let agent: CharacterDeepAnalyzerAgent;

  beforeEach(() => {
    agent = new CharacterDeepAnalyzerAgent();
    mockExecuteStandardPattern.mockReset();
    mockExecuteStandardPattern.mockResolvedValue({
      text: "  أحمد شخصية تحركها الرغبة في إثبات الذات، ويتولد صراعه من خوف قديم من الفشل.  ",
      confidence: 0.74,
      notes: ["مخرجات أولية من النمط القياسي"],
      metadata: {},
    });
  });

  it("should expose the current backend configuration", () => {
    const config = agent.getConfig();

    expect(config.name).toBe("CharacterDeepAnalyzer AI");
    expect(config.taskType).toBe(TaskType.CHARACTER_DEEP_ANALYZER);
    expect(config.confidenceFloor).toBe(0.75);
  });

  it("should build the character prompt and normalize the result", async () => {
    const result = await agent.executeTask({
      input: "حلل الشخصية بعمق من حيث الدوافع والصراع.",
      context: {
        characterName: "أحمد",
        previousAnalysis: "تمهيد سابق يوضح علاقته المتوترة بوالده.",
      },
    });

    const prompt = mockExecuteStandardPattern.mock.calls[0]?.[0];

    expect(prompt).toContain("أحمد");
    expect(prompt).toContain("تمهيد سابق");
    expect(result.text.startsWith("أحمد شخصية")).toBe(true);
    expect(result.confidence).toBe(0.74);
    expect(Array.isArray(result.notes)).toBe(true);
    expect(result.metadata?.timestamp).toBeDefined();
  });

  it("should return the fallback contract with error metadata", async () => {
    mockExecuteStandardPattern.mockRejectedValueOnce(new Error("character failed"));

    const result = await agent.executeTask({
      input: "حلل الشخصية",
      context: {
        characterName: "أحمد",
      },
    });

    expect(result.confidence).toBe(0.3);
    expect(result.metadata?.error).toBe("character failed");
    expect(result.text).toContain("تحليل شخصية");
  });
});
