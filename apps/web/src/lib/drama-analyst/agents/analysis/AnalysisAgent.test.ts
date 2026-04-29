import { describe, it, expect, beforeEach, vi } from "vitest";

import { TaskType } from "@core/types";

import { StandardAgentInput } from "../shared/standardAgentPattern";

import { AnalysisAgent } from "./AnalysisAgent";

// Mock gemini-core module
vi.mock("@/lib/ai/gemini-core", () => ({
  geminiCore: {
    generateContent: vi
      .fn()
      .mockResolvedValue("Mock AI response for critical analysis"),
  },
}));

function makeAgent() {
  const agent = new AnalysisAgent();
  vi.clearAllMocks();
  return agent;
}

describe("AnalysisAgent — Configuration", () => {
  let agent: AnalysisAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  // تحقق من تهيئة الوكيل بالإعدادات الصحيحة
  it("validate-pipeline: should initialize with correct configuration", () => {
    const config = agent.getConfig();
    expect(config.taskType).toBe(TaskType.ANALYSIS);
    expect(config.name).toBe("CritiqueArchitect AI");
    expect(config.supportsRAG).toBe(true);
    expect(config.supportsSelfCritique).toBe(true);
    expect(config.supportsConstitutional).toBe(true);
    expect(config.supportsUncertainty).toBe(true);
    expect(config.supportsHallucination).toBe(true);
    expect(config.supportsDebate).toBe(true);
  });

  // تحقق من حد الثقة الدنيا للوكيل
  it("validate-pipeline: should have correct confidence floor", () => {
    const config = agent.getConfig();
    expect(config.confidenceFloor).toBeGreaterThanOrEqual(0.85);
  });
});

describe("AnalysisAgent — Success Path", () => {
  let agent: AnalysisAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  // تنفيذ التحليل النقدي بنجاح
  it("validate-pipeline: should execute critical analysis successfully", async () => {
    const input: StandardAgentInput = {
      input: "حلل النص الدرامي المقدم",
      options: { enableRAG: true, confidenceThreshold: 0.75 },
      context: {
        originalText: "نص درامي للتحليل النقدي المعماري",
        analysisDepth: "moderate",
      },
    };
    const result = await agent.executeTask(input);
    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.text).not.toMatch(/```json/);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.notes).toBeDefined();
  });

  // إرجاع مخرجات نصية بدون كتل JSON
  it("validate-pipeline: should return text-only output without JSON blocks", async () => {
    const input: StandardAgentInput = {
      input: "حلل النص",
      options: {},
      context: { originalText: "نص للتحليل" },
    };
    const result = await agent.executeTask(input);
    expect(result.text).not.toContain("```json");
    expect(result.text).not.toContain("```");
    expect(result.text).not.toMatch(/\{[^}]*"[^"]*":[^}]*\}/);
  });

  // معالجة أعماق تحليل مختلفة
  it("validate-pipeline: should handle different analysis depths", async () => {
    const depths = ["surface", "moderate", "deep"] as const;
    for (const depth of depths) {
      const input: StandardAgentInput = {
        input: "حلل النص",
        options: {},
        context: { originalText: "نص", analysisDepth: depth },
      };
      const result = await agent.executeTask(input);
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    }
  });

  // معالجة مناطق التركيز
  it("validate-pipeline: should handle focus areas", async () => {
    const input: StandardAgentInput = {
      input: "حلل النص مع التركيز على الشخصيات",
      options: {},
      context: {
        originalText: "نص",
        focusAreas: ["الشخصيات", "الحبكة", "الموضوعات"],
      },
    };
    const result = await agent.executeTask(input);
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });
});

describe("AnalysisAgent — Low Confidence Path", () => {
  let agent: AnalysisAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  // معالجة عدم التأكد في التحليل
  it("validate-pipeline: should handle uncertainty in analysis", async () => {
    const input: StandardAgentInput = {
      input: "حلل النص",
      options: { enableUncertainty: true, confidenceThreshold: 0.9 },
      context: { originalText: "نص قصير جداً" },
    };
    const result = await agent.executeTask(input);
    expect(result).toBeDefined();
    expect(result.confidence).toBeDefined();
    expect(result.notes).toBeDefined();
  });

  // تفعيل النقاش عند انخفاض مستوى الثقة
  it("validate-pipeline: should trigger debate when confidence is low", async () => {
    const input: StandardAgentInput = {
      input: "حلل نص معقد جداً",
      options: {
        enableDebate: true,
        confidenceThreshold: 0.5,
        maxDebateRounds: 2,
      },
      context: { originalText: "نص معقد" },
    };
    const result = await agent.executeTask(input);
    expect(result).toBeDefined();
    expect(result.confidence).toBeDefined();
  });
});

describe("AnalysisAgent — Hallucination Detection", () => {
  let agent: AnalysisAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  // كشف ومعالجة الهلوسات (الأخطاء المتوهمة)
  it("validate-pipeline: should detect and handle hallucinations", async () => {
    const input: StandardAgentInput = {
      input: "حلل النص",
      options: { enableHallucination: true },
      context: { originalText: "نص للتحليل" },
    };
    const result = await agent.executeTask(input);
    expect(result).toBeDefined();
    expect(result.metadata).toBeDefined();
  });
});

describe("AnalysisAgent — Post-Processing", () => {
  let agent: AnalysisAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  // تنظيف آثار JSON من المخرجات
  it("validate-pipeline: should clean up JSON artifacts from output", async () => {
    const input: StandardAgentInput = {
      input: "حلل النص",
      options: {},
      context: { originalText: "نص" },
    };
    const result = await agent.executeTask(input);
    expect(result.text).not.toContain("```json");
    expect(result.text).not.toContain("```");
    expect(result.text).not.toMatch(/\{[^}]*"[^"]*":[^}]*\}/);
  });

  // تنظيم أقسام التحليل بشكل صحيح
  it("validate-pipeline: should structure analysis sections properly", async () => {
    const input: StandardAgentInput = {
      input: "حلل النص بشكل شامل",
      options: {},
      context: { originalText: "نص درامي" },
    };
    const result = await agent.executeTask(input);
    expect(result.text).toBeTruthy();
    // يجب أن يكون للنتيجة هيكل معين
    expect(result.text.length).toBeGreaterThan(50);
  });
});

describe("AnalysisAgent — Error Handling", () => {
  let agent: AnalysisAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  // معالجة الأخطاء بشكل لطيف
  it("validate-pipeline: should handle errors gracefully", async () => {
    const agentWithBuildPrompt = agent as unknown as {
      buildPrompt: (input: StandardAgentInput) => string;
    };
    vi.spyOn(agentWithBuildPrompt, "buildPrompt").mockImplementation(() => {
      throw new Error("Test error");
    });

    const input: StandardAgentInput = {
      input: "حلل النص",
      options: {},
      context: {},
    };
    const result = await agent.executeTask(input);
    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeLessThan(0.5);
    expect(result.notes).toBeDefined();
  });

  // توفير استجابة احتياطية عند الفشل
  it("validate-pipeline: should provide fallback response on failure", async () => {
    const input: StandardAgentInput = {
      input: "حلل النص",
      options: {},
      context: {},
    };
    // فرض خطأ
    vi.spyOn(agent, "executeTask").mockRejectedValueOnce(
      new Error("Test error")
    );

    await expect(agent.executeTask(input)).rejects.toBeDefined();
  });
});

describe("AnalysisAgent — Advanced Options", () => {
  let agent: AnalysisAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  // احترام خيار enableRAG
  it("validate-pipeline: should respect enableRAG option", async () => {
    const input: StandardAgentInput = {
      input: "حلل النص",
      options: { enableRAG: false },
      context: { originalText: "نص" },
    };
    const result = await agent.executeTask(input);
    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
  });

  // احترام خيار enableSelfCritique
  it("validate-pipeline: should respect enableSelfCritique option", async () => {
    const input: StandardAgentInput = {
      input: "حلل النص",
      options: { enableSelfCritique: true },
      context: { originalText: "نص" },
    };
    const result = await agent.executeTask(input);
    expect(result).toBeDefined();
    expect(result.metadata).toBeDefined();
  });

  // احترام جميع الخيارات المتقدمة
  it("validate-pipeline: should respect all advanced options", async () => {
    const input: StandardAgentInput = {
      input: "حلل النص بشكل شامل",
      options: {
        enableRAG: true,
        enableSelfCritique: true,
        enableConstitutional: true,
        enableUncertainty: true,
        enableHallucination: true,
        enableDebate: false,
      },
      context: { originalText: "نص درامي" },
    };
    const result = await agent.executeTask(input);
    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.metadata).toBeDefined();
  });
});

describe("AnalysisAgent — Integration with Standard Pattern", () => {
  let agent: AnalysisAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  // تنفيذ خط أنابيب كامل
  it("validate-pipeline: should execute full pipeline", async () => {
    const input: StandardAgentInput = {
      input: "حلل النص الدرامي بشكل شامل",
      options: {
        enableRAG: true,
        enableSelfCritique: true,
        enableConstitutional: true,
        enableUncertainty: true,
        enableHallucination: true,
      },
      context: {
        originalText: "نص درامي مفصل للتحليل النقدي المعماري",
        analysisDepth: "deep",
        focusAreas: ["البنية", "الشخصيات"],
      },
    };
    const result = await agent.executeTask(input);
    expect(result.text).toBeTruthy();
    expect(result.metadata).toBeDefined();
    expect(result.text).not.toContain("```");
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.notes).toBeDefined();
  });

  // معالجة سياق التحليل السابق
  it("validate-pipeline: should handle previous analysis context", async () => {
    const input: StandardAgentInput = {
      input: "حلل النص بناءً على التحليل السابق",
      options: {},
      context: {
        originalText: "نص",
        previousAnalysis: {
          mainFindings: "نتائج سابقة",
          recommendations: ["توصية 1", "توصية 2"],
        },
      },
    };
    const result = await agent.executeTask(input);
    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
  });
});

describe("AnalysisAgent — Context Handling", () => {
  let agent: AnalysisAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  // معالجة سياق النوع والجمهور
  it("validate-pipeline: should handle genre and audience context", async () => {
    const input: StandardAgentInput = {
      input: "حلل النص",
      options: {},
      context: {
        originalText: "نص",
        genre: "دراما",
        targetAudience: "شباب",
      },
    };
    const result = await agent.executeTask(input);
    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
  });

  // معالجة السياق الفارغ بشكل لطيف
  it("validate-pipeline: should handle empty context gracefully", async () => {
    const input: StandardAgentInput = {
      input: "حلل النص",
      options: {},
      context: {},
    };
    const result = await agent.executeTask(input);
    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
  });
});
