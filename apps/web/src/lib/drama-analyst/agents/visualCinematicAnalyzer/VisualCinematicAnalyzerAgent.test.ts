import { describe, it, expect, beforeEach } from "vitest";
import { VisualCinematicAnalyzerAgent } from "./VisualCinematicAnalyzerAgent";
import { TaskType } from "@core/types";

describe("VisualCinematicAnalyzerAgent", () => {
  let agent: VisualCinematicAnalyzerAgent;

  beforeEach(() => {
    agent = new VisualCinematicAnalyzerAgent();
  });

  it("should have correct configuration", () => {
    const config = agent.getConfig();
    expect(config.name).toBeTruthy();
    expect(config.taskType).toBe(TaskType.VISUAL_CINEMATIC_ANALYZER);
  });

  it("should execute task successfully", async () => {
    // اختبار تنفيذ المهمة بنجاح
    const result = await agent.executeTask({
      input: "حلل العناصر البصرية والسينمائية",
      options: { enableRAG: true },
      context: {
        originalText: "نص درامي يحتاج تحليل بصري",
      },
    });

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });
});
