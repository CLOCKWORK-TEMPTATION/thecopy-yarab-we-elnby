import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskType } from "@core/types";

import { AudienceResonanceAgent } from "./AudienceResonanceAgent";

const { mockExecuteStandardPattern } = vi.hoisted(() => ({
  mockExecuteStandardPattern: vi.fn(),
}));

vi.mock("../shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardPattern,
}));

describe("AudienceResonanceAgent", () => {
  let agent: AudienceResonanceAgent;

  beforeEach(() => {
    agent = new AudienceResonanceAgent();
    mockExecuteStandardPattern.mockReset();
    mockExecuteStandardPattern.mockResolvedValue({
      text: `\`\`\`json
{"draft":"ignored"}
\`\`\`

تقييم الصدى العاطفي
هذا المحتوى يحمل بعداً عاطفياً ونفسياً واضحاً، ويعكس استجابة متوقعة لدى الشريحة الديموغرافية المستهدفة.

التحليل النفسي الاجتماعي
يرتبط المحتوى بدافع التعاطف ويكشف آلية تفاعل نفسي وسلوكي مع الشخصيات.

توقعات الاستجابة
من المرجح أن تظهر استجابة قوية لدى الجمهور الحضري بسبب وضوح الصراع وقربه من التجربة اليومية.

التوصيات
1. يُنصح بتعزيز النهاية العاطفية.
2. يمكن إضافة لحظة أكثر تأثيراً لرفع الاستجابة.

المخاطر والفرص
توجد فرصة لزيادة التفاعل، مع مخاطر محدودة إذا طال الإيقاع.`,
      confidence: 0.72,
      notes: ["مخرجات أولية من النمط القياسي"],
      metadata: {},
    });
  });

  it("should expose the current backend configuration", () => {
    const config = agent.getConfig();

    expect(config.name).toBe("EmpathyMatrix AI");
    expect(config.taskType).toBe(TaskType.AUDIENCE_RESONANCE);
    expect(config.confidenceFloor).toBe(0.75);
  });

  it("should enrich analysis output with audience metrics", async () => {
    const result = await agent.executeTask({
      input: "حلل صدى هذا المحتوى مع الجمهور المستهدف",
      context: {
        originalText: "عمل درامي اجتماعي يتناول ضغوط الأسرة والتحول النفسي.",
        contentType: "مسلسل درامي",
        platform: "منصة رقمية",
        targetAudience: {
          demographics: {
            ageRange: "25-40",
            education: "جامعي",
            culturalBackground: "عربي",
          },
          psychographics: {
            values: ["الأسرة", "العدالة"],
            emotionalTriggers: ["التعاطف", "الأمل"],
          },
        },
        previousResponses: [
          {
            audienceSegment: "الشباب الحضري",
            response: "تفاعل عاطفي مرتفع",
            resonanceScore: 8.4,
          },
        ],
      },
    });

    const prompt = mockExecuteStandardPattern.mock.calls[0]?.[0] as string;

    expect(prompt).toContain("معلومات الجمهور المستهدف");
    expect(prompt).toContain("الشباب الحضري");
    expect(prompt).toContain("عمل درامي اجتماعي");
    expect(result.text).not.toContain("```json");
    expect(result.text).not.toContain("```");
    expect(Array.isArray(result.notes)).toBe(true);
    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.metadata?.timestamp).toBeDefined();
    expect(result.metadata?.["comprehensiveness"]).toBeGreaterThan(0);
    expect(result.metadata?.["insightDepth"]).toBeGreaterThan(0);
    expect(result.metadata?.["actionability"]).toBeGreaterThan(0);
    expect(result.metadata?.["analysisType"]).toBe("تحليل شرائح");
    expect(result.metadata?.["wordCount"]).toBeGreaterThan(20);
  });

  it("should return the fallback contract with error metadata", async () => {
    mockExecuteStandardPattern.mockRejectedValueOnce(
      new Error("resonance failed"),
    );

    const result = await agent.executeTask({
      input: "حلل الصدى",
      context: {
        targetAudience: {
          demographics: {
            ageRange: "20-35",
          },
        },
      },
    });

    expect(result.confidence).toBe(0.3);
    expect(result.metadata?.error).toBe("resonance failed");
    expect(result.metadata?.timestamp).toBeDefined();
    expect(result.text).toContain("تحليل الصدى الجماهيري");
  });
});
