import { describe, it, expect, beforeEach, vi } from "vitest";
import { ThematicMiningAgent } from "./ThematicMiningAgent";
import { StandardAgentInput } from "../shared/standardAgentPattern";
import { TaskType } from "@core/enums";

vi.mock("../../services/geminiService", () => ({
  geminiService: {
    generateContent: vi
      .fn()
      .mockResolvedValue("Mock AI response for thematic mining analysis"),
  },
}));

describe("ThematicMiningAgent", () => {
  let agent: ThematicMiningAgent;

  beforeEach(() => {
    agent = new ThematicMiningAgent();
    vi.clearAllMocks();
  });

  describe("Configuration", () => {
    it("should initialize with correct configuration", () => {
      const config = agent.getConfig();
      expect(config.taskType).toBe(TaskType.THEMATIC_MINING);
      expect(config.supportsRAG).toBe(true);
      expect(config.supportsSelfCritique).toBe(true);
    });
  });

  describe("Success Path", () => {
    it("should execute thematic mining analysis successfully", async () => {
      const input: StandardAgentInput = {
        input: "استخرج وحلل الثيمات في النص",
        options: { enableRAG: true, confidenceThreshold: 0.75 },
        context: { originalText: "نص درامي غني بالثيمات" },
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.text).not.toMatch(/```json/);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it("should return text-only output", async () => {
      const input: StandardAgentInput = {
        input: "استخرج الثيمات",
        options: {},
        context: { originalText: "نص" },
      };
      const result = await agent.executeTask(input);
      expect(result.text).not.toContain("```");
      expect(result.text).not.toMatch(/\{[^}]*"[^"]*":[^}]*\}/);
    });

    it("should identify primary and secondary themes", async () => {
      const input: StandardAgentInput = {
        input: "حدد الثيمات الرئيسية والفرعية",
        options: {},
        context: { originalText: "نص مع ثيمات متعددة الطبقات" },
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });

  describe("Low Confidence Path", () => {
    it("should handle uncertainty in theme detection", async () => {
      const input: StandardAgentInput = {
        input: "استخرج الثيمات",
        options: { enableUncertainty: true, confidenceThreshold: 0.9 },
        context: { originalText: "نص بثيمات ضمنية" },
      };
      const result = await agent.executeTask(input);
      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();
    });
  });

  describe("Integration with Standard Pattern", () => {
    it("should execute full pipeline", async () => {
      const input: StandardAgentInput = {
        input: "استخرج وحلل الثيمات بشكل شامل",
        options: {
          enableRAG: true,
          enableSelfCritique: true,
          enableHallucination: true,
        },
        context: { originalText: "نص أدبي معقد مع ثيمات فلسفية وأخلاقية" },
      };
      const result = await agent.executeTask(input);
      expect(result.text).toBeTruthy();
      expect(result.metadata).toBeDefined();
      expect(result.text).not.toContain("```");
    });
  });
});
