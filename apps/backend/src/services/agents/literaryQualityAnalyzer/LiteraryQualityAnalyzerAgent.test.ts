import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskType } from "@core/types";

import {
  LiteraryQualityAnalyzerAgent,
  literaryQualityAnalyzerAgent,
} from "./LiteraryQualityAnalyzerAgent";

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

let agent: LiteraryQualityAnalyzerAgent;

beforeEach(() => {
  agent = new LiteraryQualityAnalyzerAgent();
  mockExecuteStandardPattern.mockReset();
  mockExecuteStandardPattern.mockResolvedValue(
    standardOutput({
      text: "تقييم أدبي شامل يتضمن استعارة وتشبيه وتحليل نقدي موضوعي.",
      confidence: 0.9,
      notes: ["مخرجات نقدية أولية"],
    }),
  );
});

function standardOutput(
  overrides: Partial<StandardAgentOutput> = {},
): StandardAgentOutput {
  return {
    text: "تقييم أدبي يتناول اللغة والأصالة والتماسك والتأثير.",
    confidence: 0.82,
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

describe("LiteraryQualityAnalyzerAgent configuration", () => {
  it("exposes the current literary quality contract", () => {
    const config = agent.getConfig();

    expect(config.name).toBe("AestheticsJudge AI");
    expect(config.taskType).toBe(TaskType.LITERARY_QUALITY_ANALYZER);
    expect(config.confidenceFloor).toBe(0.88);
    expect(config.supportsSelfCritique).toBe(true);
    expect(literaryQualityAnalyzerAgent).toBeInstanceOf(
      LiteraryQualityAnalyzerAgent,
    );
  });
});

describe("LiteraryQualityAnalyzerAgent prompt execution", () => {
  it("passes the full literary context into the standard pattern", async () => {
    const input: StandardAgentInput = {
      input: "قيّم جودة المقطع أدبياً عبر المحاور الخمسة.",
      options: { temperature: 0.15, enableRAG: false },
      context: {
        originalText: "النص الأصلي للتقييم وفيه صورة بيانية واضحة.",
        styleAnalysis: "تحليل سابق يثبت حضور الإيقاع والجملة الطويلة.",
        thematicAnalysis: "تحليل موضوعي يركز على الاغتراب والذاكرة.",
        previousStations: {
          style: "يرصد الأسلوب حضور الاستعارة وتنوع التراكيب.",
          themes: "يربط الموضوعات بسؤال الهوية.",
          empty: "",
        },
      },
    };

    const result = await agent.executeTask(input);
    const [prompt, options, context] = firstPatternCall();

    expect(prompt).toContain("محلل الجودة الأدبية");
    expect(prompt).toContain("النص الأصلي للتقييم");
    expect(prompt).toContain("تحليل الأسلوب السابق");
    expect(prompt).toContain("التحليل الموضوعي");
    expect(prompt).toContain("سياق التحليلات السابقة");
    expect(prompt).toContain("الجمال اللغوي والبلاغي");
    expect(prompt).toContain("درجة تقييم (من 10)");
    expect(options).toMatchObject({ temperature: 0.15, enableRAG: false });
    expect(context).toMatchObject({
      agentName: "AestheticsJudge AI",
      taskType: TaskType.LITERARY_QUALITY_ANALYZER,
      originalText: "النص الأصلي للتقييم وفيه صورة بيانية واضحة.",
    });
    expect(result.text).toContain("تقييم أدبي شامل");
    expect(result.metadata?.timestamp).toEqual(expect.any(String));
  });

  it("builds a five-pillar evaluation prompt when context is missing", async () => {
    await agent.executeTask({ input: "قدّم حكماً أدبياً مختصراً." });

    const [prompt] = firstPatternCall();

    expect(prompt).toContain("الجمال اللغوي والبلاغي");
    expect(prompt).toContain("الأصالة والابتكار الأسلوبي");
    expect(prompt).toContain("التماسك السردي والبنيوي");
    expect(prompt).toContain("التأثير العاطفي والفني");
    expect(prompt).toContain("المقارنة بالمعايير الأدبية");
    expect(prompt).not.toContain("undefined");
  });

  it("truncates previous station entries in the prompt context", async () => {
    const previousAnalysis = "تحليل سابق طويل ".repeat(40);

    await agent.executeTask({
      input: "اربط الحكم النقدي بالتحليلات السابقة.",
      context: {
        previousStations: { station1: previousAnalysis },
      },
    });

    const [prompt] = firstPatternCall();

    expect(prompt).toContain(`${previousAnalysis.substring(0, 300)}...`);
    expect(prompt).not.toContain(previousAnalysis);
  });
});

describe("LiteraryQualityAnalyzerAgent post processing", () => {
  it("cleans artifacts and stores bounded evaluation quality metrics", async () => {
    mockExecuteStandardPattern.mockResolvedValueOnce(
      standardOutput({
        text: `تقييم أدبي:
\`\`\`json
{"score": 9}
\`\`\`
استعارة وتشبيه وكناية وبلاغة وأسلوب وإيقاع.
تقييم نقدي موضوعي مع قوة وضعف ومقارنة ومعيار ودليل.
أصالة وابتكار وتماسك سردي وتأثير عاطفي وفني ومعايير.`,
        confidence: 0.96,
      }),
    );

    const result = await agent.executeTask({
      input: "نظف التقييم واحسب جودته.",
      context: { originalText: "نص أدبي" },
    });
    const quality = metadataRecord(result, "literaryEvaluationQuality");

    expect(result.text).not.toContain("```");
    expect(result.text).not.toContain("score");
    expect(numericField(quality, "linguisticDepth")).toBeGreaterThan(0.7);
    expect(numericField(quality, "criticalRigor")).toBeGreaterThan(0.7);
    expect(numericField(quality, "comprehensiveness")).toBeGreaterThan(0.7);
    expect(numericField(quality, "overallScore")).toBeLessThanOrEqual(1);
    expect(result.metadata?.linguisticDepth).toBe(
      numericField(quality, "linguisticDepth"),
    );
  });

  it("flags shallow analysis with review notes instead of inflating quality", async () => {
    mockExecuteStandardPattern.mockResolvedValueOnce(
      standardOutput({
        text: "انطباع عام قصير بلا مصطلحات نقدية كافية.",
        confidence: 0.62,
      }),
    );

    const result = await agent.executeTask({
      input: "اختبر التحليل السطحي.",
      context: { originalText: "نص قصير" },
    });
    const quality = metadataRecord(result, "literaryEvaluationQuality");

    expect(numericField(quality, "overallScore")).toBeLessThan(0.5);
    expect(result.confidence).toBeLessThan(0.7);
    expect(result.notes).toContain("ثقة متوسطة - يُنصح بمراجعة نقدية إضافية");
    expect(result.notes).toContain("يمكن تعزيز التحليل اللغوي");
  });

  it("preserves source notes and records cliche analysis detection", async () => {
    mockExecuteStandardPattern.mockResolvedValueOnce(
      standardOutput({
        text: "تحليل نقدي يحدد كليشيه متكرر ونمط تقليدي داخل النص.",
        confidence: 0.81,
        notes: ["ملاحظة بشرية محفوظة"],
      }),
    );

    const result = await agent.executeTask({
      input: "افحص الكليشيهات.",
      context: { originalText: "نص" },
    });

    expect(result.notes).toContain("تم تضمين تحليل الكليشيهات");
    expect(result.notes).toContain("ملاحظة بشرية محفوظة");
  });
});

describe("LiteraryQualityAnalyzerAgent failure path", () => {
  it("returns the fallback literary contract when execution fails", async () => {
    mockExecuteStandardPattern.mockRejectedValueOnce(
      new Error("literary provider failed"),
    );

    const result = await agent.executeTask({
      input: "قيّم النص أدبياً.",
      context: { originalText: "نص قصير" },
    });

    expect(result.confidence).toBe(0.3);
    expect(result.text).toContain("التقييم الأدبي الأولي");
    expect(result.text).toContain("الجمال اللغوي والبلاغي");
    expect(result.text).toContain("المعايير الأدبية");
    expect(result.notes).toContain("خطأ في التنفيذ: literary provider failed");
    expect(result.metadata?.error).toBe("literary provider failed");
  });
});
