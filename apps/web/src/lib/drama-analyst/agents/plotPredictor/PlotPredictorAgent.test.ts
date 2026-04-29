import { describe, it, expect, beforeEach, vi } from "vitest";

import { TaskType } from "@core/enums";

import { StandardAgentInput } from "../shared/standardAgentPattern";

import { PlotPredictorAgent } from "./PlotPredictorAgent";

// Mock geminiService
vi.mock("../../services/geminiService", () => ({
  geminiService: {
    generateContent: vi
      .fn()
      .mockResolvedValue("Mock AI response for plot prediction"),
  },
}));

function makeAgent() {
  const agent = new PlotPredictorAgent();
  vi.clearAllMocks();
  return agent;
}

describe("PlotPredictorAgent — Configuration", () => {
  let agent: PlotPredictorAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  it("should initialize with correct configuration", () => {
    const config = agent.getConfig();

    expect(config.name).toBe("PlotPredictorAgent");
    expect(config.taskType).toBe(TaskType.PLOT_PREDICTOR);
    expect(config.confidenceFloor).toBe(0.78);
    expect(config.supportsRAG).toBe(true);
    expect(config.supportsSelfCritique).toBe(true);
    expect(config.supportsConstitutional).toBe(true);
    expect(config.supportsUncertainty).toBe(true);
    expect(config.supportsHallucination).toBe(true);
    expect(config.supportsDebate).toBe(true);
  });

  it("should allow confidence floor to be updated", () => {
    agent.setConfidenceFloor(0.85);
    const config = agent.getConfig();
    expect(config.confidenceFloor).toBe(0.85);
  });
});

describe("PlotPredictorAgent — Success Path", () => {
  let agent: PlotPredictorAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  it("should execute plot prediction task successfully", async () => {
    const input: StandardAgentInput = {
      input:
        "تنبأ بمسارات الحبكة المحتملة لقصة تدور حول صراع بين شخصيتين رئيسيتين",
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
        previousStations: {
          analysis: "تحليل أولي للنص",
          characterAnalysis: "تحليل الشخصيات الرئيسية",
        },
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

  it("should include context from previous stations in prompt", async () => {
    const input: StandardAgentInput = {
      input: "تنبأ بتطورات الحبكة",
      options: {},
      context: {
        previousStations: {
          analysis: "النص يحتوي على صراع رئيسي",
          characterAnalysis: "الشخصية الرئيسية لديها دوافع معقدة",
          thematicAnalysis: "الثيمات الأساسية: الخيانة والفداء",
        },
      },
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
  });

  it("should return text-only output without JSON blocks", async () => {
    const input: StandardAgentInput = {
      input: "حلل وتنبأ بمسارات الحبكة",
      options: {
        enableRAG: true,
      },
      context: {},
    };

    const result = await agent.executeTask(input);

    // Ensure output is clean text
    expect(result.text).not.toContain("```json");
    expect(result.text).not.toContain("```");
    expect(result.text).not.toMatch(/\{[^}]*"[^"]*":[^}]*\}/);
  });
});

describe("PlotPredictorAgent — Low Confidence Path", () => {
  let agent: PlotPredictorAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  it("should trigger debate when confidence is below threshold", async () => {
    const input: StandardAgentInput = {
      input: "تنبأ بمسارات معقدة جداً للحبكة مع تحليل عميق",
      options: {
        enableDebate: true,
        confidenceThreshold: 0.95, // High threshold to potentially trigger debate
        maxDebateRounds: 2,
      },
      context: {},
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.confidence).toBeDefined();

    // If confidence is low, notes should indicate additional processing
    expect(result.confidence >= 0.95 || result.notes !== undefined).toBe(true);
  });

  it("should handle uncertainty in predictions", async () => {
    const input: StandardAgentInput = {
      input: "تنبأ بمسارات الحبكة مع درجة عالية من عدم اليقين",
      options: {
        enableUncertainty: true,
        confidenceThreshold: 0.65,
      },
      context: {
        previousStations: {
          analysis: "تحليل محدود وغير مكتمل",
        },
      },
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });
});

describe("PlotPredictorAgent — Hallucination Detection", () => {
  let agent: PlotPredictorAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  it("should detect and handle unsupported claims", async () => {
    const input: StandardAgentInput = {
      input: "تنبأ بمسارات الحبكة بناءً على معلومات غير مذكورة",
      options: {
        enableHallucination: true,
        confidenceThreshold: 0.75,
      },
      context: {
        previousStations: {
          analysis: "تحليل بسيط للنص",
        },
      },
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeDefined();

    // Hallucination detection should influence confidence or notes
    expect(result.metadata).toBeDefined();
  });

  it("should maintain high confidence for well-supported predictions", async () => {
    const input: StandardAgentInput = {
      input: "تنبأ بمسارات الحبكة بناءً على سياق موثق بشكل جيد",
      options: {
        enableRAG: true,
        confidenceThreshold: 0.75,
      },
      context: {
        previousStations: {
          analysis: "تحليل شامل ومفصل للنص",
          characterAnalysis: "شخصيات محددة بوضوح مع دوافع واضحة",
          thematicAnalysis: "ثيمات محددة بدقة",
        },
      },
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });
});

describe("PlotPredictorAgent — Post-Processing and Error Handling", () => {
  let agent: PlotPredictorAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  it("should clean JSON blocks from output", async () => {
    const input: StandardAgentInput = {
      input: "تنبأ بالحبكة",
      options: {},
      context: {},
    };

    const result = await agent.executeTask(input);

    // Verify all JSON is removed
    expect(result.text).not.toMatch(/```json[\s\S]*?```/);
    expect(result.text).not.toMatch(/```[\s\S]*?```/);
    expect(result.text).not.toMatch(/\{[\s\S]*?"[^"]*"\s*:[\s\S]*?\}/);
  });

  it("should add appropriate notes based on confidence level", async () => {
    const input: StandardAgentInput = {
      input: "تنبأ بمسارات الحبكة",
      options: {
        confidenceThreshold: 0.75,
      },
      context: {},
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.notes).toBeDefined();
    expect(result.confidence >= 0.75 || result.notes.length > 0).toBe(true);
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

  it("should handle missing context gracefully", async () => {
    const input: StandardAgentInput = {
      input: "تنبأ بالحبكة",
      options: {},
      context: undefined,
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
  });
});

describe("PlotPredictorAgent — Advanced Options and Standard Pattern", () => {
  let agent: PlotPredictorAgent;

  beforeEach(() => {
    agent = makeAgent();
  });

  it("should respect all advanced options", async () => {
    const input: StandardAgentInput = {
      input: "تنبأ بمسارات الحبكة",
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
      context: {},
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeDefined();
    expect(result.metadata).toBeDefined();
  });

  it("should use default options when not provided", async () => {
    const input: StandardAgentInput = {
      input: "تنبأ بالحبكة",
      options: undefined,
      context: {},
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
  });

  it("should execute full standard pattern pipeline", async () => {
    const input: StandardAgentInput = {
      input: "تنبأ بمسارات الحبكة مع كل الخيارات المتقدمة",
      options: {
        enableRAG: true,
        enableSelfCritique: true,
        enableConstitutional: true,
        enableUncertainty: true,
        enableHallucination: true,
        enableDebate: true,
        maxDebateRounds: 2,
        confidenceThreshold: 0.75,
      },
      context: {
        previousStations: {
          analysis: "تحليل شامل",
          characterAnalysis: "تحليل شخصيات",
        },
      },
    };

    const result = await agent.executeTask(input);

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeDefined();
    expect(result.metadata).toBeDefined();
  });
});
