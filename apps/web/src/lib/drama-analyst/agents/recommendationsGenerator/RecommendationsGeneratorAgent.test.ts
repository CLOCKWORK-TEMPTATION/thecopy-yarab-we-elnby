import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskType } from "@core/enums";
import { RecommendationsGeneratorAgent } from "./RecommendationsGeneratorAgent";
import { StandardAgentInput } from "../shared/standardAgentPattern";

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
    // اختبار تعريض الإعدادات الصحيحة
    const config = agent.getConfig();
    expect(config.taskType).toBe(TaskType.RECOMMENDATIONS_GENERATOR);
    expect(config.supportsRAG).toBe(true);
  });

  it("should enforce required sections and metadata", async () => {
    // اختبار فرض الأقسام المطلوبة والبيانات الوصفية
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

    expect(result.text).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("should warn when coverage is weak", async () => {
    // اختبار التحذير عند ضعف التغطية
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

    expect(result).toBeDefined();
    expect(result.confidence).toBeLessThanOrEqual(0.5);
  });
});
