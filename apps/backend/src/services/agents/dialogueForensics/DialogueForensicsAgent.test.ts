import { describe, it, expect, beforeEach, vi } from "vitest";
import { DialogueForensicsAgent } from "./DialogueForensicsAgent";
import { StandardAgentInput } from "../shared/standardAgentPattern";
import { TaskType } from "@core/enums";

vi.mock("../../services/geminiService", () => ({
  geminiService: {
    generateContent: vi
      .fn()
      .mockResolvedValue("Mock AI response for dialogue forensics analysis"),
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
