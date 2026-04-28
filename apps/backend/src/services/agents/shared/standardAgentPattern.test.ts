import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockAnalyzeText,
  mockPerformRAG,
  mockPerformSelfCritique,
  mockPerformConstitutionalCheck,
  mockMeasureUncertainty,
  mockDetectHallucinations,
} = vi.hoisted(() => ({
  mockAnalyzeText: vi.fn(),
  mockPerformRAG: vi.fn(),
  mockPerformSelfCritique: vi.fn(),
  mockPerformConstitutionalCheck: vi.fn(),
  mockMeasureUncertainty: vi.fn(),
  mockDetectHallucinations: vi.fn(),
}));

vi.mock("@/services/gemini.service", () => ({
  geminiService: {
    analyzeText: mockAnalyzeText,
  },
}));

vi.mock("@/services/rag/enhancedRAG.service", () => ({
  enhancedRAGService: {
    performRAG: mockPerformRAG,
  },
}));

vi.mock("./standardAgentChecks", async () => {
  const actual = await vi.importActual<typeof import("./standardAgentChecks")>(
    "./standardAgentChecks",
  );
  return {
    ...actual,
    performSelfCritique: mockPerformSelfCritique,
    performConstitutionalCheck: mockPerformConstitutionalCheck,
    measureUncertainty: mockMeasureUncertainty,
    detectHallucinations: mockDetectHallucinations,
  };
});

import {
  executeStandardAgentPattern,
  formatAgentOutput,
  type StandardAgentOutput,
} from "./standardAgentPattern";

beforeEach(() => {
  vi.clearAllMocks();

  mockAnalyzeText.mockResolvedValue("نص التحليل المُنتَج");
  mockPerformRAG.mockResolvedValue({
    chunks: [],
    metrics: {
      precision: 0,
      recall: 0,
      avgRelevanceScore: 0,
      processingTimeMs: 0,
    },
  });
  mockPerformSelfCritique.mockResolvedValue({
    finalText: "نص التحليل المُنتَج",
    iterations: 0,
    improvementScore: 1,
    improved: false,
  });
  mockPerformConstitutionalCheck.mockResolvedValue({
    compliant: true,
    violations: [],
    correctedText: "نص التحليل المُنتَج",
  });
  mockMeasureUncertainty.mockResolvedValue({
    score: 0.2,
    confidence: 0.88,
    uncertainAspects: [],
  });
  mockDetectHallucinations.mockResolvedValue({
    detected: false,
    correctedText: "نص التحليل المُنتَج",
    claims: [],
  });
});

it("ينفذ النمط القياسي بنجاح عند تعطيل المراحل الاختيارية", async () => {
  const result = await executeStandardAgentPattern(
    "قم بتحليل النص التالي",
    {
      enableRAG: false,
      enableSelfCritique: false,
      enableConstitutional: false,
      enableUncertainty: false,
      enableHallucination: false,
      enableDebate: false,
    },
    {},
  );

  expect(mockAnalyzeText).toHaveBeenCalledWith(
    "قم بتحليل النص التالي",
    "general",
  );
  expect(result.text).toBe("نص التحليل المُنتَج");
  expect(result.confidence).toBeGreaterThan(0);
  expect(result.notes).toEqual([]);
});

it("يحقن سياق RAG في الموجه عند توفر نص أصلي طويل", async () => {
  mockPerformRAG.mockResolvedValueOnce({
    chunks: [
      { text: "سياق مسترجع 1", relevanceScore: 0.92 },
      { text: "سياق مسترجع 2", relevanceScore: 0.88 },
    ],
    metrics: {
      precision: 0.9,
      recall: 0.85,
      avgRelevanceScore: 0.89,
      processingTimeMs: 25,
    },
  });

  const result = await executeStandardAgentPattern(
    "حلل النص",
    { enableRAG: true, enableSemanticRAG: true },
    { originalText: "سياق طويل جداً ".repeat(20) },
  );

  expect(mockPerformRAG).toHaveBeenCalled();
  expect(mockAnalyzeText).toHaveBeenCalledWith(
    expect.stringContaining("سياق مسترجع 1"),
    "general",
  );
  expect(result.metadata?.ragUsed).toBe(true);
  expect(result.notes.some((note) => note.includes("RAG"))).toBe(true);
});

it("يطبق النقد الذاتي ويحدث الثقة", async () => {
  mockPerformSelfCritique.mockResolvedValueOnce({
    finalText: "تحليل محسّن",
    iterations: 2,
    improvementScore: 0.95,
    improved: true,
  });

  const result = await executeStandardAgentPattern(
    "حلل النص",
    { enableSelfCritique: true, enableRAG: false },
    {},
  );

  expect(result.text).toBe("تحليل محسّن");
  expect(result.metadata?.critiqueIterations).toBe(2);
  expect(result.notes.some((note) => note.includes("نقد ذاتي"))).toBe(true);
});

it("يسجل الانتهاكات الدستورية ويصحح النص", async () => {
  mockPerformConstitutionalCheck.mockResolvedValueOnce({
    compliant: false,
    violations: ["مبالغة"],
    correctedText: "تحليل معتدل",
  });

  const result = await executeStandardAgentPattern(
    "حلل النص",
    { enableConstitutional: true, enableRAG: false },
    {},
  );

  expect(result.text).toBe("تحليل معتدل");
  expect(result.metadata?.constitutionalViolations).toBe(1);
  expect(result.notes.some((note) => note.includes("تصحيح دستوري"))).toBe(true);
});

it("يقيس عدم اليقين ويقيد الثقة النهائية", async () => {
  mockMeasureUncertainty.mockResolvedValueOnce({
    score: 0.45,
    confidence: 0.61,
    uncertainAspects: ["تفصيلة غير مؤكدة"],
  });

  const result = await executeStandardAgentPattern(
    "حلل النص",
    { enableUncertainty: true, enableRAG: false },
    {},
  );

  expect(result.metadata?.uncertaintyScore).toBe(0.45);
  expect(result.confidence).toBeLessThanOrEqual(0.61);
  expect(result.notes.some((note) => note.includes("غير مؤكدة"))).toBe(true);
});

it("يكتشف الهلوسة ويستبدل النص المصحح", async () => {
  mockDetectHallucinations.mockResolvedValueOnce({
    detected: true,
    correctedText: "تحليل مصحح",
    claims: [{ supported: false }, { supported: true }],
  });

  const result = await executeStandardAgentPattern(
    "حلل النص",
    { enableHallucination: true, enableRAG: false },
    {},
  );

  expect(result.text).toBe("تحليل مصحح");
  expect(result.metadata?.hallucinationDetected).toBe(true);
  expect(result.notes.some((note) => note.includes("هلوسة"))).toBe(true);
});

it("يقترح النقاش عندما تهبط الثقة تحت العتبة", async () => {
  mockMeasureUncertainty.mockResolvedValueOnce({
    score: 0.7,
    confidence: 0.4,
    uncertainAspects: ["نتيجة منخفضة الثقة"],
  });

  const result = await executeStandardAgentPattern(
    "حلل النص",
    {
      enableUncertainty: true,
      enableDebate: true,
      confidenceThreshold: 0.7,
      enableRAG: false,
    },
    {},
  );

  expect(result.notes.some((note) => note.includes("نقاش"))).toBe(true);
});

it("يعيد نتيجة خطأ مستقرة عند فشل استدعاء Gemini", async () => {
  mockAnalyzeText.mockRejectedValueOnce(new Error("API Error"));

  const result = await executeStandardAgentPattern(
    "حلل النص",
    { enableRAG: false },
    {},
  );

  expect(result.confidence).toBe(0);
  expect(result.text).toContain("API Error");
  expect(result.notes.some((note) => note.includes("خطأ"))).toBe(true);
});

describe("formatAgentOutput", () => {
  it("ينسق الناتج النصي مع الملاحظات والبيانات الإضافية", () => {
    const output: StandardAgentOutput = {
      text: "نص التحليل",
      confidence: 0.85,
      notes: ["ملاحظة 1", "ملاحظة 2"],
      metadata: {
        ragUsed: true,
        critiqueIterations: 2,
        constitutionalViolations: 1,
        hallucinationDetected: true,
      },
    };

    const formatted = formatAgentOutput(output, "Test Agent");

    expect(formatted).toContain("Test Agent");
    expect(formatted).toContain("85%");
    expect(formatted).toContain("ملاحظة 1");
    expect(formatted).toContain("✓ استخدم RAG");
    expect(formatted).toContain("⚠ تم اكتشاف وتصحيح هلوسات");
  });
});

describe("Integration", () => {
  it("ينفذ المسار الكامل عند تفعيل جميع الميزات", async () => {
    mockPerformRAG.mockResolvedValueOnce({
      chunks: [{ text: "سياق متقدم", relevanceScore: 0.95 }],
      metrics: {
        precision: 0.92,
        recall: 0.9,
        avgRelevanceScore: 0.91,
        processingTimeMs: 30,
      },
    });
    mockPerformSelfCritique.mockResolvedValueOnce({
      finalText: "تحليل محسّن",
      iterations: 1,
      improvementScore: 0.97,
      improved: true,
    });
    mockPerformConstitutionalCheck.mockResolvedValueOnce({
      compliant: true,
      violations: [],
      correctedText: "تحليل محسّن",
    });
    mockMeasureUncertainty.mockResolvedValueOnce({
      score: 0.22,
      confidence: 0.83,
      uncertainAspects: [],
    });
    mockDetectHallucinations.mockResolvedValueOnce({
      detected: false,
      correctedText: "تحليل محسّن",
      claims: [],
    });

    const result = await executeStandardAgentPattern(
      "حلل النص تحليلاً شاملاً",
      {
        enableRAG: true,
        enableSelfCritique: true,
        enableConstitutional: true,
        enableUncertainty: true,
        enableHallucination: true,
      },
      { originalText: "مرجع طويل ".repeat(20) },
    );

    expect(result.text).toBe("تحليل محسّن");
    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.metadata?.ragUsed).toBe(true);
    expect(result.metadata?.critiqueIterations).toBe(1);
  });
});
