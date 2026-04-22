import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskType } from "@core/types";
import { CharacterNetworkAgent } from "./CharacterNetworkAgent";

const { mockExecuteStandardPattern } = vi.hoisted(() => ({
  mockExecuteStandardPattern: vi.fn(),
}));

vi.mock("../shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardPattern,
}));

describe("CharacterNetworkAgent", () => {
  let agent: CharacterNetworkAgent;

  beforeEach(() => {
    agent = new CharacterNetworkAgent();
    mockExecuteStandardPattern.mockReset();
    mockExecuteStandardPattern.mockResolvedValue({
      text: `## خريطة الشبكة
الشخصية سلمى شخصية مركزية داخل شبكة العلاقات.
توجد علاقة عائلية قوية ↔ مع يوسف، وعلاقة صداقة متغيرة مع ليلى.
يكشف هذا النمط الهرمية والنفوذ والتأثير داخل مجموعة التحالف.
في المشهد نرى كيف يتغير الرابط عندما يشتد الصراع.`,
      confidence: 0.7,
      notes: ["مخرجات أولية من النمط القياسي"],
      metadata: {},
    });
  });

  it("should expose the current backend configuration", () => {
    const config = agent.getConfig();

    expect(config.name).toBe("SocialGraph AI");
    expect(config.taskType).toBe(TaskType.CHARACTER_NETWORK);
    expect(config.confidenceFloor).toBe(0.82);
  });

  it("should enrich network output with normalized notes and metadata", async () => {
    const result = await agent.executeTask({
      input: "حلل شبكة الشخصيات الرئيسية",
      context: {
        originalText: "سلمى تواجه يوسف ثم تعود للتحالف مع ليلى.",
        focusCharacters: ["سلمى", "يوسف"],
      },
    });

    expect(mockExecuteStandardPattern.mock.calls[0]?.[0]).toContain("سلمى");
    expect(result.text).not.toContain("```json");
    expect(Array.isArray(result.notes)).toBe(true);
    expect(result.notes.some((note) => note.includes("تحليل"))).toBe(true);
    expect(result.metadata?.timestamp).toBeDefined();
    expect(result.metadata?.networkAnalysisQuality).toBeDefined();
    expect(result.metadata?.relationshipsIdentified).toBeGreaterThanOrEqual(1);
  });

  it("should return the fallback contract with error metadata", async () => {
    mockExecuteStandardPattern.mockRejectedValueOnce(new Error("network failed"));

    const result = await agent.executeTask({
      input: "حلل الشبكة",
    });

    expect(result.confidence).toBe(0.3);
    expect(result.metadata?.error).toBe("network failed");
    expect(result.text).toBeTruthy();
  });
});
