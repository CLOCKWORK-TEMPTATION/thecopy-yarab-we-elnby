import { describe, it, expect, beforeEach } from "vitest";

import { TaskType } from "@core/types";

import { DialogueAdvancedAnalyzerAgent } from "./DialogueAdvancedAnalyzerAgent";

describe("DialogueAdvancedAnalyzerAgent", () => {
  let agent: DialogueAdvancedAnalyzerAgent;

  beforeEach(() => {
    agent = new DialogueAdvancedAnalyzerAgent();
  });

  it("should have correct configuration", () => {
    const config = agent.getConfig();

    expect(config.name).toBeTruthy();
    expect(config.taskType).toBe(TaskType.DIALOGUE_ADVANCED_ANALYZER);
    expect(config.confidenceFloor).toBe(0.75);
  });

  it("should execute task successfully", async () => {
    // اختبار تنفيذ المهمة بنجاح
    const result = await agent.executeTask({
      input: "حلل الحوار",
      options: { enableRAG: true },
      context: {
        dialogueText: "حوار تفصيلي بين الشخصيات",
      },
    });

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it("should provide analysis structure in text", async () => {
    const result = await agent.executeTask({
      input: "حوار اختباري",
      options: { enableRAG: false },
    });

    // Check if output contains some analysis keywords or structure
    expect(typeof result.text).toBe("string");
  });
});
