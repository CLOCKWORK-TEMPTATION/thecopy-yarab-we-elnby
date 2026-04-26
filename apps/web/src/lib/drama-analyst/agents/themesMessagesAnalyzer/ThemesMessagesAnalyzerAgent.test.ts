import { describe, it, expect, beforeEach } from "vitest";

import { TaskType } from "@core/types";

import { ThemesMessagesAnalyzerAgent } from "./ThemesMessagesAnalyzerAgent";

describe("ThemesMessagesAnalyzerAgent", () => {
  let agent: ThemesMessagesAnalyzerAgent;

  beforeEach(() => {
    agent = new ThemesMessagesAnalyzerAgent();
  });

  it("should have correct configuration", () => {
    const config = agent.getConfig();
    expect(config.name).toBeTruthy();
    expect(config.taskType).toBe(TaskType.THEMES_MESSAGES_ANALYZER);
  });

  it("should execute task successfully", async () => {
    // اختبار تنفيذ المهمة بنجاح
    const result = await agent.executeTask({
      input: "حلل الثيمات والرسائل",
      options: { enableRAG: true },
      context: {
        originalText: "نص درامي مع ثيمات متعددة",
      },
    });

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });
});
