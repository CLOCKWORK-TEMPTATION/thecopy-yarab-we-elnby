import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskType } from "@core/types";
import { TensionOptimizerAgent } from "./TensionOptimizerAgent";

const { mockExecuteStandardPattern } = vi.hoisted(() => ({
  mockExecuteStandardPattern: vi.fn(),
}));

vi.mock("../shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardPattern,
}));

describe("TensionOptimizerAgent", () => {
  let agent: TensionOptimizerAgent;

  beforeEach(() => {
    agent = new TensionOptimizerAgent();
    mockExecuteStandardPattern.mockReset();
    mockExecuteStandardPattern.mockResolvedValue({
      text: `## تحليل التوتر
التوتر يتصاعد نحو ذروة واضحة ثم يهبط تدريجيًا.
تقنيات التشويق والغموض وتأخير الكشف مستخدمة بفاعلية.
يُنصح بإضافة توصية عملية قبل القمة للحفاظ على الترقب.

\`\`\`json
{"drop":"me"}
\`\`\``,
      confidence: 0.74,
      notes: ["تحليل أولي من النمط القياسي"],
      metadata: {},
    });
  });

  it("should expose the current backend configuration", () => {
    const config = agent.getConfig();

    expect(config.name).toBe("TensionMaster AI");
    expect(config.taskType).toBe(TaskType.TENSION_OPTIMIZER);
    expect(config.confidenceFloor).toBe(0.81);
  });

  it("should enrich the optimized output with tension metadata", async () => {
    const result = await agent.executeTask({
      input: "حلل التوتر الدرامي",
      context: {
        originalText: "يتصاعد الخوف حتى الذروة ثم يهدأ.",
        identifyPeaks: true,
        provideRecommendations: true,
      },
    });

    expect(result.text).not.toContain("```json");
    expect(Array.isArray(result.notes)).toBe(true);
    expect(result.notes.some((note) => note.includes("تحليل"))).toBe(true);
    expect(result.metadata?.timestamp).toBeDefined();
    expect(result.metadata?.tensionAnalysisQuality).toBeDefined();
    expect(result.metadata?.peaksIdentified).toBeGreaterThanOrEqual(1);
  });

  it("should return fallback metadata on failure", async () => {
    mockExecuteStandardPattern.mockRejectedValueOnce(new Error("tension failed"));

    const result = await agent.executeTask({
      input: "حلل التوتر",
    });

    expect(result.metadata?.error).toBe("tension failed");
    expect(result.confidence).toBe(0.3);
    expect(result.text).toContain("تقييم التوتر الحالي");
  });
});
