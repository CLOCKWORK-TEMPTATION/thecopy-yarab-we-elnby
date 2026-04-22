import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConflictDynamicsAgent } from "./ConflictDynamicsAgent";
import { StandardAgentInput } from "../shared/standardAgentPattern";
import { TaskType } from "@core/enums";

vi.mock("../../services/geminiService", () => ({
  geminiService: {
    generateContent: vi
      .fn()
      .mockResolvedValue("Mock AI response for conflict dynamics analysis"),
  },
}));

describe("ConflictDynamicsAgent", () => {
  let agent: ConflictDynamicsAgent;

  beforeEach(() => {
    agent = new ConflictDynamicsAgent();
    vi.clearAllMocks();
  });

  describe("Configuration", () => {
    it("should initialize with correct configuration", () => {
      const config = agent.getConfig();
      expect(config.taskType).toBe(TaskType.CONFLICT_DYNAMICS);
      expect(config.supportsRAG).toBe(true);
      expect(config.supportsSelfCritique).toBe(true);
    });
  });

  describe("Success Path", () => {
    it("should execute conflict dynamics analysis successfully", async () => {
      const input: StandardAgentInput = {
        input: "حلل ديناميكيات الصراع في النص",
        options: { enableRAG: true, confidenceThreshold: 0.75 },
        context: { originalText: "نص درامي مع صراعات متعددة" },
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.text).not.toMatch(/```json/);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it("should return text-only output", async () => {
      const input: StandardAgentInput = {
        input: "حلل الصراع",
        options: {},
        context: { originalText: "نص" },
      };
      const result = await agent.executeTask(input);
      expect(result.text).not.toContain("```");
      expect(result.text).not.toMatch(/\{[^}]*"[^"]*":[^}]*\}/);
    });

    it("should identify different conflict types", async () => {
      const input: StandardAgentInput = {
        input: "حدد أنواع الصراعات",
        options: {},
        context: { originalText: "نص مع صراعات داخلية وخارجية" },
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });

  describe("Low Confidence Path", () => {
    it("should handle uncertainty in conflict detection", async () => {
      const input: StandardAgentInput = {
        input: "حلل الصراع",
        options: { enableUncertainty: true, confidenceThreshold: 0.9 },
        context: { originalText: "نص بصراع غامض" },
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();
    });
  });

  describe("Integration with Standard Pattern", () => {
    it("should execute full pipeline", async () => {
      const input: StandardAgentInput = {
        input: "حلل ديناميكيات الصراع بشكل شامل",
        options: {
          enableRAG: true,
          enableSelfCritique: true,
          enableHallucination: true,
        },
        context: { originalText: "نص درامي معقد مع صراعات متشابكة" },
      };
      const result = await agent.executeTask(input);
      expect(result.text).toBeTruthy();
      expect(result.metadata).toBeDefined();
      expect(result.text).not.toContain("```");
    });
  });
});
