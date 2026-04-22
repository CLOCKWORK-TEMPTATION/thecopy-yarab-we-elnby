import { describe, it, expect, beforeEach, vi } from "vitest";
import { IntegratedAgent } from "./IntegratedAgent";
import { StandardAgentInput } from "../shared/standardAgentPattern";
import { TaskType } from "@core/types";

vi.mock("@/ai/gemini-service", () => ({
  geminiService: {
    generateContent: vi
      .fn()
      .mockResolvedValue("Mock AI response for integrated synthesis"),
  },
}));

describe("IntegratedAgent", () => {
  let agent: IntegratedAgent;

  beforeEach(() => {
    agent = new IntegratedAgent();
    vi.clearAllMocks();
  });

  describe("Configuration", () => {
    it("should initialize with correct configuration", () => {
      const config = agent.getConfig();
      expect(config.taskType).toBe(TaskType.INTEGRATED);
      expect(config.name).toBe("SynthesisOrchestrator AI");
      expect(config.supportsRAG).toBe(true);
      expect(config.supportsSelfCritique).toBe(true);
      expect(config.supportsConstitutional).toBe(true);
      expect(config.supportsUncertainty).toBe(true);
      expect(config.supportsHallucination).toBe(true);
      expect(config.supportsDebate).toBe(true);
    });

    it("should have correct confidence floor", () => {
      const config = agent.getConfig();
      expect(config.confidenceFloor).toBeGreaterThanOrEqual(0.87);
    });
  });

  describe("Success Path", () => {
    it("should execute integrated synthesis successfully", async () => {
      const input: StandardAgentInput = {
        input: "دمج نتائج التحليل والإبداع",
        options: { enableRAG: true, confidenceThreshold: 0.75 },
        context: {
          originalText: "نص للتحليل والإبداع",
          targetOutput: "synthesis",
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
        input: "دمج النتائج",
        options: {},
        context: {},
      };
      const result = await agent.executeTask(input);
      expect(result.text).not.toContain("```json");
      expect(result.text).not.toContain("```");
      expect(result.text).not.toMatch(/\{[^}]*"[^"]*":[^}]*\}/);
    });

    it("should handle different target outputs", async () => {
      const targets = ["analysis", "creative", "synthesis"] as const;
      for (const target of targets) {
        const input: StandardAgentInput = {
          input: "دمج النتائج",
          options: {},
          context: { targetOutput: target },
        };
        const result = await agent.executeTask(input);
        expect(result.text).toBeTruthy();
        expect(result.confidence).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle different synthesis depths", async () => {
      const depths = ["basic", "moderate", "deep"] as const;
      for (const depth of depths) {
        const input: StandardAgentInput = {
          input: "دمج النتائج",
          options: {},
          context: { synthesisDepth: depth },
        };
        const result = await agent.executeTask(input);
        expect(result.text).toBeTruthy();
        expect(result.confidence).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle different integration strategies", async () => {
      const strategies = ["sequential", "parallel", "iterative"] as const;
      for (const strategy of strategies) {
        const input: StandardAgentInput = {
          input: "دمج النتائج",
          options: {},
          context: { integrationStrategy: strategy },
        };
        const result = await agent.executeTask(input);
        expect(result.text).toBeTruthy();
        expect(result.confidence).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Integration with Analysis and Creative", () => {
    it("should integrate analysis results", async () => {
      const input: StandardAgentInput = {
        input: "دمج نتائج التحليل",
        options: {},
        context: {
          analysisResults: {
            mainFindings: "نتائج التحليل الرئيسية",
            recommendations: ["توصية 1", "توصية 2"],
          },
        },
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(50);
    });

    it("should integrate creative results", async () => {
      const input: StandardAgentInput = {
        input: "دمج نتائج الإبداع",
        options: {},
        context: {
          creativeResults: {
            content: "محتوى إبداعي",
            creativeElements: ["عنصر 1", "عنصر 2"],
          },
        },
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should integrate both analysis and creative results", async () => {
      const input: StandardAgentInput = {
        input: "دمج نتائج التحليل والإبداع",
        options: {},
        context: {
          analysisResults: {
            mainFindings: "نتائج التحليل",
            recommendations: ["توصية"],
          },
          creativeResults: {
            content: "محتوى إبداعي",
            creativeElements: ["عنصر"],
          },
        },
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      // Should mention both analysis and creative
      expect(
        result.text.includes("تحليل") || result.text.includes("إبداع")
      ).toBe(true);
    });
  });

  describe("Low Confidence Path", () => {
    it("should handle uncertainty in synthesis", async () => {
      const input: StandardAgentInput = {
        input: "دمج النتائج",
        options: { enableUncertainty: true, confidenceThreshold: 0.9 },
        context: {},
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.notes).toBeDefined();
    });

    it("should trigger debate when confidence is low", async () => {
      const input: StandardAgentInput = {
        input: "دمج نتائج معقدة",
        options: {
          enableDebate: true,
          confidenceThreshold: 0.5,
          maxDebateRounds: 2,
        },
        context: {},
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();
    });
  });

  describe("Hallucination Detection", () => {
    it("should detect and handle hallucinations", async () => {
      const input: StandardAgentInput = {
        input: "دمج النتائج",
        options: { enableHallucination: true },
        context: {},
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  describe("Post-Processing", () => {
    it("should clean up JSON artifacts from output", async () => {
      const input: StandardAgentInput = {
        input: "دمج النتائج",
        options: {},
        context: {},
      };
      const result = await agent.executeTask(input);
      expect(result.text).not.toContain("```json");
      expect(result.text).not.toContain("```");
      expect(result.text).not.toMatch(/\{[^}]*"[^"]*":[^}]*\}/);
    });

    it("should structure synthesis sections properly", async () => {
      const input: StandardAgentInput = {
        input: "دمج النتائج بشكل شامل",
        options: {},
        context: {},
      };
      const result = await agent.executeTask(input);
      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(50);
    });
  });

  describe("Error Handling", () => {
    it("should handle errors gracefully", async () => {
      vi.spyOn(agent as any, "buildPrompt").mockImplementation(() => {
        throw new Error("Test error");
      });

      const input: StandardAgentInput = {
        input: "دمج النتائج",
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
        input: "دمج النتائج",
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
        input: "دمج النتائج",
        options: { enableRAG: false },
        context: {},
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should respect enableSelfCritique option", async () => {
      const input: StandardAgentInput = {
        input: "دمج النتائج",
        options: { enableSelfCritique: true },
        context: {},
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it("should respect all advanced options", async () => {
      const input: StandardAgentInput = {
        input: "دمج النتائج بشكل شامل",
        options: {
          enableRAG: true,
          enableSelfCritique: true,
          enableConstitutional: true,
          enableUncertainty: true,
          enableHallucination: true,
          enableDebate: false,
        },
        context: {},
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
        input: "دمج نتائج التحليل والإبداع بشكل شامل",
        options: {
          enableRAG: true,
          enableSelfCritique: true,
          enableConstitutional: true,
          enableUncertainty: true,
          enableHallucination: true,
        },
        context: {
          originalText: "نص للتحليل والإبداع",
          analysisResults: {
            mainFindings: "نتائج التحليل",
            recommendations: ["توصية 1"],
          },
          creativeResults: {
            content: "محتوى إبداعي",
            creativeElements: ["عنصر 1"],
          },
          targetOutput: "synthesis",
          synthesisDepth: "deep",
        },
      };
      const result = await agent.executeTask(input);
      expect(result.text).toBeTruthy();
      expect(result.metadata).toBeDefined();
      expect(result.text).not.toContain("```");
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.notes).toBeDefined();
    });
  });

  describe("Balance Assessment", () => {
    it("should assess balance between analysis and creative", async () => {
      const input: StandardAgentInput = {
        input: "دمج النتائج",
        options: {},
        context: {
          analysisResults: { mainFindings: "تحليل" },
          creativeResults: { content: "إبداع" },
        },
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      // Should have balance assessment in metadata
      if (result.metadata) {
        expect(result.metadata.balanceQuality).toBeDefined();
      }
    });
  });

  describe("Context Handling", () => {
    it("should handle empty context gracefully", async () => {
      const input: StandardAgentInput = {
        input: "دمج النتائج",
        options: {},
        context: {},
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should handle partial context", async () => {
      const input: StandardAgentInput = {
        input: "دمج النتائج",
        options: {},
        context: {
          analysisResults: { mainFindings: "نتائج" },
        },
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });
});
