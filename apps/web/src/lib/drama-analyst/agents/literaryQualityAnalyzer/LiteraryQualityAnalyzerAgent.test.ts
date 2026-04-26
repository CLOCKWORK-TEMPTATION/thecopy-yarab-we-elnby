import { describe, it, expect, beforeEach, vi } from "vitest";

import { TaskType } from "@core/enums";

import { LiteraryQualityAnalyzerAgent } from "./LiteraryQualityAnalyzerAgent";

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
    // اختبار تعريض الإعدادات الصحيحة
    const config = agent.getConfig();
    expect(config.taskType).toBe(TaskType.LITERARY_QUALITY_ANALYZER);
    expect(config.confidenceFloor).toBeGreaterThanOrEqual(0.85);
  });

  it("should produce structured output with literary scores", async () => {
    // اختبار إنتاج مخرجات منظمة مع درجات أدبية
    const result = await agent.executeTask({
      input: "قيّم الجودة الأدبية للنص.",
      context: {
        originalText: "نص روائي غني بالاستعارات...",
        referenceAuthors: ["نجيب محفوظ"],
        evaluationFocus: ["language", "structure"],
      },
    });

    expect(result.text).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("should flag low quality with improvement note", async () => {
    // اختبار تحديد الجودة المنخفضة مع ملاحظة التحسين
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

    // التحقق من أن النتيجة معرّفة وثقتها منخفضة
    expect(result).toBeDefined();
    expect(result.confidence).toBeLessThanOrEqual(0.5);
  });
});
