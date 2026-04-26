import { describe, it, expect, beforeEach } from "vitest";

import { TaskType } from "@core/types";

import { ProducibilityAnalyzerAgent } from "./ProducibilityAnalyzerAgent";

describe("ProducibilityAnalyzerAgent", () => {
  let agent: ProducibilityAnalyzerAgent;

  beforeEach(() => {
    agent = new ProducibilityAnalyzerAgent();
  });

  it("should have correct configuration", () => {
    const config = agent.getConfig();
    expect(config.name).toBeTruthy();
    expect(config.taskType).toBe(TaskType.PRODUCIBILITY_ANALYZER);
  });

  it("should execute task successfully", async () => {
    // اختبار تنفيذ المهمة بنجاح
    const result = await agent.executeTask({
      input: "حلل قابلية الإنتاج",
      options: { enableRAG: true },
      context: {
        storyElements: "عناصر القصة للتقييم",
      },
    });

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });
});
