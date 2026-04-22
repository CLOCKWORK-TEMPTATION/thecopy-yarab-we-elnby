import { describe, it, expect, vi, beforeEach } from "vitest";
import { callModel, getAPIConfig, isBackendHealthy } from "./apiService";
import type { AIRequest, AIResponse } from "../core/types";

// Mock dependencies
vi.mock("./geminiService", () => ({
  geminiService: {
    analyze: vi.fn(),
  },
}));

vi.mock("./loggerService", () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { geminiService } from "./geminiService";
import { log } from "./loggerService";

describe("APIService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Configuration", () => {
    it("validate-pipeline: should have correct default configuration", () => {
      const config = getAPIConfig();

      expect(config.useBackend).toBe(false);
      expect(config.fallbackToDirect).toBe(true);
      expect(config.healthCheckInterval).toBe(30000);
    });

    it("validate-pipeline: should return copy of config to prevent mutation", () => {
      const config1 = getAPIConfig();
      const config2 = getAPIConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe("Backend Health Status", () => {
    it("validate-pipeline: should report backend as unhealthy by default", () => {
      expect(isBackendHealthy()).toBe(false);
    });

    it("validate-pipeline: should consistently return false for local development", () => {
      expect(isBackendHealthy()).toBe(false);
      expect(isBackendHealthy()).toBe(false);
    });
  });

  describe("Model API Calls", () => {
    describe("Successful Calls", () => {
      it("validate-pipeline: should call gemini service for analysis", async () => {
        const mockRequest: AIRequest = {
          task: "analysis",
          text: "Sample dramatic text",
          selectedAgents: [],
        };

        const mockResponse: AIResponse = {
          result: "Analysis result",
          tokensUsed: 100,
        };

        vi.mocked(geminiService.analyze).mockResolvedValue(mockResponse);

        const result = await callModel(mockRequest);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toEqual(mockResponse);
        }
        expect(geminiService.analyze).toHaveBeenCalledWith(mockRequest);
      });

      it("validate-pipeline: should log info when using direct Gemini API", async () => {
        const mockRequest: AIRequest = {
          task: "creative",
          text: "Creative text",
          selectedAgents: [],
        };

        vi.mocked(geminiService.analyze).mockResolvedValue({
          result: "Result",
          tokensUsed: 50,
        });

        await callModel(mockRequest);

        expect(log.info).toHaveBeenCalledWith(
          "🔄 Using direct Gemini API...",
          null,
          "APIService"
        );
      });

      it("validate-pipeline: should handle complex AI requests", async () => {
        const complexRequest: AIRequest = {
          task: "analysis",
          text: "Complex dramatic text with multiple characters",
          selectedAgents: ["character_analyzer", "plot_analyzer"],
          contextData: {
            previousAnalysis: "Previous results",
            metadata: { genre: "drama" },
          },
        };

        const mockResponse: AIResponse = {
          result: "Complex analysis",
          tokensUsed: 500,
        };

        vi.mocked(geminiService.analyze).mockResolvedValue(mockResponse);

        const result = await callModel(complexRequest);

        expect(result.ok).toBe(true);
        expect(geminiService.analyze).toHaveBeenCalledWith(complexRequest);
      });
    });

    describe("Error Handling", () => {
      it("validate-pipeline: should handle gemini service errors gracefully", async () => {
        const mockRequest: AIRequest = {
          task: "analysis",
          text: "Text",
          selectedAgents: [],
        };

        const error = new Error("API quota exceeded");
        vi.mocked(geminiService.analyze).mockRejectedValue(error);

        const result = await callModel(mockRequest);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.code).toBe("GEMINI_API_ERROR");
          expect(result.error.message).toBe("API quota exceeded");
          expect(result.error.cause).toBe(error);
        }
      });

      it("validate-pipeline: should log errors when API call fails", async () => {
        const mockRequest: AIRequest = {
          task: "analysis",
          text: "Text",
          selectedAgents: [],
        };

        vi.mocked(geminiService.analyze).mockRejectedValue(
          new Error("Network error")
        );

        await callModel(mockRequest);

        expect(log.error).toHaveBeenCalledWith(
          "❌ Gemini API call failed",
          expect.any(Error),
          "APIService"
        );
      });

      it("validate-pipeline: should handle errors without message", async () => {
        const mockRequest: AIRequest = {
          task: "analysis",
          text: "Text",
          selectedAgents: [],
        };

        vi.mocked(geminiService.analyze).mockRejectedValue(new Error());

        const result = await callModel(mockRequest);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toBe("Gemini API call failed");
        }
      });

      it("validate-pipeline: should handle non-Error rejections", async () => {
        const mockRequest: AIRequest = {
          task: "analysis",
          text: "Text",
          selectedAgents: [],
        };

        vi.mocked(geminiService.analyze).mockRejectedValue("String error");

        const result = await callModel(mockRequest);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.code).toBe("GEMINI_API_ERROR");
        }
      });

      it("validate-pipeline: should handle timeout errors", async () => {
        const mockRequest: AIRequest = {
          task: "analysis",
          text: "Text",
          selectedAgents: [],
        };

        const timeoutError = new Error("Request timeout after 30s");
        vi.mocked(geminiService.analyze).mockRejectedValue(timeoutError);

        const result = await callModel(mockRequest);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain("timeout");
        }
      });

      it("validate-pipeline: should handle rate limit errors", async () => {
        const mockRequest: AIRequest = {
          task: "analysis",
          text: "Text",
          selectedAgents: [],
        };

        const rateLimitError = new Error("Rate limit exceeded");
        vi.mocked(geminiService.analyze).mockRejectedValue(rateLimitError);

        const result = await callModel(mockRequest);

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toContain("Rate limit");
        }
      });
    });

    describe("Different Task Types", () => {
      it("validate-pipeline: should handle analysis tasks", async () => {
        const request: AIRequest = {
          task: "analysis",
          text: "Dramatic text for analysis",
          selectedAgents: ["thematic_analyzer"],
        };

        vi.mocked(geminiService.analyze).mockResolvedValue({
          result: "Thematic analysis",
          tokensUsed: 200,
        });

        const result = await callModel(request);

        expect(result.ok).toBe(true);
      });

      it("validate-pipeline: should handle creative tasks", async () => {
        const request: AIRequest = {
          task: "creative",
          text: "Base text for creative development",
          selectedAgents: ["scene_generator"],
        };

        vi.mocked(geminiService.analyze).mockResolvedValue({
          result: "Creative output",
          tokensUsed: 300,
        });

        const result = await callModel(request);

        expect(result.ok).toBe(true);
      });

      it("validate-pipeline: should handle completion tasks", async () => {
        const request: AIRequest = {
          task: "completion",
          text: "Incomplete text...",
          selectedAgents: ["completion_agent"],
        };

        vi.mocked(geminiService.analyze).mockResolvedValue({
          result: "Completed text",
          tokensUsed: 150,
        });

        const result = await callModel(request);

        expect(result.ok).toBe(true);
      });
    });

    describe("Edge Cases", () => {
      it("validate-pipeline: should handle empty text", async () => {
        const request: AIRequest = {
          task: "analysis",
          text: "",
          selectedAgents: [],
        };

        vi.mocked(geminiService.analyze).mockResolvedValue({
          result: "Empty input analysis",
          tokensUsed: 10,
        });

        const result = await callModel(request);

        expect(result.ok).toBe(true);
        expect(geminiService.analyze).toHaveBeenCalledWith(request);
      });

      it("validate-pipeline: should handle very long text", async () => {
        const longText = "a".repeat(100000);
        const request: AIRequest = {
          task: "analysis",
          text: longText,
          selectedAgents: [],
        };

        vi.mocked(geminiService.analyze).mockResolvedValue({
          result: "Long text analysis",
          tokensUsed: 5000,
        });

        const result = await callModel(request);

        expect(result.ok).toBe(true);
      });

      it("validate-pipeline: should handle special characters", async () => {
        const request: AIRequest = {
          task: "analysis",
          text: "Text with special chars: @#$%^&*()",
          selectedAgents: [],
        };

        vi.mocked(geminiService.analyze).mockResolvedValue({
          result: "Analysis",
          tokensUsed: 50,
        });

        const result = await callModel(request);

        expect(result.ok).toBe(true);
      });

      it("validate-pipeline: should handle Arabic text", async () => {
        const request: AIRequest = {
          task: "analysis",
          text: "نص درامي عربي متكامل",
          selectedAgents: [],
        };

        vi.mocked(geminiService.analyze).mockResolvedValue({
          result: "تحليل",
          tokensUsed: 75,
        });

        const result = await callModel(request);

        expect(result.ok).toBe(true);
      });

      it("validate-pipeline: should handle requests with no selected agents", async () => {
        const request: AIRequest = {
          task: "analysis",
          text: "Text",
          selectedAgents: [],
        };

        vi.mocked(geminiService.analyze).mockResolvedValue({
          result: "Result",
          tokensUsed: 50,
        });

        const result = await callModel(request);

        expect(result.ok).toBe(true);
      });

      it("validate-pipeline: should handle requests with multiple agents", async () => {
        const request: AIRequest = {
          task: "analysis",
          text: "Text",
          selectedAgents: ["agent1", "agent2", "agent3"],
        };

        vi.mocked(geminiService.analyze).mockResolvedValue({
          result: "Multi-agent result",
          tokensUsed: 200,
        });

        const result = await callModel(request);

        expect(result.ok).toBe(true);
      });
    });
  });

  describe("Singleton Pattern", () => {
    it("validate-pipeline: should maintain same configuration across calls", () => {
      const config1 = getAPIConfig();
      const config2 = getAPIConfig();

      // Should be equal but not same reference
      expect(config1).toEqual(config2);
    });

    it("validate-pipeline: should maintain backend health state", () => {
      const health1 = isBackendHealthy();
      const health2 = isBackendHealthy();

      expect(health1).toBe(health2);
    });
  });

  describe("Result Type Structure", () => {
    it("validate-pipeline: should return proper ok result structure", async () => {
      const mockRequest: AIRequest = {
        task: "analysis",
        text: "Text",
        selectedAgents: [],
      };

      vi.mocked(geminiService.analyze).mockResolvedValue({
        result: "Result",
        tokensUsed: 100,
      });

      const result = await callModel(mockRequest);

      expect(result).toHaveProperty("ok");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result).toHaveProperty("value");
        expect(result.value).toHaveProperty("result");
        expect(result.value).toHaveProperty("tokensUsed");
      }
    });

    it("validate-pipeline: should return proper error result structure", async () => {
      const mockRequest: AIRequest = {
        task: "analysis",
        text: "Text",
        selectedAgents: [],
      };

      vi.mocked(geminiService.analyze).mockRejectedValue(
        new Error("Test error")
      );

      const result = await callModel(mockRequest);

      expect(result).toHaveProperty("ok");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result).toHaveProperty("error");
        expect(result.error).toHaveProperty("code");
        expect(result.error).toHaveProperty("message");
        expect(result.error).toHaveProperty("cause");
      }
    });
  });
});
