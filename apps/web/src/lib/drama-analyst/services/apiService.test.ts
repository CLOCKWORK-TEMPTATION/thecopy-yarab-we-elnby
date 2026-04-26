import { beforeEach, describe, expect, it, vi } from "vitest";

import { callModel, getAPIConfig, isBackendHealthy } from "./apiService";
import { geminiService } from "./geminiService";
import { log } from "./loggerService";

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

type CallModelResult = Awaited<ReturnType<typeof callModel>>;

const mockedGeminiService = vi.mocked(geminiService);
const mockedLog = vi.mocked(log);

const analyzeMock = (): typeof mockedGeminiService.analyze =>
  Reflect.get(mockedGeminiService, "analyze");
const logInfoMock = (): typeof mockedLog.info => Reflect.get(mockedLog, "info");
const logErrorMock = (): typeof mockedLog.error =>
  Reflect.get(mockedLog, "error");

function expectOkResult(result: CallModelResult) {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`Expected ok result, received ${result.error.message}`);
  }
  return result;
}

function expectErrorResult(result: CallModelResult) {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error("Expected error result");
  }
  return result;
}

describe("APIService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  registerConfigurationTests();
  registerBackendHealthStatusTests();
  registerModelApiCallTests();
  registerSingletonPatternTests();
  registerResultTypeStructureTests();
});

function registerConfigurationTests(): void {
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
}

function registerBackendHealthStatusTests(): void {
  describe("Backend Health Status", () => {
    it("validate-pipeline: should report backend as unhealthy by default", () => {
      expect(isBackendHealthy()).toBe(false);
    });

    it("validate-pipeline: should consistently return false for local development", () => {
      expect(isBackendHealthy()).toBe(false);
      expect(isBackendHealthy()).toBe(false);
    });
  });
}

function registerModelApiCallTests(): void {
  describe("Model API Calls", () => {
    registerSuccessfulCallTests();
    registerErrorHandlingTests();
    registerDifferentTaskTypeTests();
    registerEdgeCaseTests();
  });
}

function registerSuccessfulCallTests(): void {
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

      analyzeMock().mockResolvedValue(mockResponse);

      const result = await callModel(mockRequest);
      const okResult = expectOkResult(result);

      expect(okResult.value).toEqual(mockResponse);
      expect(analyzeMock()).toHaveBeenCalledWith(mockRequest);
    });

    it("validate-pipeline: should log info when using direct Gemini API", async () => {
      const mockRequest: AIRequest = {
        task: "creative",
        text: "Creative text",
        selectedAgents: [],
      };

      analyzeMock().mockResolvedValue({
        result: "Result",
        tokensUsed: 50,
      });

      await callModel(mockRequest);

      expect(logInfoMock()).toHaveBeenCalledWith(
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

      analyzeMock().mockResolvedValue(mockResponse);

      const result = await callModel(complexRequest);

      expectOkResult(result);
      expect(analyzeMock()).toHaveBeenCalledWith(complexRequest);
    });
  });
}

function registerErrorHandlingTests(): void {
  describe("Error Handling", () => {
    it("validate-pipeline: should handle gemini service errors gracefully", async () => {
      const mockRequest: AIRequest = {
        task: "analysis",
        text: "Text",
        selectedAgents: [],
      };

      const error = new Error("API quota exceeded");
      analyzeMock().mockRejectedValue(error);

      const result = await callModel(mockRequest);
      const errorResult = expectErrorResult(result);

      expect(errorResult.error.code).toBe("GEMINI_API_ERROR");
      expect(errorResult.error.message).toBe("API quota exceeded");
      expect(errorResult.error.cause).toBe(error);
    });

    it("validate-pipeline: should log errors when API call fails", async () => {
      const mockRequest: AIRequest = {
        task: "analysis",
        text: "Text",
        selectedAgents: [],
      };

      analyzeMock().mockRejectedValue(new Error("Network error"));

      await callModel(mockRequest);

      expect(logErrorMock()).toHaveBeenCalledWith(
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

      analyzeMock().mockRejectedValue(new Error());

      const result = await callModel(mockRequest);
      const errorResult = expectErrorResult(result);

      expect(errorResult.error.message).toBe("Gemini API call failed");
    });

    it("validate-pipeline: should handle non-Error rejections", async () => {
      const mockRequest: AIRequest = {
        task: "analysis",
        text: "Text",
        selectedAgents: [],
      };

      analyzeMock().mockRejectedValue("String error");

      const result = await callModel(mockRequest);
      const errorResult = expectErrorResult(result);

      expect(errorResult.error.code).toBe("GEMINI_API_ERROR");
    });

    it("validate-pipeline: should handle timeout errors", async () => {
      const mockRequest: AIRequest = {
        task: "analysis",
        text: "Text",
        selectedAgents: [],
      };

      const timeoutError = new Error("Request timeout after 30s");
      analyzeMock().mockRejectedValue(timeoutError);

      const result = await callModel(mockRequest);
      const errorResult = expectErrorResult(result);

      expect(errorResult.error.message).toContain("timeout");
    });

    it("validate-pipeline: should handle rate limit errors", async () => {
      const mockRequest: AIRequest = {
        task: "analysis",
        text: "Text",
        selectedAgents: [],
      };

      const rateLimitError = new Error("Rate limit exceeded");
      analyzeMock().mockRejectedValue(rateLimitError);

      const result = await callModel(mockRequest);
      const errorResult = expectErrorResult(result);

      expect(errorResult.error.message).toContain("Rate limit");
    });
  });
}

function registerDifferentTaskTypeTests(): void {
  describe("Different Task Types", () => {
    it("validate-pipeline: should handle analysis tasks", async () => {
      const request: AIRequest = {
        task: "analysis",
        text: "Dramatic text for analysis",
        selectedAgents: ["thematic_analyzer"],
      };

      analyzeMock().mockResolvedValue({
        result: "Thematic analysis",
        tokensUsed: 200,
      });

      expect(expectOkResult(await callModel(request)).ok).toBe(true);
    });

    it("validate-pipeline: should handle creative tasks", async () => {
      const request: AIRequest = {
        task: "creative",
        text: "Base text for creative development",
        selectedAgents: ["scene_generator"],
      };

      analyzeMock().mockResolvedValue({
        result: "Creative output",
        tokensUsed: 300,
      });

      expect(expectOkResult(await callModel(request)).ok).toBe(true);
    });

    it("validate-pipeline: should handle completion tasks", async () => {
      const request: AIRequest = {
        task: "completion",
        text: "Incomplete text...",
        selectedAgents: ["completion_agent"],
      };

      analyzeMock().mockResolvedValue({
        result: "Completed text",
        tokensUsed: 150,
      });

      expect(expectOkResult(await callModel(request)).ok).toBe(true);
    });
  });
}

function registerEdgeCaseTests(): void {
  describe("Edge Cases", () => {
    it("validate-pipeline: should handle empty text", async () => {
      const request: AIRequest = {
        task: "analysis",
        text: "",
        selectedAgents: [],
      };

      analyzeMock().mockResolvedValue({
        result: "Empty input analysis",
        tokensUsed: 10,
      });

      const result = await callModel(request);

      expectOkResult(result);
      expect(analyzeMock()).toHaveBeenCalledWith(request);
    });

    it("validate-pipeline: should handle very long text", async () => {
      const longText = "a".repeat(100000);
      const request: AIRequest = {
        task: "analysis",
        text: longText,
        selectedAgents: [],
      };

      analyzeMock().mockResolvedValue({
        result: "Long text analysis",
        tokensUsed: 5000,
      });

      expect(expectOkResult(await callModel(request)).ok).toBe(true);
    });

    it("validate-pipeline: should handle special characters", async () => {
      const request: AIRequest = {
        task: "analysis",
        text: "Text with special chars: @#$%^&*()",
        selectedAgents: [],
      };

      analyzeMock().mockResolvedValue({
        result: "Analysis",
        tokensUsed: 50,
      });

      expect(expectOkResult(await callModel(request)).ok).toBe(true);
    });

    it("validate-pipeline: should handle Arabic text", async () => {
      const request: AIRequest = {
        task: "analysis",
        text: "نص درامي عربي متكامل",
        selectedAgents: [],
      };

      analyzeMock().mockResolvedValue({
        result: "تحليل",
        tokensUsed: 75,
      });

      expect(expectOkResult(await callModel(request)).ok).toBe(true);
    });

    it("validate-pipeline: should handle requests with no selected agents", async () => {
      const request: AIRequest = {
        task: "analysis",
        text: "Text",
        selectedAgents: [],
      };

      analyzeMock().mockResolvedValue({
        result: "Result",
        tokensUsed: 50,
      });

      expect(expectOkResult(await callModel(request)).ok).toBe(true);
    });

    it("validate-pipeline: should handle requests with multiple agents", async () => {
      const request: AIRequest = {
        task: "analysis",
        text: "Text",
        selectedAgents: ["agent1", "agent2", "agent3"],
      };

      analyzeMock().mockResolvedValue({
        result: "Multi-agent result",
        tokensUsed: 200,
      });

      expect(expectOkResult(await callModel(request)).ok).toBe(true);
    });
  });
}

function registerSingletonPatternTests(): void {
  describe("Singleton Pattern", () => {
    it("validate-pipeline: should maintain same configuration across calls", () => {
      const config1 = getAPIConfig();
      const config2 = getAPIConfig();

      expect(config1).toEqual(config2);
    });

    it("validate-pipeline: should maintain backend health state", () => {
      const health1 = isBackendHealthy();
      const health2 = isBackendHealthy();

      expect(health1).toBe(health2);
    });
  });
}

function registerResultTypeStructureTests(): void {
  describe("Result Type Structure", () => {
    it("validate-pipeline: should return proper ok result structure", async () => {
      const mockRequest: AIRequest = {
        task: "analysis",
        text: "Text",
        selectedAgents: [],
      };

      analyzeMock().mockResolvedValue({
        result: "Result",
        tokensUsed: 100,
      });

      const result = await callModel(mockRequest);
      const okResult = expectOkResult(result);

      expect(okResult).toHaveProperty("ok");
      expect(okResult).toHaveProperty("value");
      expect(okResult.value).toHaveProperty("result");
      expect(okResult.value).toHaveProperty("tokensUsed");
    });

    it("validate-pipeline: should return proper error result structure", async () => {
      const mockRequest: AIRequest = {
        task: "analysis",
        text: "Text",
        selectedAgents: [],
      };

      analyzeMock().mockRejectedValue(new Error("Test error"));

      const result = await callModel(mockRequest);
      const errorResult = expectErrorResult(result);

      expect(errorResult).toHaveProperty("ok");
      expect(errorResult).toHaveProperty("error");
      expect(errorResult.error).toHaveProperty("code");
      expect(errorResult.error).toHaveProperty("message");
      expect(errorResult.error).toHaveProperty("cause");
    });
  });
}
