import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskType } from "@core/types";

import { PlatformAdapterAgent } from "./PlatformAdapterAgent";

const { mockExecuteStandardPattern } = vi.hoisted(() => ({
  mockExecuteStandardPattern: vi.fn(),
}));

vi.mock("../shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardPattern,
}));

function firstStandardPatternPrompt(): string {
  const calls = mockExecuteStandardPattern.mock
    .calls as readonly (readonly unknown[])[];
  const prompt = calls[0]?.[0];
  if (typeof prompt !== "string") {
    throw new Error("Standard pattern prompt was not captured");
  }

  return prompt;
}

describe("PlatformAdapterAgent", () => {
  let agent: PlatformAdapterAgent;

  beforeEach(() => {
    agent = new PlatformAdapterAgent();
    mockExecuteStandardPattern.mockReset();
    mockExecuteStandardPattern.mockResolvedValue({
      text: `\`\`\`json
{"draft":"ignored"}
\`\`\`

المنصة المستهدفة: Instagram Reels

ابدأ بلقطة مكثفة ثم قدّم الرسالة الأساسية خلال ثوانٍ قصيرة.
اختم بدعوة تفاعلية تحافظ على الرسالة وتناسب إيقاع المنصة.`,
      confidence: 0.86,
      notes: ["مخرجات أولية من النمط القياسي"],
      metadata: {},
    });
  });

  it("should expose the current backend configuration", () => {
    const config = agent.getConfig();

    expect(config.name).toBe("MediaTransmorph AI");
    expect(config.taskType).toBe(TaskType.PLATFORM_ADAPTER);
    expect(config.confidenceFloor).toBe(0.78);
  });

  it("should clean the adapted text and append quality notes", async () => {
    const result = await agent.executeTask({
      input: "كيّف هذا النص لمنصة مرئية قصيرة",
      context: {
        targetPlatform: "Instagram Reels",
        sourceContent: "محتوى درامي طويل عن خسارة مفاجئة ثم استعادة الأمل.",
        constraints: {
          characterLimit: 220,
          hashtagCount: 3,
        },
        previousStations: {
          analysis: "المحتوى يعتمد على تصاعد عاطفي واضح.",
          targetAudience: "شباب المدن",
        },
      },
    });

    const prompt = firstStandardPatternPrompt();

    expect(prompt).toContain("Instagram Reels");
    expect(prompt).toContain("المحتوى يعتمد على تصاعد عاطفي واضح");
    expect(prompt).toContain("حد الأحرف");
    expect(result.text).not.toContain("```json");
    expect(result.text).not.toContain("```");
    expect(Array.isArray(result.notes)).toBe(true);
    expect(result.notes.some((note) => note.includes("عالي الجودة"))).toBe(
      true,
    );
    expect(result.metadata?.timestamp).toBeDefined();
  });

  it("should return the fallback contract with error metadata", async () => {
    mockExecuteStandardPattern.mockRejectedValueOnce(
      new Error("platform failed"),
    );

    const result = await agent.executeTask({
      input: "كيّف المحتوى",
      context: {
        targetPlatform: "TikTok",
      },
    });

    expect(result.confidence).toBe(0.3);
    expect(result.metadata?.error).toBe("platform failed");
    expect(result.text).toContain("TikTok");
  });
});
