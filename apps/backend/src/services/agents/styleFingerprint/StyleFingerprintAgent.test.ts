import { describe, it, expect, beforeEach, vi } from "vitest";

import { TaskType } from "@core/enums";

import { StandardAgentInput } from "../shared/standardAgentPattern";

import { StyleFingerprintAgent } from "./StyleFingerprintAgent";

const { mockAnalyzeText, mockGenerateText } = vi.hoisted(() => {
  const mockAgentText =
    "نعم\nتحليل تجريبي مفصل يصف البصمة الأسلوبية ومؤشرات الإيقاع واللغة والبناء التعبيري.";
  return {
    mockAnalyzeText: vi.fn(() => Promise.resolve(mockAgentText)),
    mockGenerateText: vi.fn(() => Promise.resolve(mockAgentText)),
  };
});

vi.mock("@/services/gemini.service", () => ({
  geminiService: {
    analyzeText: mockAnalyzeText,
    generateText: mockGenerateText,
  },
}));

describe("StyleFingerprintAgent", () => {
  let agent: StyleFingerprintAgent;

  beforeEach(() => {
    agent = new StyleFingerprintAgent();
    vi.clearAllMocks();
  });

  describe("Configuration", () => {
    it("should initialize with correct configuration", () => {
      const config = agent.getConfig();
      expect(config.taskType).toBe(TaskType.STYLE_FINGERPRINT);
      expect(config.supportsRAG).toBe(true);
      expect(config.supportsSelfCritique).toBe(true);
    });
  });

  describe("Success Path", () => {
    it("should execute style fingerprint analysis successfully", async () => {
      const input: StandardAgentInput = {
        input: "حلل البصمة الأسلوبية للنص",
        options: { enableRAG: true, confidenceThreshold: 0.75 },
        context: { originalText: "نص درامي للتحليل الأسلوبي" },
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.text).not.toMatch(/```json/);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it("should return text-only output", async () => {
      const input: StandardAgentInput = {
        input: "حلل الأسلوب",
        options: {},
        context: { originalText: "نص" },
      };
      const result = await agent.executeTask(input);
      expect(result.text).not.toContain("```");
      expect(result.text).not.toMatch(/\{[^}]*"[^"]*":[^}]*\}/);
    });
  });

  describe("Low Confidence Path", () => {
    it("should handle uncertainty in style detection", async () => {
      const input: StandardAgentInput = {
        input: "حلل الأسلوب",
        options: { enableUncertainty: true, confidenceThreshold: 0.9 },
        context: { originalText: "نص قصير" },
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();
    });
  });

  describe("Integration with Standard Pattern", () => {
    it("should execute full pipeline", async () => {
      const input: StandardAgentInput = {
        input: "حلل البصمة الأسلوبية الكاملة",
        options: {
          enableRAG: true,
          enableSelfCritique: true,
          enableHallucination: true,
        },
        context: { originalText: "نص أدبي مفصل للتحليل" },
      };
      const result = await agent.executeTask(input);
      expect(result.text).toBeTruthy();
      expect(result.metadata).toBeDefined();
      expect(result.text).not.toContain("```");
    });
  });
});
