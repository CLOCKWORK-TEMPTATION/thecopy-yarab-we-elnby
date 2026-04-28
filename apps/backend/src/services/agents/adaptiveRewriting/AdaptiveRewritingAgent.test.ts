import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskType } from "@core/types";

import { AdaptiveRewritingAgent } from "./AdaptiveRewritingAgent";

const { mockExecuteStandardPattern } = vi.hoisted(() => ({
  mockExecuteStandardPattern: vi.fn(),
}));

vi.mock("../shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardPattern,
}));

describe("AdaptiveRewritingAgent", () => {
  let agent: AdaptiveRewritingAgent;

  beforeEach(() => {
    agent = new AdaptiveRewritingAgent();
    mockExecuteStandardPattern.mockReset();
    mockExecuteStandardPattern.mockResolvedValue({
      text: `\`\`\`json
{"draft":"ignored"}
\`\`\`

## التحليل الاستراتيجي
تم تحسين الصياغة بنجاح مع معالجة التكرار وتحسين الوضوح.

## النص المعاد كتابته
النسخة المعدلة أكثر دقة وأكثر سلاسة، وتربط الجمل بشكل أفضل مع الحفاظ على المعنى.

## تقرير التحسينات
تم تطوير الإيقاع، وتحسين الوصف، وإضافة انتقالات أكثر محكماً لتحسين تجربة القراءة.`,
      confidence: 0.68,
      notes: ["مخرجات أولية من النمط القياسي"],
      metadata: {},
    });
  });

  it("should expose the current backend configuration", () => {
    const config = agent.getConfig();

    expect(config.name).toBe("RewriteMaster AI");
    expect(config.taskType).toBe(TaskType.ADAPTIVE_REWRITING);
    expect(config.confidenceFloor).toBe(0.75);
  });

  it("should enrich rewritten output with normalized metadata", async () => {
    const result = await agent.executeTask({
      input: "أعد كتابة النص مع تحسين الإيقاع والوضوح",
      context: {
        originalText: "كان البطل يمشي ببطء ثم توقف فجأة أمام البيت القديم.",
        rewritingGoals: ["تحسين الوضوح", "تعزيز الإيقاع"],
        targetAudience: "قراء الرواية",
        targetTone: "أدبي",
        targetLength: "longer",
        preserveElements: ["البطل", "البيت القديم"],
        improvementFocus: ["clarity", "pacing"],
      },
    });

    const prompt = mockExecuteStandardPattern.mock.calls[0]?.[0] as string;

    expect(prompt).toContain("قراء الرواية");
    expect(prompt).toContain("البيت القديم");
    expect(prompt).toContain("تحسين الوضوح");
    expect(result.text).not.toContain("```json");
    expect(result.text).not.toContain("```");
    expect(Array.isArray(result.notes)).toBe(true);
    expect(
      result.notes.some((note) => note.includes("جودة إعادة الكتابة")),
    ).toBe(true);
    expect(result.metadata?.timestamp).toBeDefined();
    expect(result.metadata?.rewritingMetrics).toBeDefined();
    expect(result.metadata?.stats).toBeDefined();
    expect((result.metadata?.stats as { charCount: number }).charCount).toBe(
      result.text.length,
    );
    expect(
      (result.metadata?.stats as { improvementCount: number }).improvementCount,
    ).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("should return the fallback contract with error metadata", async () => {
    mockExecuteStandardPattern.mockRejectedValueOnce(
      new Error("rewriting failed"),
    );

    const result = await agent.executeTask({
      input: "أعد الكتابة",
      context: {
        originalText: "نص يحتاج إلى إعادة كتابة.",
      },
    });

    expect(result.confidence).toBe(0.3);
    expect(result.metadata?.error).toBe("rewriting failed");
    expect(result.metadata?.timestamp).toBeDefined();
    expect(result.text).toContain("عذراً");
  });
});
