/**
 * Upgraded Agents Tests
 * اختبارات شاملة للوكلاء المُحدّثة
 *
 * يتحقق من:
 * - تسجيل جميع الوكلاء في UPGRADED_AGENTS map
 * - تنفيذ المهام عبر executeAgentTask
 * - التحقق من isAgentUpgraded
 * - الحصول على قائمة الوكلاء عبر getUpgradedAgents
 * - إحصائيات الوكلاء عبر getAgentStatistics
 * - التنفيذ المُجمّع batchExecuteAgentTasks
 * - التعامل مع الأخطاء والحالات الحدية
 */

import { describe, expect, it, vi } from "vitest";

import { TaskType } from "@core/types";

// ═══ Mock dependencies ═══
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import after mocks
import {
  UPGRADED_AGENTS,
  AGENTS_TO_UPGRADE,
  analysisAgent,
  batchExecuteAgentTasks,
  completionAgent,
  creativeAgent,
  executeAgentTask,
  getAgentConfig,
  getAgentStatistics,
  getUpgradedAgents,
  integratedAgent,
  isAgentUpgraded,
} from "./upgradedAgents";

// ═══ Test Suite ═══
describe("UPGRADED_AGENTS registry", () => {
  it("should contain all 27 upgraded agents", () => {
    expect(UPGRADED_AGENTS.size).toBe(27);
  });

  it("should map TaskType.COMPLETION to completion agent", () => {
    const agent = UPGRADED_AGENTS.get(TaskType.COMPLETION);
    expect(agent).toBeDefined();
    expect(agent).toBe(completionAgent);
  });

  it("should map TaskType.CREATIVE to creative agent", () => {
    const agent = UPGRADED_AGENTS.get(TaskType.CREATIVE);
    expect(agent).toBeDefined();
    expect(agent).toBe(creativeAgent);
  });

  it("should map TaskType.ANALYSIS to analysis agent", () => {
    const agent = UPGRADED_AGENTS.get(TaskType.ANALYSIS);
    expect(agent).toBeDefined();
    expect(agent).toBe(analysisAgent);
  });

  it("should map TaskType.INTEGRATED to integrated agent", () => {
    const agent = UPGRADED_AGENTS.get(TaskType.INTEGRATED);
    expect(agent).toBeDefined();
    expect(agent).toBe(integratedAgent);
  });

  it("should map all 7 new platform agents", () => {
    expect(UPGRADED_AGENTS.get(TaskType.PLATFORM_ADAPTER)).toBeDefined();
    expect(UPGRADED_AGENTS.get(TaskType.CHARACTER_DEEP_ANALYZER)).toBeDefined();
    expect(
      UPGRADED_AGENTS.get(TaskType.DIALOGUE_ADVANCED_ANALYZER),
    ).toBeDefined();
    expect(
      UPGRADED_AGENTS.get(TaskType.THEMES_MESSAGES_ANALYZER),
    ).toBeDefined();
    expect(
      UPGRADED_AGENTS.get(TaskType.CULTURAL_HISTORICAL_ANALYZER),
    ).toBeDefined();
    expect(
      UPGRADED_AGENTS.get(TaskType.VISUAL_CINEMATIC_ANALYZER),
    ).toBeDefined();
    expect(UPGRADED_AGENTS.get(TaskType.PRODUCIBILITY_ANALYZER)).toBeDefined();
  });

  it("should map all 4 remaining agents", () => {
    expect(UPGRADED_AGENTS.get(TaskType.AUDIENCE_RESONANCE)).toBeDefined();
    expect(
      UPGRADED_AGENTS.get(TaskType.TARGET_AUDIENCE_ANALYZER),
    ).toBeDefined();
    expect(
      UPGRADED_AGENTS.get(TaskType.LITERARY_QUALITY_ANALYZER),
    ).toBeDefined();
    expect(
      UPGRADED_AGENTS.get(TaskType.RECOMMENDATIONS_GENERATOR),
    ).toBeDefined();
  });
});

describe("isAgentUpgraded", () => {
  it("should return true for upgraded agents", () => {
    expect(isAgentUpgraded(TaskType.COMPLETION)).toBe(true);
    expect(isAgentUpgraded(TaskType.CREATIVE)).toBe(true);
    expect(isAgentUpgraded(TaskType.ANALYSIS)).toBe(true);
  });

  it("should return false for non-existent task types", () => {
    // @ts-expect-error Testing invalid input
    expect(isAgentUpgraded("non-existent-type")).toBe(false);
  });

  it("should return true for all 27 registered agents", () => {
    const allAgents = Array.from(UPGRADED_AGENTS.keys());
    allAgents.forEach((taskType) => {
      expect(isAgentUpgraded(taskType)).toBe(true);
    });
  });
});

describe("getUpgradedAgents", () => {
  it("should return array of 27 task types", () => {
    const agents = getUpgradedAgents();
    expect(agents).toHaveLength(27);
    expect(Array.isArray(agents)).toBe(true);
  });

  it("should include all expected task types", () => {
    const agents = getUpgradedAgents();
    expect(agents).toContain(TaskType.COMPLETION);
    expect(agents).toContain(TaskType.CREATIVE);
    expect(agents).toContain(TaskType.ANALYSIS);
    expect(agents).toContain(TaskType.INTEGRATED);
    expect(agents).toContain(TaskType.PLATFORM_ADAPTER);
  });
});

describe("getAgentConfig", () => {
  it("should return config for upgraded agents", () => {
    const config = getAgentConfig(TaskType.COMPLETION);
    expect(config).toBeDefined();
  });

  it("should return null for non-upgraded agents", () => {
    // @ts-expect-error Testing invalid input
    const config = getAgentConfig("non-existent");
    expect(config).toBeNull();
  });
});

describe("getAgentStatistics", () => {
  it("should return correct statistics", () => {
    const stats = getAgentStatistics();

    expect(stats.total).toBe(27);
    expect(stats.upgraded).toBe(27);
    expect(stats.remaining).toBe(0);
    expect(stats.percentage).toBe(100);
    expect(Array.isArray(stats.upgradedAgents)).toBe(true);
    expect(Array.isArray(stats.remainingAgents)).toBe(true);
  });

  it("should list all 27 agents in upgradedAgents array", () => {
    const stats = getAgentStatistics();
    expect(stats.upgradedAgents).toHaveLength(27);
  });

  it("should have empty remainingAgents array", () => {
    const stats = getAgentStatistics();
    expect(stats.remainingAgents).toHaveLength(0);
  });
});

describe("AGENTS_TO_UPGRADE", () => {
  it("should be empty array indicating all agents are upgraded", () => {
    expect(AGENTS_TO_UPGRADE).toHaveLength(0);
    expect(Array.isArray(AGENTS_TO_UPGRADE)).toBe(true);
  });
});

describe("executeAgentTask", () => {
  const mockInput = {
    input: "Test input for agent execution",
    options: {},
  };

  it("should return fallback response for non-upgraded task type", async () => {
    const result = await executeAgentTask(
      // @ts-expect-error Testing invalid input
      "non-existent-task",
      mockInput,
    );

    expect(result.text).toContain("لم يتم ترقيته بعد");
    expect(result.confidence).toBe(0.0);
    expect(result.notes).toContain("الوكيل غير متاح");
    expect(result.metadata?.["modelUsed"]).toBe("none");
  });

  it("should include timestamp in metadata", async () => {
    const result = await executeAgentTask(
      // @ts-expect-error Testing invalid input
      "invalid-type",
      mockInput,
    );

    expect(result.metadata?.timestamp).toBeDefined();
    expect(typeof result.metadata?.timestamp).toBe("string");
  });
});

describe("batchExecuteAgentTasks", () => {
  const mockTasks = [
    {
      taskType: TaskType.COMPLETION,
      input: { input: "Task 1", options: {} },
    },
    {
      taskType: TaskType.CREATIVE,
      input: { input: "Task 2", options: {} },
    },
  ];

  it("should execute multiple tasks in parallel", async () => {
    const results = await batchExecuteAgentTasks(mockTasks);

    expect(results).toHaveLength(2);
    expect(Array.isArray(results)).toBe(true);
  });

  it("should return results for all tasks", async () => {
    const results = await batchExecuteAgentTasks(mockTasks);

    results.forEach((result) => {
      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("notes");
      expect(result).toHaveProperty("metadata");
    });
  });

  it("should handle empty task array", async () => {
    const results = await batchExecuteAgentTasks([]);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it("should handle task execution errors gracefully", async () => {
    const tasksWithInvalid = [
      {
        taskType: "invalid-type" as TaskType,
        input: { input: "Test", options: {} },
      },
    ];

    const results = await batchExecuteAgentTasks(tasksWithInvalid);

    expect(results).toHaveLength(1);
    expect(results[0]?.confidence).toBe(0.0);
    expect(results[0]?.notes.length).toBeGreaterThan(0);
  });
});
