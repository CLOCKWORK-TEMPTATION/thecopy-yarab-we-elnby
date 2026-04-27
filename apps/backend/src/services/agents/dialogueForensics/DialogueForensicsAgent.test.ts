import { describe, it, expect, beforeEach, vi } from "vitest";

import { TaskType } from "@core/enums";

import { StandardAgentInput } from "../shared/standardAgentPattern";

import { DialogueForensicsAgent } from "./DialogueForensicsAgent";

const { mockAnalyzeText, mockGenerateText } = vi.hoisted(() => {
  const mockAgentText =
    "نعم\nتحليل تجريبي مفصل يفحص الحوار ووظائفه الدرامية وإيقاعه ومستوى اتساق الأصوات.";
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

describe("DialogueForensicsAgent", () => {
  let agent: DialogueForensicsAgent;

  beforeEach(() => {
    agent = new DialogueForensicsAgent();
    vi.clearAllMocks();
  });

  describe("Configuration", () => {
    it("should initialize with correct configuration", () => {
      const config = agent.getConfig();
      expect(config.taskType).toBe(TaskType.DIALOGUE_FORENSICS);
      expect(config.supportsRAG).toBe(true);
      expect(config.supportsSelfCritique).toBe(true);
    });
  });

  describe("Success Path", () => {
    it("should execute dialogue forensics analysis successfully", async () => {
      const input: StandardAgentInput = {
        input: "حلل الحوارات بشكل تفصيلي",
        options: { enableRAG: true, confidenceThreshold: 0.75 },
        context: { originalText: "نص درامي مع حوارات متنوعة" },
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.text).not.toMatch(/```json/);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it("should return text-only output", async () => {
      const input: StandardAgentInput = {
        input: "حلل الحوار",
        options: {},
        context: { originalText: "نص" },
      };
      const result = await agent.executeTask(input);
      expect(result.text).not.toContain("```");
      expect(result.text).not.toMatch(/\{[^}]*"[^"]*":[^}]*\}/);
    });
  });

  describe("Integration with Standard Pattern", () => {
    it("should execute full pipeline", async () => {
      const input: StandardAgentInput = {
        input: "حلل الحوارات بشكل شامل",
        options: {
          enableRAG: true,
          enableSelfCritique: true,
          enableHallucination: true,
        },
        context: { originalText: "نص درامي مع حوارات معقدة ومتعددة الطبقات" },
      };
      const result = await agent.executeTask(input);
      expect(result.text).toBeTruthy();
      expect(result.metadata).toBeDefined();
      expect(result.text).not.toContain("```");
    });
  });
});
