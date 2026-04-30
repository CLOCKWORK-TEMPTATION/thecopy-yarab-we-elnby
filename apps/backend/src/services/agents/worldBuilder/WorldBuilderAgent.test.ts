import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskType } from "@core/types";

import { WorldBuilderAgent } from "./WorldBuilderAgent";

const { mockExecuteStandardPattern } = vi.hoisted(() => ({
  mockExecuteStandardPattern: vi.fn(),
}));

vi.mock("../shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardPattern,
}));

describe("WorldBuilderAgent", () => {
  let agent: WorldBuilderAgent;

  beforeEach(() => {
    agent = new WorldBuilderAgent();
    mockExecuteStandardPattern.mockReset();
    mockExecuteStandardPattern.mockResolvedValue({
      text: `# عالم الرماد

## نظرة عامة
وصف تفصيلي لعالم فريد ومميز.

## القوانين الأساسية
قانون سحري ونظام سياسي وقاعدة منطق واتساق.

## التاريخ والزمن
تاريخ طويل وثقافة متغيرة ومراحل تطور.

## الثقافات والحضارات
تفصيل للمجتمعات والطبقات والتقاليد.

## الجغرافيا والبيئة
جغرافيا واسعة ومواقع رئيسية وموارد خاصة.

## الاتساق والملاحظات
مبدأ واضح ومنطق داخلي متماسك.

\`\`\`json
{"drop":"me"}
\`\`\``,
      confidence: 0.76,
      notes: ["قاعدة أولية"],
      metadata: {},
    });
  });

  it("should expose the current backend configuration", () => {
    const config = agent.getConfig();

    expect(config.name).toBe("WorldBuilderAgent");
    expect(config.taskType).toBe(TaskType.WORLD_BUILDER);
    expect(config.confidenceFloor).toBe(0.85);
  });

  it("should enrich world output with quality metadata", async () => {
    const result = await agent.executeTask({
      input: "ابنِ عالماً درامياً متكاملاً",
      context: {
        previousStations: {
          thematicAnalysis: "الهوية والصراع",
          culturalContext: "مرجعية شرق أوسطية",
        },
      },
    });

    expect(mockExecuteStandardPattern.mock.calls[0]?.[0]).toContain(
      "الهوية والصراع",
    );
    expect(result.text).not.toContain("```json");
    expect(Array.isArray(result.notes)).toBe(true);
    expect(
      result.notes.some((note) => note.includes("عالم متكامل")) ||
        result.notes.some((note) => note.includes("عالم جيد")) ||
        result.notes.some((note) => note.includes("عالم أولي")),
    ).toBe(true);
    expect(result.metadata?.timestamp).toBeDefined();
    expect(result.metadata?.worldQuality).toBeDefined();
    expect(result.metadata?.["sectionsCount"]).toBeGreaterThanOrEqual(5);
    expect(result.metadata?.["worldLength"]).toBeGreaterThan(100);
  });

  it("should return fallback metadata on failure", async () => {
    mockExecuteStandardPattern.mockRejectedValueOnce(new Error("world failed"));

    const result = await agent.executeTask({
      input: "ابنِ العالم",
    });

    expect(result.metadata?.error).toBe("world failed");
    expect(result.confidence).toBe(0.3);
    expect(result.text).toContain("عالم درامي");
  });
});
