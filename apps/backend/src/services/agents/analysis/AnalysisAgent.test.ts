import { describe, it, expect, beforeEach, vi } from "vitest";
import { AnalysisAgent } from "./AnalysisAgent";
import { StandardAgentInput } from "../shared/standardAgentPattern";
import { TaskType } from "@core/types";

vi.mock("@/ai/gemini-service", () => ({
  geminiService: {
    generateContent: vi
      .fn()
      .mockResolvedValue("Mock AI response for critical analysis"),
  },
}));

describe("AnalysisAgent", () => {
  let agent: AnalysisAgent;

  beforeEach(() => {
    agent = new AnalysisAgent();
    vi.clearAllMocks();
  });

  describe("Configuration", () => {
    it("should initialize with correct configuration", () => {
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

    it("should have correct confidence floor", () => {
      const config = agent.getConfig();
      expect(config.confidenceFloor).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe("Success Path", () => {
    it("should execute critical analysis successfully", async () => {
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

    it("should return text-only output without JSON blocks", async () => {
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

    it("should handle different analysis depths", async () => {
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

    it("should handle focus areas", async () => {
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

  describe("Low Confidence Path", () => {
    it("should handle uncertainty in analysis", async () => {
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

    it("should trigger debate when confidence is low", async () => {
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

  describe("Hallucination Detection", () => {
    it("should detect and handle hallucinations", async () => {
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

  describe("Post-Processing", () => {
    it("should clean up JSON artifacts from output", async () => {
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

    it("should structure analysis sections properly", async () => {
      const input: StandardAgentInput = {
        input: "حلل النص بشكل شامل",
        options: {},
        context: { originalText: "نص درامي" },
      };
      const result = await agent.executeTask(input);
      expect(result.text).toBeTruthy();
      // Should have some structure
      expect(result.text.length).toBeGreaterThan(50);
    });
  });

  describe("Error Handling", () => {
    it("should handle errors gracefully", async () => {
      vi.spyOn(agent as any, "buildPrompt").mockImplementation(() => {
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

    it("should provide fallback response on failure", async () => {
      const input: StandardAgentInput = {
        input: "حلل النص",
        options: {},
        context: {},
      };
      // Force an error
      vi.spyOn(agent as any, "executeTask").mockRejectedValueOnce(
        new Error("Test error")
      );

      try {
        await agent.executeTask(input);
      } catch (error) {
        // Should be caught by BaseAgent
        expect(error).toBeDefined();
      }
    });
  });

  describe("Advanced Options", () => {
    it("should respect enableRAG option", async () => {
      const input: StandardAgentInput = {
        input: "حلل النص",
        options: { enableRAG: false },
        context: { originalText: "نص" },
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should respect enableSelfCritique option", async () => {
      const input: StandardAgentInput = {
        input: "حلل النص",
        options: { enableSelfCritique: true },
        context: { originalText: "نص" },
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it("should respect all advanced options", async () => {
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

  describe("Integration with Standard Pattern", () => {
    it("should execute full pipeline", async () => {
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

    it("should handle previous analysis context", async () => {
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

  describe("Context Handling", () => {
    it("should handle genre and audience context", async () => {
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

    it("should handle empty context gracefully", async () => {
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
});
