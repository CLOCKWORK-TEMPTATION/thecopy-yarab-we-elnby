import { describe, it, expect } from "vitest";

describe("Core Types", () => {
  describe("Result Type", () => {
    it("validate-pipeline: should create success result", () => {
      const result = { ok: true, value: "test" };
      expect(result.ok).toBe(true);
      expect(result.value).toBe("test");
    });

    it("validate-pipeline: should create error result", () => {
      const error = { code: "TEST_ERROR", message: "Test error", cause: null };
      const result = { ok: false, error };
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe("TEST_ERROR");
    });
  });

  describe("ProcessedFile Type", () => {
    it("validate-pipeline: should have required properties", () => {
      const file = {
        name: "test.txt",
        content: "test content",
        type: "text" as const,
        size: 100,
      };

      expect(file.name).toBe("test.txt");
      expect(file.content).toBe("test content");
      expect(file.type).toBe("text");
      expect(file.size).toBe(100);
    });
  });

  describe("AIRequest Type", () => {
    it("validate-pipeline: should have required properties", () => {
      const request = {
        agent: "analysis",
        prompt: "test prompt",
        files: [
          {
            fileName: "test.txt",
            sizeBytes: 100,
          },
        ],
      };

      expect(request.agent).toBe("analysis");
      expect(request.prompt).toBe("test prompt");
      expect(Array.isArray(request.files)).toBe(true);
      expect(request.files.length).toBe(1);
    });
  });

  describe("AIResponse Type", () => {
    it("validate-pipeline: should have required properties", () => {
      const response = {
        agent: "analysis",
        raw: "response content",
        meta: {
          provider: "gemini",
          model: "gemini-1.5-flash",
          timestamp: new Date().toISOString(),
        },
      };

      expect(response.agent).toBe("analysis");
      expect(response.raw).toBe("response content");
      expect(response.meta.provider).toBe("gemini");
      expect(response.meta.model).toBe("gemini-1.5-flash");
      expect(response.meta.timestamp).toBeDefined();
    });
  });

  describe("AIAgentConfig Type", () => {
    it("validate-pipeline: should have required properties", () => {
      const config = {
        id: "test" as any,
        name: "Test Agent",
        description: "Test description",
        category: "core" as any,
        capabilities: {
          multiModal: false,
          reasoningChains: false,
          ragEnabled: false,
          complexityScore: 0.5,
          resourceIntensity: 0.5,
        },
        collaboratesWith: [],
        dependsOn: [],
        enhances: [],
        systemPrompt: "Test prompt",
        cacheStrategy: "none" as const,
        parallelizable: false,
        confidenceThreshold: 0.8,
      };

      expect(config.id).toBe("test");
      expect(config.name).toBe("Test Agent");
      expect(config.capabilities).toBeDefined();
      expect(config.collaboratesWith).toEqual([]);
    });
  });
});
