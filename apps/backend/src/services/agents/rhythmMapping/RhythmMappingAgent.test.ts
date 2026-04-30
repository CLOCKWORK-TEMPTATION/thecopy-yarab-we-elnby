import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskType } from "@core/types";

import { RhythmMappingAgent } from "./RhythmMappingAgent";

const { mockExecuteStandardPattern } = vi.hoisted(() => ({
  mockExecuteStandardPattern: vi.fn(),
}));

vi.mock("../shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardPattern,
}));

describe("RhythmMappingAgent", () => {
  let agent: RhythmMappingAgent;

  beforeEach(() => {
    agent = new RhythmMappingAgent();
    mockExecuteStandardPattern.mockReset();
    mockExecuteStandardPattern.mockResolvedValue({
      text: `## الإيقاع العام
الإيقاع والوتيرة يتبدلان بين مقاطع سريعة وأخرى ثابتة.
هناك نبضة سردية واضحة وانتقال متوازن في التدفق.
يُنصح بتعديل موضعين لتحسين النمط والتنوع.

\`\`\`json
{"drop":"me"}
\`\`\``,
      confidence: 0.73,
      notes: ["تقرير أولي"],
      metadata: {},
    });
  });

  it("should expose the current backend configuration", () => {
    const config = agent.getConfig();

    expect(config.name).toBe("RhythmMapper AI");
    expect(config.taskType).toBe(TaskType.RHYTHM_MAPPING);
    expect(config.confidenceFloor).toBe(0.8);
  });

  it("should enrich the mapped rhythm output with rhythm metadata", async () => {
    const result = await agent.executeTask({
      input: "ارسم خريطة الإيقاع",
      context: {
        originalText: "مشهد هادئ ثم تصاعد مفاجئ ثم هبوط.",
        sceneBreakdown: ["بداية هادئة", "ذروة سريعة"],
      },
    });

    expect(result.text).not.toContain("```json");
    expect(Array.isArray(result.notes)).toBe(true);
    expect(result.notes.some((note) => note.includes("تحليل"))).toBe(true);
    expect(result.metadata?.timestamp).toBeDefined();
    expect(result.metadata?.["rhythmAnalysisQuality"]).toBeDefined();
    expect(result.metadata?.["optimizationSuggestions"]).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("should return fallback metadata on failure", async () => {
    mockExecuteStandardPattern.mockRejectedValueOnce(
      new Error("rhythm failed"),
    );

    const result = await agent.executeTask({
      input: "حلل الإيقاع",
    });

    expect(result.metadata?.error).toBe("rhythm failed");
    expect(result.confidence).toBe(0.3);
    expect(result.text).toContain("نظرة عامة على الإيقاع");
  });
});
