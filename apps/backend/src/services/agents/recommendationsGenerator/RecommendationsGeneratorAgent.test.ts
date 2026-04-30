import { describe, it, expect, beforeEach, vi } from "vitest";

import { TaskType } from "@core/enums";

import { StandardAgentInput } from "../shared/standardAgentPattern";

import { RecommendationsGeneratorAgent } from "./RecommendationsGeneratorAgent";

const { mockExecuteStandardPattern } = vi.hoisted(() => ({
  mockExecuteStandardPattern: vi.fn(),
}));

vi.mock("../shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardPattern,
}));

describe("RecommendationsGeneratorAgent", () => {
  let agent: RecommendationsGeneratorAgent;

  beforeEach(() => {
    agent = new RecommendationsGeneratorAgent();
    mockExecuteStandardPattern.mockResolvedValue({
      text: `خطة التحسين:
- ينبغي إعادة ترتيب الذروة.
- يمكن رفع الإيقاع في الفصل الثاني.

بديل إبداعي:
- اقتراح مسار بديل للبطل.
`,
      confidence: 0.76,
      notes: [],
      metadata: {},
    });
  });

  it("should expose correct configuration", () => {
    const config = agent.getConfig();
    expect(config.taskType).toBe(TaskType.RECOMMENDATIONS_GENERATOR);
    expect(config.supportsRAG).toBe(true);
  });

  it("should enrich metadata and preserve actionable recommendation text", async () => {
    const input: StandardAgentInput = {
      input: "قدم توصيات للتحسين.",
      context: {
        synopsis: "ملخص للنص.",
        priorities: ["ضبط الإيقاع", "توسيع الشخصيات"],
        analysisBundles: [
          { source: "analysis", findings: "الحبكة قوية لكن النهاية متسرعة." },
        ],
      },
    };

    const result = await agent.executeTask(input);

    expect(result.text).toContain("خطة التحسين");
    expect(result.text).toContain("بديل إبداعي");
    expect(result.metadata?.["recommendationsQuality"]).toBeDefined();
    expect(result.metadata?.["recommendationsCount"]).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("should warn when coverage is weak", async () => {
    mockExecuteStandardPattern.mockResolvedValueOnce({
      text: "ملاحظة عامة فقط.",
      confidence: 0.4,
      notes: [],
      metadata: {},
    });

    const result = await agent.executeTask({
      input: "تحسين سريع",
      context: {},
    });

    expect(
      result.notes?.some((note) => note.includes("يمكن تعزيز الجانب العملي")) ||
        result.notes?.some((note) =>
          note.includes("يمكن إضافة أمثلة أكثر تحديداً"),
        ),
    ).toBe(true);
  });
});
