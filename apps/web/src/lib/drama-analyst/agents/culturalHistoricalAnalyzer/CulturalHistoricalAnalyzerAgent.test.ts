import { describe, it, expect, beforeEach } from "vitest";
import { CulturalHistoricalAnalyzerAgent } from "./CulturalHistoricalAnalyzerAgent";
import { TaskType } from "@core/types";

describe("CulturalHistoricalAnalyzerAgent", () => {
  let agent: CulturalHistoricalAnalyzerAgent;

  beforeEach(() => {
    agent = new CulturalHistoricalAnalyzerAgent();
  });

  it("should have correct configuration", () => {
    const config = agent.getConfig();
    expect(config.name).toBeTruthy();
    expect(config.taskType).toBe(TaskType.CULTURAL_HISTORICAL_ANALYZER);
  });

  it("should execute task successfully", async () => {
    // اختبار تنفيذ المهمة بنجاح
    const result = await agent.executeTask({
      input: "حلل السياق الثقافي والتاريخي",
      options: { enableRAG: true },
      context: {
        historicalContext: "السياق التاريخي للنص",
      },
    });

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });
});
