import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskType } from "@core/enums";
import { TargetAudienceAnalyzerAgent } from "./TargetAudienceAnalyzerAgent";
import { StandardAgentInput } from "../shared/standardAgentPattern";

const { mockExecuteStandardPattern } = vi.hoisted(() => ({
  mockExecuteStandardPattern: vi.fn(),
}));

vi.mock("../shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardPattern,
}));

describe("TargetAudienceAnalyzerAgent", () => {
  let agent: TargetAudienceAnalyzerAgent;

  beforeEach(() => {
    agent = new TargetAudienceAnalyzerAgent();
    mockExecuteStandardPattern.mockResolvedValue({
      text: `ملخص الجمهور:
\`\`\`json
{ "primary": "Mock" }
\`\`\`
- الجمهور الرئيسي: أسر عربية حضرية
- الجمهور الثانوي: محبو الدراما الاجتماعية
التغطية السوقية تشير إلى منصات البث.
`,
      confidence: 0.74,
      notes: [],
      metadata: {},
    });
  });

  it("should expose proper configuration", () => {
    const config = agent.getConfig();
    expect(config.taskType).toBe(TaskType.TARGET_AUDIENCE_ANALYZER);
    expect(config.confidenceFloor).toBeGreaterThan(0.8);
    expect(config.supportsRAG).toBe(true);
  });

  it("should execute task and enrich audience analysis metadata", async () => {
    const input: StandardAgentInput = {
      input: "حدّد الجمهور المستهدف للنص.",
      context: {
        originalText: "نص درامي عن مدينة مزدحمة...",
        genre: "دراما اجتماعية",
        targetMarkets: ["دول الخليج", "شمال أفريقيا"],
        previousStations: {
          analysis: "النبرة عامة ومباشرة",
        },
      },
      options: { enableRAG: true },
    };

    const result = await agent.executeTask(input);

    expect(result.text).not.toContain("```");
    expect(result.text).not.toMatch(/\{[^}]*:[^}]*\}/);
    expect(result.metadata?.audienceAnalysisQuality).toBeDefined();
    expect(result.metadata?.demographicCoverage).toBeGreaterThanOrEqual(0);
    expect(result.metadata?.psychographicDepth).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("should highlight missing segments in notes when coverage is low", async () => {
    mockExecuteStandardPattern.mockResolvedValueOnce({
      text: "تقرير مقتضب بدون تفاصيل كافية.",
      confidence: 0.6,
      notes: [],
      metadata: {},
    });

    const result = await agent.executeTask({
      input: "نفس المهمة",
      context: {},
    });

    expect(
      result.notes?.some((note) => note.includes("يمكن تعزيز التحليل الديموغرافي")) ||
        result.notes?.some((note) => note.includes("يمكن تعميق التحليل النفسي"))
    ).toBe(true);
  });
});
