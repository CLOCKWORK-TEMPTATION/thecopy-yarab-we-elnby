import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskType } from "@core/types";

import {
  AdaptiveRewritingAgent,
  adaptiveRewritingAgent,
} from "./AdaptiveRewritingAgent";

import type {
  StandardAgentInput,
  StandardAgentOptions,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

type ExecuteStandardAgentPattern = (
  prompt: string,
  options: StandardAgentOptions,
  context?: Record<string, unknown>,
) => Promise<StandardAgentOutput>;

const { mockExecuteStandardPattern } = vi.hoisted(() => ({
  mockExecuteStandardPattern: vi.fn<ExecuteStandardAgentPattern>(),
}));

vi.mock("../shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardPattern,
}));

let agent: AdaptiveRewritingAgent;

beforeEach(() => {
  agent = new AdaptiveRewritingAgent();
  mockExecuteStandardPattern.mockReset();
  mockExecuteStandardPattern.mockResolvedValue(
    standardOutput({
      text: "النص المعاد كتابته أكثر وضوحاً وسلاسة.",
      confidence: 0.82,
      notes: ["مخرجات أولية"],
    }),
  );
});

function standardOutput(
  overrides: Partial<StandardAgentOutput> = {},
): StandardAgentOutput {
  return {
    text: "نص معاد كتابته مع تحسين الوضوح والسلاسة.",
    confidence: 0.8,
    notes: [],
    metadata: {},
    ...overrides,
  };
}

function firstPatternCall(): Parameters<ExecuteStandardAgentPattern> {
  const call = mockExecuteStandardPattern.mock.calls[0];
  if (!call) {
    throw new Error("Expected executeStandardAgentPattern to be called.");
  }
  return call;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function metadataRecord(
  output: StandardAgentOutput,
  key: string,
): Record<string, unknown> {
  const value = output.metadata?.[key];
  if (!isRecord(value)) {
    throw new Error(`Expected metadata.${key} to be a record.`);
  }
  return value;
}

function numericField(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number") {
    throw new Error(`Expected ${key} to be a number.`);
  }
  return value;
}

function originalTextFromPrompt(prompt: string): string {
  const match = /<original_text>\n([\s\S]*?)\n<\/original_text>/.exec(prompt);
  return match?.[1] ?? "";
}

describe("AdaptiveRewritingAgent configuration", () => {
  it("exposes the current adaptive rewriting contract", () => {
    const config = agent.getConfig();

    expect(config.name).toBe("RewriteMaster AI");
    expect(config.taskType).toBe(TaskType.ADAPTIVE_REWRITING);
    expect(config.confidenceFloor).toBe(0.75);
    expect(config.supportsRAG).toBe(true);
    expect(adaptiveRewritingAgent).toBeInstanceOf(AdaptiveRewritingAgent);
  });
});

describe("AdaptiveRewritingAgent prompt execution", () => {
  it("passes a complete adaptive rewriting prompt and normalized context", async () => {
    const input: StandardAgentInput = {
      input: "أعد صياغة النص لجمهور متخصص مع الحفاظ على الرسالة.",
      options: { temperature: 0.2, enableRAG: false },
      context: {
        originalText: "النص الأصلي الذي يحتاج إلى إعادة بناء دقيقة.",
        rewritingGoals: ["زيادة الوضوح", "تقليل التكرار"],
        targetAudience: "محررون متخصصون",
        targetTone: "رسمي",
        targetLength: "shorter",
        improvementFocus: ["clarity", "pacing"],
        preserveElements: ["المعنى الأساسي"],
        styleGuide: "استخدم جملاً قصيرة.",
        constraints: ["لا تضف وقائع جديدة"],
      },
    };

    const result = await agent.executeTask(input);
    const [prompt, options, context] = firstPatternCall();

    expect(prompt).toContain("إعادة كتابة تكيفية");
    expect(prompt).toContain("محررون متخصصون");
    expect(prompt).toContain("ضبط الإيقاع والسرعة");
    expect(prompt).toContain("لا تضف وقائع جديدة");
    expect(prompt).toContain("<style_guide>");
    expect(options).toMatchObject({ temperature: 0.2, enableRAG: false });
    expect(context).toMatchObject({
      agentName: "RewriteMaster AI",
      taskType: TaskType.ADAPTIVE_REWRITING,
      originalText: "النص الأصلي الذي يحتاج إلى إعادة بناء دقيقة.",
    });
    expect(result.text).toBe("النص المعاد كتابته أكثر وضوحاً وسلاسة.");
    expect(result.metadata?.timestamp).toEqual(expect.any(String));
  });

  it("uses default rewriting parameters when context is absent", async () => {
    await agent.executeTask({ input: "اختبار إعادة كتابة مختصر." });

    const [prompt] = firstPatternCall();

    expect(prompt).toContain("جمهور عام");
    expect(prompt).toContain("محايدة/احترافية");
    expect(prompt).toContain("الوضوح والمباشرة");
    expect(prompt).not.toContain("<goals>");
    expect(prompt).not.toContain("<preserve>");
  });

  it("limits the original text section without dropping the user request", async () => {
    const originalText = "س".repeat(4_105);

    await agent.executeTask({
      input: "حوّل النص الطويل إلى نسخة أكثر تركيزاً.",
      context: { originalText },
    });

    const [prompt] = firstPatternCall();

    expect(originalTextFromPrompt(prompt)).toHaveLength(4_000);
    expect(prompt).toContain("حوّل النص الطويل إلى نسخة أكثر تركيزاً.");
  });
});

describe("AdaptiveRewritingAgent post processing", () => {
  it("removes generation artifacts and records quality metrics", async () => {
    mockExecuteStandardPattern.mockResolvedValueOnce(
      standardOutput({
        text: `النص المعاد كتابته واضح ومحكم.
\`\`\`json
{"artifact": "remove"}
\`\`\`
تم تحسين الصياغة وتقوية الإيقاع لذلك أصبح النص أكثر دقة.`,
        confidence: 0.9,
      }),
    );

    const result = await agent.executeTask({
      input: "نظف المخرجات وقيم الجودة.",
      context: { originalText: "نص أصلي" },
    });
    const metrics = metadataRecord(result, "rewritingMetrics");
    const stats = metadataRecord(result, "stats");

    expect(result.text).not.toContain("```");
    expect(result.text).not.toContain("artifact");
    expect(numericField(metrics, "overallQuality")).toBeGreaterThan(0);
    expect(numericField(metrics, "goalAchievement")).toBeLessThanOrEqual(1);
    expect(numericField(stats, "charCount")).toBe(result.text.length);
    expect(numericField(stats, "improvementCount")).toBeGreaterThanOrEqual(2);
  });

  it("keeps confidence bounded after combining model confidence and quality", async () => {
    mockExecuteStandardPattern.mockResolvedValueOnce(
      standardOutput({
        text: "نص قصير بلا مؤشرات تحسين كثيرة.",
        confidence: 1.7,
      }),
    );

    const result = await agent.executeTask({
      input: "اختبر حدود الثقة.",
      context: { originalText: "نص" },
    });

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.notes.length).toBeGreaterThan(0);
  });
});

describe("AdaptiveRewritingAgent failure path", () => {
  it("returns the fallback contract when the standard pattern fails", async () => {
    mockExecuteStandardPattern.mockRejectedValueOnce(
      new Error("rewriting provider failed"),
    );

    const result = await agent.executeTask({
      input: "أعد صياغة النص.",
      context: { originalText: "نص قصير" },
    });

    expect(result.confidence).toBe(0.3);
    expect(result.text).toContain("واجه الوكيل صعوبة");
    expect(result.notes).toContain("خطأ في التنفيذ: rewriting provider failed");
    expect(result.metadata?.error).toBe("rewriting provider failed");
    expect(result.metadata?.ragUsed).toBe(false);
  });
});
