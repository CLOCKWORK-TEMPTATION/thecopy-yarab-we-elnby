import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskType } from "@core/types";

import { PlotPredictorAgent } from "./PlotPredictorAgent";

const { mockExecuteStandardPattern } = vi.hoisted(() => ({
  mockExecuteStandardPattern: vi.fn(),
}));

vi.mock("../shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardPattern,
}));

describe("PlotPredictorAgent", () => {
  let agent: PlotPredictorAgent;

  beforeEach(() => {
    agent = new PlotPredictorAgent();
    mockExecuteStandardPattern.mockReset();
    mockExecuteStandardPattern.mockResolvedValue({
      text: `## المسار الأول
احتمالية عالية مع تبرير واضح.

\`\`\`json
{"noise":true}
\`\`\`

## المسار الثاني
إبداع متوسط مع أثر مباشر على الصراع الرئيسي.`,
      confidence: 0.72,
      notes: ["تحليل أولي"],
      metadata: {},
    });
  });

  it("should expose the current backend configuration", () => {
    const config = agent.getConfig();

    expect(config.name).toBe("PlotPredictorAgent");
    expect(config.taskType).toBe(TaskType.PLOT_PREDICTOR);
    expect(config.confidenceFloor).toBe(0.78);
  });

  it("should clean prompt output and preserve the current note contract", async () => {
    const result = await agent.executeTask({
      input: "تنبأ بمسارات الحبكة التالية",
      context: {
        previousStations: {
          analysis: "تحليل أولي",
          characterAnalysis: "شخصيات متصارعة",
        },
      },
    });

    expect(mockExecuteStandardPattern.mock.calls[0]?.[0]).toContain("تحليل أولي");
    expect(result.text).not.toContain("```json");
    expect(Array.isArray(result.notes)).toBe(true);
    expect(
      result.notes.some((note) => note.includes("متوسطة الثقة")) ||
        result.notes.some((note) => note.includes("استكشافية"))
    ).toBe(true);
    expect(result.metadata?.timestamp).toBeDefined();
  });

  it("should emit the low-confidence exploratory note when needed", async () => {
    mockExecuteStandardPattern.mockResolvedValueOnce({
      text: "مسار واحد أولي يحتاج تدعيمًا أكبر.",
      confidence: 0.4,
      notes: [],
      metadata: {},
    });

    const result = await agent.executeTask({
      input: "تنبأ بالحبكة",
    });

    expect(result.notes).toContain("تنبؤات استكشافية تحتاج تحقق إضافي");
  });

  it("should surface fallback metadata on failure", async () => {
    mockExecuteStandardPattern.mockRejectedValueOnce(new Error("prediction failed"));

    const result = await agent.executeTask({
      input: "تنبأ بالحبكة",
    });

    expect(result.metadata?.error).toBe("prediction failed");
    expect(result.confidence).toBe(0.3);
  });
});
