import { describe, it, expect, vi } from "vitest";
import { buildPrompt } from "./promptBuilder";
import { AIRequest } from "@core/types";
import { TaskType } from "@core/enums";

// Mock the orchestration module
vi.mock("./orchestration", () => ({
  aiAgentOrchestra: {
    getAgentConfig: vi.fn(),
  },
}));

describe("Prompt Builder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildPrompt", () => {
    it("validate-pipeline: should build prompt for analysis task", () => {
      const request: AIRequest = {
        agent: TaskType.ANALYSIS,
        prompt: "Analyze this content",
      };

      const prompt = buildPrompt(request);

      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(0);
      expect(prompt).toContain("Analyze this content");
    });

    it("validate-pipeline: should handle multiple files", () => {
      const request: AIRequest = {
        agent: TaskType.ANALYSIS,
        prompt: "Analyze these files",
        files: [
          { fileName: "file1.txt", sizeBytes: 100 },
          { fileName: "file2.txt", sizeBytes: 200 },
        ],
      };

      const prompt = buildPrompt(request);

      expect(typeof prompt).toBe("string");
      expect(prompt).toContain("file1.txt");
      expect(prompt).toContain("file2.txt");
    });

    it("validate-pipeline: should handle completion tasks with parameters", () => {
      const request: AIRequest = {
        agent: "completion",
        prompt: "Complete this task",
        params: { model: "gpt-4" },
      };

      const prompt = buildPrompt(request);

      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(0);
    });

    it("validate-pipeline: should handle creative tasks", () => {
      const request: AIRequest = {
        agent: "creative",
        prompt: "Generate creative content",
      };

      const prompt = buildPrompt(request);

      expect(typeof prompt).toBe("string");
      expect(prompt).toContain("creative");
    });

    it("validate-pipeline: should handle integrated tasks", () => {
      const request: AIRequest = {
        agent: "integrated",
        prompt: "Process integrated task",
        files: [{ fileName: "data.json", sizeBytes: 500 }],
      };

      const prompt = buildPrompt(request);

      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(0);
    });

    it("should handle tasks with no files gracefully", () => {
      const request: AIRequest = {
        agent: TaskType.ANALYSIS,
        files: [],
        prompt: "Test prompt",
      };

      const prompt = buildPrompt(request);

      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(0);
    });

    it("validate-pipeline: should handle tasks with parameters", () => {
      const request: AIRequest = {
        agent: "test",
        prompt: "Test with parameters",
        parameters: { timeout: 5000, retries: 3 },
      };

      const prompt = buildPrompt(request);

      expect(typeof prompt).toBe("string");
      expect(prompt).toContain("Test with parameters");
    });
  });
});
