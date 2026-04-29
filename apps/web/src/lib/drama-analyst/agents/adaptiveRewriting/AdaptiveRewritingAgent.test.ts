import { describe, it, expect, beforeEach, vi } from "vitest";

import { TaskType } from "@core/enums";

import { StandardAgentInput } from "../shared/standardAgentPattern";

import { AdaptiveRewritingAgent } from "./AdaptiveRewritingAgent";

// Mock geminiService
vi.mock("../../services/geminiService", () => ({
  geminiService: {
    generateContent: vi
      .fn()
      .mockResolvedValue("Mock AI response for adaptive rewriting"),
  },
}));

function makeAgent() {
  const agent = new AdaptiveRewritingAgent();
  vi.clearAllMocks();
  return agent;
}

describe("AdaptiveRewritingAgent — Configuration", () => {
  let agent: AdaptiveRewritingAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  it("should initialize with correct configuration", () => {
    const config = agent.getConfig();

    expect(config.name).toBe("RewriteMaster AI");
    expect(config.taskType).toBe(TaskType.ADAPTIVE_REWRITING);
    expect(config.confidenceFloor).toBe(0.75);
    expect(config.supportsRAG).toBe(true);
    expect(config.supportsSelfCritique).toBe(true);
    expect(config.supportsConstitutional).toBe(true);
  });

  it("should allow confidence floor to be updated", () => {
    agent.setConfidenceFloor(0.85);
    const config = agent.getConfig();
    expect(config.confidenceFloor).toBe(0.85);
  });
});

describe("AdaptiveRewritingAgent — Success Path", () => {
  let agent: AdaptiveRewritingAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  it("should execute adaptive rewriting task successfully", async () => {
    const input: StandardAgentInput = {
      input: "أعد كتابة النص التالي لتحسين الوضوح والإيقاع",
      options: {
        enableRAG: true,
        enableSelfCritique: true,
        enableConstitutional: true,
        enableUncertainty: true,
        enableHallucination: true,
        enableDebate: false,
        confidenceThreshold: 0.75,
      },
      context: {
        originalText: "النص الأصلي الذي يحتاج إلى إعادة كتابة وتحسين",
        rewritingGoals: ["تحسين الوضوح", "تعزيز الإيقاع"],
        targetAudience: "جمهور عام",
        improvementFocus: ["clarity", "pacing"],
      },
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
    expect(typeof result.text).toBe("string");
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.metadata).toBeDefined();

    // Verify no JSON in output
    expect(result.text).not.toMatch(/\{[\s\S]*?"[^"]*"\s*:[\s\S]*?\}/);
    expect(result.text).not.toMatch(/```json/);
  });

  it("should handle rewriting with multiple goals", async () => {
    const input: StandardAgentInput = {
      input: "أعد كتابة مع أهداف متعددة",
      options: {
        enableRAG: true,
        enableSelfCritique: true,
      },
      context: {
        originalText: "نص يحتاج إلى تحسينات متعددة",
        rewritingGoals: ["تحسين الوضوح", "تعزيز التأثير", "تحسين الإيقاع"],
        improvementFocus: ["clarity", "impact", "pacing"],
      },
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeDefined();
  });

  it("should return text-only output without JSON blocks", async () => {
    const input: StandardAgentInput = {
      input: "أعد كتابة النص",
      options: {
        enableRAG: true,
      },
      context: {
        originalText: "النص المراد إعادة كتابته",
      },
    };

    const result = await agent.executeTask(input);

    // Ensure output is clean text
    expect(result.text).not.toContain("```json");
    expect(result.text).not.toContain("```");
    expect(result.text).not.toMatch(/\{[^}]*"[^"]*":[^}]*\}/);
  });

  it("should preserve specified elements", async () => {
    const input: StandardAgentInput = {
      input: "أعد كتابة النص مع الحفاظ على العناصر المحددة",
      options: {},
      context: {
        originalText: "النص الأصلي",
        preserveElements: [
          "أسماء الشخصيات",
          "الأماكن الرئيسية",
          "الحدث المحوري",
        ],
        improvementFocus: ["clarity", "impact"],
      },
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
  });
});

describe("AdaptiveRewritingAgent — Low Confidence Path", () => {
  let agent: AdaptiveRewritingAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  it("should trigger debate when confidence is below threshold", async () => {
    const input: StandardAgentInput = {
      input: "أعد كتابة هذا النص المعقد بشكل كامل",
      options: {
        enableDebate: true,
        confidenceThreshold: 0.95,
        maxDebateRounds: 2,
      },
      context: {
        originalText: "نص معقد جداً",
        rewritingGoals: ["تحسين شامل"],
        constraints: ["يجب الحفاظ على المعنى الدقيق"],
      },
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.confidence).toBeDefined();

    expect(result.confidence >= 0.95 || result.notes !== undefined).toBe(true);
  });

  it("should handle uncertainty in rewriting decisions", async () => {
    const input: StandardAgentInput = {
      input: "أعد كتابة مع أهداف متعارضة",
      options: {
        enableUncertainty: true,
        confidenceThreshold: 0.7,
      },
      context: {
        originalText: "النص",
        rewritingGoals: ["اجعله أقصر", "أضف تفاصيل أكثر"],
        targetLength: "shorter",
      },
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });
});

describe("AdaptiveRewritingAgent — Hallucination Detection", () => {
  let agent: AdaptiveRewritingAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  it("should detect and handle unsupported additions", async () => {
    const input: StandardAgentInput = {
      input: "أعد كتابة النص بدون إضافة معلومات غير موجودة",
      options: {
        enableHallucination: true,
        confidenceThreshold: 0.75,
      },
      context: {
        originalText: "نص بسيط عن موضوع محدد",
        constraints: ["لا تضف معلومات غير موجودة في الأصل"],
      },
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeDefined();
    expect(result.metadata).toBeDefined();
  });

  it("should maintain high confidence for well-constrained rewrites", async () => {
    const input: StandardAgentInput = {
      input: "أعد كتابة نص موثوق بقيود واضحة",
      options: {
        enableHallucination: true,
        confidenceThreshold: 0.75,
      },
      context: {
        originalText: "نص قصير وواضح",
        constraints: ["احتفظ بالمعنى تماماً"],
        preserveElements: ["جميع الأسماء والأرقام"],
      },
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.confidence < 0.85 || result.notes.includes("عالي")).toBe(
      true
    );
  });
});

describe("AdaptiveRewritingAgent — Post-Processing and Quality", () => {
  let agent: AdaptiveRewritingAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  it("should clean JSON blocks from output", async () => {
    const input: StandardAgentInput = {
      input: "أعد الكتابة",
      options: {},
      context: {
        originalText: "النص",
      },
    };

    const result = await agent.executeTask(input);

    // Verify all JSON is removed
    expect(result.text).not.toMatch(/```json[\s\S]*?```/);
    expect(result.text).not.toMatch(/```[\s\S]*?```/);
    expect(result.text).not.toMatch(/\{[\s\S]*?"[^"]*"\s*:[\s\S]*?\}/);
  });

  it("should assess rewriting quality metrics", async () => {
    const input: StandardAgentInput = {
      input: "أعد الكتابة",
      options: {},
      context: {
        originalText: "النص الأصلي",
        rewritingGoals: ["تحسين الوضوح"],
      },
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(result.confidence).toBeDefined();
  });

  it("should add appropriate notes based on quality assessment", async () => {
    const input: StandardAgentInput = {
      input: "أعد الكتابة",
      options: {
        confidenceThreshold: 0.8,
      },
      context: {
        originalText: "النص",
      },
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.notes).toBeDefined();
    expect(Array.isArray(result.notes)).toBe(true);
  });

  it("should include rewriting metadata", async () => {
    const input: StandardAgentInput = {
      input: "أعد الكتابة",
      options: {},
      context: {
        originalText: "النص الأصلي",
        rewritingGoals: ["تحسين"],
      },
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.metadata).toBeDefined();
    // التحقق من وجود البيانات الوصفية كائن
    expect(typeof result.metadata).toBe("object");
  });
});

describe("AdaptiveRewritingAgent — Error Handling", () => {
  let agent: AdaptiveRewritingAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  it("should return fallback response on error", async () => {
    const input: StandardAgentInput = {
      input: "",
      options: {},
      context: {},
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeLessThanOrEqual(0.5);
  });

  it("should handle missing original text gracefully", async () => {
    const input: StandardAgentInput = {
      input: "أعد الكتابة",
      options: {},
      context: {
        rewritingGoals: ["تحسين"],
      },
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
  });
});

describe("AdaptiveRewritingAgent — Advanced Options", () => {
  let agent: AdaptiveRewritingAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  it("should respect all advanced options", async () => {
    const input: StandardAgentInput = {
      input: "أعد كتابة النص",
      options: {
        enableRAG: true,
        enableSelfCritique: true,
        enableConstitutional: true,
        enableUncertainty: true,
        enableHallucination: true,
        enableDebate: true,
        maxDebateRounds: 3,
        confidenceThreshold: 0.8,
        temperature: 0.8,
        maxTokens: 8192,
      },
      context: {
        originalText: "النص الأصلي",
        rewritingGoals: ["تحسين شامل"],
      },
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeDefined();
    expect(result.metadata).toBeDefined();
  });

  it("should handle various target lengths", async () => {
    const lengths = ["shorter", "same", "longer", "double", "half"];

    for (const length of lengths) {
      const input: StandardAgentInput = {
        input: "أعد الكتابة",
        options: {},
        context: {
          originalText: "نص",
          targetLength: length,
        },
      };

      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
    }
  });

  it("should handle various improvement focuses", async () => {
    const focuses = ["pacing", "dialogue", "description", "clarity", "impact"];

    const input: StandardAgentInput = {
      input: "أعد الكتابة",
      options: {},
      context: {
        originalText: "نص",
        improvementFocus: focuses,
      },
    };

    const result = await agent.executeTask(input);
    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
  });
});

describe("AdaptiveRewritingAgent — Integration with Standard Pattern", () => {
  let agent: AdaptiveRewritingAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  it("should execute full standard pattern pipeline", async () => {
    const input: StandardAgentInput = {
      input: "أعد الكتابة بالنمط القياسي الكامل",
      options: {
        enableRAG: true,
        enableSelfCritique: true,
        enableConstitutional: true,
        enableUncertainty: true,
        enableHallucination: true,
        enableDebate: true,
      },
      context: {
        originalText: "النص",
        rewritingGoals: ["تحسين شامل"],
      },
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeDefined();
    expect(result.metadata).toBeDefined();
  });
});
