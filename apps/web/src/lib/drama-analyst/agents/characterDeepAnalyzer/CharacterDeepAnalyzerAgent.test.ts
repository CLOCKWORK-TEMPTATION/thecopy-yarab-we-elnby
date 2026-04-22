import { describe, it, expect, beforeEach } from "vitest";
import { CharacterDeepAnalyzerAgent } from "./CharacterDeepAnalyzerAgent";
import { TaskType } from "@core/types";

describe("CharacterDeepAnalyzerAgent", () => {
  let agent: CharacterDeepAnalyzerAgent;

  beforeEach(() => {
    agent = new CharacterDeepAnalyzerAgent();
  });

  it("should have correct configuration", () => {
    const config = agent.getConfig();

    expect(config.name).toBeTruthy();
    expect(config.taskType).toBe(TaskType.CHARACTER_DEEP_ANALYZER);
    expect(config.confidenceFloor).toBe(0.75);
  });

  it("should execute task successfully", async () => {
    // اختبار تنفيذ المهمة بنجاح
    const result = await agent.executeTask({
      input: "حلل الشخصية الرئيسية",
      options: { enableRAG: true },
      context: {
        characterText: "وصف تفصيلي للشخصية",
      },
    });

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it("should handle error cases gracefully", async () => {
    const result = await agent.executeTask({
      input: "",
      options: { enableRAG: false },
    });

    expect(result.text).toBeTruthy();
    // In fallback or error, confidence should be low or handled
  });
});
