import { describe, it, expect, beforeEach, vi } from "vitest";
import { PlatformAdapterAgent } from "./PlatformAdapterAgent";
import { StandardAgentInput } from "../shared/standardAgentPattern";
import { TaskType } from "../../../../core/types";

// Mock geminiService
vi.mock("../../services/geminiService", () => ({
  geminiService: {
    generateContent: vi
      .fn()
      .mockResolvedValue("Mock AI response for platform adaptation"),
  },
}));

describe("PlatformAdapterAgent", () => {
  let agent: PlatformAdapterAgent;

  beforeEach(() => {
    agent = new PlatformAdapterAgent();
    vi.clearAllMocks();
  });

  describe("Configuration", () => {
    it("should initialize with correct configuration", () => {
      const config = agent.getConfig();

      expect(config.name).toBe("MediaTransmorph AI");
      expect(config.taskType).toBe(TaskType.PLATFORM_ADAPTER);
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

  describe("Success Path", () => {
    it("should execute platform adaptation task successfully", async () => {
      const input: StandardAgentInput = {
        input:
          "حوّل هذا المحتوى الطويل ليناسب منصة تويتر: قصة درامية معقدة عن صراع بين شخصيتين...",
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
            targetPlatform: "Twitter",
            contentType: "drama",
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
        input: "كيّف المحتوى للمنصة المستهدفة",
        options: {},
        context: {
          previousStations: {
            analysis: "محتوى درامي يحتوي على حوار عميق",
            targetPlatform: "Instagram Stories",
            contentType: "visual narrative",
          },
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should return text-only output without JSON blocks", async () => {
      const input: StandardAgentInput = {
        input: "حلل وكيّف المحتوى لمنصة YouTube Shorts",
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

  describe("Platform-Specific Adaptation", () => {
    it("should adapt content for social media platforms", async () => {
      const input: StandardAgentInput = {
        input: "كيّف هذا المحتوى لتويتر مع مراعاة حد الأحرف",
        options: {
          enableRAG: true,
          confidenceThreshold: 0.75,
        },
        context: {
          previousStations: {
            targetPlatform: "Twitter",
          },
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it("should adapt content for video platforms", async () => {
      const input: StandardAgentInput = {
        input: "حوّل هذا النص إلى سكريبت فيديو قصير لـ TikTok",
        options: {
          enableSelfCritique: true,
          confidenceThreshold: 0.75,
        },
        context: {
          previousStations: {
            targetPlatform: "TikTok",
            contentType: "short video",
          },
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should handle platform constraints appropriately", async () => {
      const input: StandardAgentInput = {
        input: "كيّف المحتوى مع مراعاة قيود المنصة المستهدفة",
        options: {
          enableConstitutional: true,
          confidenceThreshold: 0.75,
        },
        context: {
          previousStations: {
            targetPlatform: "LinkedIn",
            contentType: "professional",
          },
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();
    });
  });

  describe("Post-Processing", () => {
    it("should clean JSON blocks from output", async () => {
      const input: StandardAgentInput = {
        input: "كيّف المحتوى",
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
        input: "كيّف المحتوى للمنصة",
        options: {
          confidenceThreshold: 0.75,
        },
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result.notes).toBeDefined();

      // Notes should reflect confidence level
      if (result.confidence >= 0.85) {
        expect(result.notes).toContain("عالي الجودة");
      } else if (result.confidence >= 0.7) {
        expect(result.notes).toContain("جيد");
      } else {
        expect(result.notes).toContain("أولي");
      }
    });
  });

  describe("Error Handling", () => {
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
      expect(result.metadata?.error).toBeDefined();
    });

    it("should handle missing context gracefully", async () => {
      const input: StandardAgentInput = {
        input: "كيّف المحتوى",
        options: {},
        context: undefined as any,
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });

  describe("Advanced Options", () => {
    it("should respect all advanced options", async () => {
      const input: StandardAgentInput = {
        input: "كيّف المحتوى بشكل شامل",
        options: {
          enableRAG: true,
          enableSelfCritique: true,
          enableConstitutional: true,
          enableUncertainty: true,
          enableHallucination: true,
          enableDebate: true,

          confidenceThreshold: 0.8,
          temperature: 0.7,
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
  });
});
