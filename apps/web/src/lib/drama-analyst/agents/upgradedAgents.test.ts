import { describe, it, expect, beforeEach, vi } from "vitest";

import { TaskType } from "@core/enums";

import { StandardAgentInput } from "./shared/standardAgentPattern";
import {
  executeAgentTask,
  isAgentUpgraded,
  getAgentConfig,
  getUpgradedAgents,
  batchExecuteAgentTasks,
  getAgentStatistics,
  completionAgent,
  creativeAgent,
  characterVoiceAgent,
} from "./upgradedAgents";

// Mock the geminiService
vi.mock("../services/geminiService", () => ({
  geminiService: {
    generateContent: vi.fn().mockResolvedValue("نص تجريبي من النموذج"),
  },
}));

// Mock the standard pattern execution
vi.mock("./shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: vi.fn().mockResolvedValue({
    text: "نص ناتج من النمط القياسي",
    confidence: 0.85,
    notes: "تم التنفيذ بنجاح",
    metadata: {
      processingTime: 1000,
      tokensUsed: 500,
      modelUsed: "gemini-2.5-flash",
      timestamp: new Date().toISOString(),
    },
  }),
}));

describe("Upgraded Agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Agent Registration", () => {
    it("should have completion agent registered", () => {
      expect(isAgentUpgraded(TaskType.COMPLETION)).toBe(true);
    });

    it("should have creative agent registered", () => {
      expect(isAgentUpgraded(TaskType.CREATIVE)).toBe(true);
    });

    it("should have character voice agent registered", () => {
      expect(isAgentUpgraded(TaskType.CHARACTER_VOICE)).toBe(true);
    });

    it("should return false for non-upgraded agents", () => {
      // Using a non-existent task type
      const fakeTaskType = 9999 as TaskType;
      expect(isAgentUpgraded(fakeTaskType)).toBe(false);
    });

    it("should return list of upgraded agents", () => {
      const upgradedAgents = getUpgradedAgents();
      expect(Array.isArray(upgradedAgents)).toBe(true);
      expect(upgradedAgents.length).toBeGreaterThan(0);
      expect(upgradedAgents).toContain(TaskType.COMPLETION);
    });
  });

  describe("Agent Configuration", () => {
    it("should get config for completion agent", () => {
      const config = getAgentConfig(TaskType.COMPLETION);
      expect(config).toBeDefined();
      expect(config?.name).toBe("NarrativeContinuum AI");
      expect(config?.taskType).toBe(TaskType.COMPLETION);
      expect(config?.supportsRAG).toBe(true);
    });

    it("should get config for creative agent", () => {
      const config = getAgentConfig(TaskType.CREATIVE);
      expect(config).toBeDefined();
      expect(config?.supportsRAG).toBe(true);
    });

    it("should return null for non-upgraded agent", () => {
      const fakeTaskType = 9999 as TaskType;
      const config = getAgentConfig(fakeTaskType);
      expect(config).toBeNull();
    });
  });

  describe("Agent Execution", () => {
    const testInput: StandardAgentInput = {
      input: "نص تجريبي للمعالجة",
      options: {
        enableRAG: true,
        enableSelfCritique: true,
        enableConstitutional: true,
        enableUncertainty: false,
        enableHallucination: false,
        enableDebate: false,
      },
      context: {
        originalText: "النص الأصلي",
        analysisReport: { summary: "تقرير التحليل" },
      },
    };

    it("should execute completion agent task successfully", async () => {
      const result = await executeAgentTask(TaskType.COMPLETION, testInput);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(typeof result.text).toBe("string");
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.notes).toBeTruthy();
      expect(result.metadata).toBeDefined();
    });

    it("should execute creative agent task successfully", async () => {
      const result = await executeAgentTask(TaskType.CREATIVE, testInput);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(typeof result.text).toBe("string");
      expect(result.confidence).toBeDefined();
    });

    it("should execute character voice agent task successfully", async () => {
      const result = await executeAgentTask(
        TaskType.CHARACTER_VOICE,
        testInput
      );

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(typeof result.text).toBe("string");
    });

    it("should return fallback for non-upgraded agent", async () => {
      const fakeTaskType = 9999 as TaskType;
      const result = await executeAgentTask(fakeTaskType, testInput);

      expect(result).toBeDefined();
      expect(result.text).toContain("لم يتم ترقيته");
      expect(result.confidence).toBe(0);
    });

    it("should handle execution errors gracefully", async () => {
      // Mock an error
      vi.spyOn(completionAgent, "executeTask").mockRejectedValueOnce(
        new Error("Test error")
      );

      const result = await executeAgentTask(TaskType.COMPLETION, testInput);

      expect(result).toBeDefined();
      expect(result.confidence).toBe(0);
      expect(result.text).toContain("حدث خطأ");
      expect(result.metadata?.["error"]).toBe(true);
    });
  });

  describe("Batch Execution", () => {
    it("should execute multiple tasks in batch", async () => {
      const tasks = [
        {
          taskType: TaskType.COMPLETION,
          input: {
            input: "مهمة 1",
            options: {},
            context: {},
          },
        },
        {
          taskType: TaskType.CREATIVE,
          input: {
            input: "مهمة 2",
            options: {},
            context: {},
          },
        },
      ];

      const results = await batchExecuteAgentTasks(tasks);

      expect(results).toHaveLength(2);
      expect(results[0].text).toBeTruthy();
      expect(results[1].text).toBeTruthy();
    });

    it("should handle partial failures in batch execution", async () => {
      const tasks = [
        {
          taskType: TaskType.COMPLETION,
          input: {
            input: "مهمة صحيحة",
            options: {},
            context: {},
          },
        },
        {
          taskType: 9999 as TaskType,
          input: {
            input: "مهمة خاطئة",
            options: {},
            context: {},
          },
        },
      ];

      const results = await batchExecuteAgentTasks(tasks);

      expect(results).toHaveLength(2);
      expect(results[0].text).toBeTruthy();
      expect(results[1].confidence).toBe(0);
    });
  });

  describe("Agent Statistics", () => {
    it("should return correct statistics", () => {
      const stats = getAgentStatistics();

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.upgraded).toBeGreaterThanOrEqual(0);
      expect(stats.remaining).toBeGreaterThanOrEqual(0);
      expect(stats.percentage).toBeGreaterThanOrEqual(0);
      expect(stats.percentage).toBeLessThanOrEqual(100);
      expect(Array.isArray(stats.upgradedAgents)).toBe(true);
      expect(Array.isArray(stats.remainingAgents)).toBe(true);
    });
  });

  describe("Text-Only Output", () => {
    it("should never return JSON in output", async () => {
      const result = await executeAgentTask(TaskType.COMPLETION, {
        input: "اختبار",
        options: {},
        context: {},
      });

      // Check that output doesn't contain JSON artifacts
      expect(result.text).not.toContain("```json");
      expect(result.text).not.toContain('"result":');
      expect(result.text).not.toContain('"confidence":');

      // Text should be plain Arabic text
      expect(typeof result.text).toBe("string");
    });
  });

  describe("Standard Pattern Integration", () => {
    it("should apply all enhancement options when enabled", async () => {
      const input: StandardAgentInput = {
        input: "نص مع جميع الخيارات",
        options: {
          enableRAG: true,
          enableSelfCritique: true,
          enableConstitutional: true,
          enableUncertainty: true,
          enableHallucination: true,
          enableDebate: true,
        },
        context: {},
      };

      const result = await executeAgentTask(TaskType.COMPLETION, input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should respect confidence floor settings", async () => {
      // Set a high confidence floor
      completionAgent.setConfidenceFloor(0.9);

      const result = await executeAgentTask(TaskType.COMPLETION, {
        input: "نص",
        options: { confidenceThreshold: 0.9 },
        context: {},
      });

      expect(result).toBeDefined();
      // The confidence floor should influence the output
      expect(completionAgent.getConfig().confidenceFloor).toBe(0.9);
    });
  });

  describe("Fallback Handling", () => {
    it("should provide graceful fallback on critical failure", async () => {
      // Mock complete failure
      vi.spyOn(completionAgent, "executeTask").mockImplementationOnce(() => {
        throw new Error("Critical failure");
      });

      const result = await executeAgentTask(TaskType.COMPLETION, {
        input: "test",
        options: {},
        context: {},
      });

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.text).not.toBe(""); // Should have fallback text
      expect(result.confidence).toBe(0);
      expect(result.notes).toContain("Critical failure");
    });
  });
});

describe("Individual Agent Tests", () => {
  describe("CompletionAgent", () => {
    it("should handle completion scope correctly", async () => {
      const result = await completionAgent.executeTask({
        input: "أكمل هذه القصة",
        options: {},
        context: {
          originalText: "كان يا ما كان...",
          completionScope: "paragraph",
        },
      });

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.metadata).toBeDefined();
    });

    it("should handle enhancements properly", async () => {
      const result = await completionAgent.executeTask({
        input: "أكمل",
        options: {},
        context: {
          originalText: "النص",
          enhancements: ["style_fingerprint", "character_voice"],
        },
      });

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });

  describe("CreativeAgent", () => {
    it("should handle development focus correctly", async () => {
      const result = await creativeAgent.executeTask({
        input: "طور قصة جديدة",
        options: {},
        context: {
          developmentFocus: "character",
        },
      });

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });

  describe("CharacterVoiceAgent", () => {
    it("should generate character-appropriate dialogue", async () => {
      const result = await characterVoiceAgent.executeTask({
        input: "أنشئ حوار بصوت الشخصية",
        options: {},
        context: {
          characterProfile: "بطل درامي قوي",
        },
      });

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });
});
