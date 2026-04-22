import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskType } from "@core/enums";
import { LiteraryQualityAnalyzerAgent } from "./LiteraryQualityAnalyzerAgent";
import { StandardAgentInput } from "../shared/standardAgentPattern";

const { mockExecuteStandardPattern } = vi.hoisted(() => ({
  mockExecuteStandardPattern: vi.fn(),
}));

vi.mock("../shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardPattern,
}));

describe("LiteraryQualityAnalyzerAgent", () => {
  let agent: LiteraryQualityAnalyzerAgent;

  beforeEach(() => {
    agent = new LiteraryQualityAnalyzerAgent();
    mockExecuteStandardPattern.mockResolvedValue({
      text: `تحليل بلاغي:
- استخدام استعارات معاصرة
- تشبيه بصري واضح

التماسك:
- البنية ثلاثية الأفعال

التأثير العاطفي يصل الذروة.
`,
      confidence: 0.78,
      notes: [],
      metadata: {},
    });
  });

  it("should expose correct configuration", () => {
    const config = agent.getConfig();
    expect(config.taskType).toBe(TaskType.LITERARY_QUALITY_ANALYZER);
    expect(config.confidenceFloor).toBeGreaterThanOrEqual(0.85);
  });

  it("should produce structured output with literary evaluation metadata", async () => {
    const result = await agent.executeTask({
      input: "قيّم الجودة الأدبية للنص.",
      context: {
        originalText: "نص روائي غني بالاستعارات...",
        referenceAuthors: ["نجيب محفوظ"],
        evaluationFocus: ["language", "structure"],
      },
    });

    expect(result.text).not.toContain("```");
    expect(result.metadata?.literaryEvaluationQuality).toBeDefined();
    const metrics = result.metadata?.literaryEvaluationQuality as Record<string, number>;
    expect(metrics.linguisticDepth).toBeGreaterThan(0);
    expect(result.metadata?.criticalRigor).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("should flag low quality with improvement note", async () => {
    mockExecuteStandardPattern.mockResolvedValueOnce({
      text: "تقرير موجز بدون مفردات تقييمية.",
      confidence: 0.3,
      notes: [],
      metadata: {},
    });

    const result = await agent.executeTask({
      input: "تحليل سريع",
      context: {},
    });

    expect(
      result.notes?.some((note) => note.includes("ثقة متوسطة")) ||
        result.notes?.some((note) => note.includes("يمكن تعزيز التحليل"))
    ).toBe(true);
  });
});
