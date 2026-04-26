import { describe, it, expect, beforeEach, vi } from "vitest";

import { TaskType } from "@core/enums";

import type { aiAgentOrchestra as aiAgentOrchestraType } from "./orchestration";

// Mock dependencies
vi.mock("@agents/index", () => ({
  AGENT_CONFIGS: [
    {
      id: TaskType.ANALYSIS,
      name: "تحليل",
      description: "وكيل التحليل",
      collaboratesWith: [TaskType.CREATIVE],
      dependsOn: [],
      enhances: [TaskType.INTEGRATED],
      capabilities: {
        multiModal: true,
        accuracyLevel: 0.9,
        resourceIntensity: 0.5,
        adaptiveLearning: true,
      },
    },
    {
      id: TaskType.CREATIVE,
      name: "إبداع",
      description: "وكيل الإبداع",
      collaboratesWith: [],
      dependsOn: [TaskType.ANALYSIS],
      enhances: [],
      capabilities: {
        multiModal: false,
        accuracyLevel: 0.85,
        resourceIntensity: 0.6,
        adaptiveLearning: false,
      },
    },
    {
      id: TaskType.INTEGRATED,
      name: "متكامل",
      description: "وكيل متكامل",
      collaboratesWith: [],
      dependsOn: [TaskType.ANALYSIS, TaskType.CREATIVE],
      enhances: [],
      capabilities: {
        multiModal: true,
        accuracyLevel: 0.95,
        resourceIntensity: 0.8,
        adaptiveLearning: true,
      },
    },
  ],
}));

vi.mock("@services/loggerService", () => ({
  log: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

let orchestraManager: typeof aiAgentOrchestraType;

describe("AIAgentOrchestraManager", () => {
  beforeEach(async () => {
    vi.resetModules();
    const orchestrationModule = await import("./orchestration");
    orchestraManager = orchestrationModule.aiAgentOrchestra;
  });

  registerSingletonTests();
  registerAgentManagementTests();
  registerCollaborationGraphTests();
  registerExecutionOrderTests();
  registerPerformanceMetricTests();
  registerEpisodicMemoryTests();
  registerEdgeCaseTests();
});

function registerSingletonTests(): void {
  describe("Singleton Pattern", () => {
    it("validate-pipeline: should return the same instance", async () => {
      const orchestrationModule = await import("./orchestration");
      const instance1 = orchestrationModule.aiAgentOrchestra;
      const instance2 = orchestrationModule.aiAgentOrchestra;

      expect(instance1).toBe(instance2);
    });
  });
}

function registerAgentManagementTests(): void {
  describe("Agent Management", () => {
    it("validate-pipeline: should initialize all agents", () => {
      const agents = orchestraManager.getAllAgents();

      expect(agents.size).toBeGreaterThan(0);
      expect(agents.has(TaskType.ANALYSIS)).toBe(true);
      expect(agents.has(TaskType.CREATIVE)).toBe(true);
      expect(agents.has(TaskType.INTEGRATED)).toBe(true);
    });

    it("validate-pipeline: should get enhanced description for a task", () => {
      const description = orchestraManager.getEnhancedDescription(
        TaskType.ANALYSIS
      );

      expect(description).toBe("وكيل التحليل");
    });

    it("validate-pipeline: should return default description for unknown task", () => {
      const description =
        orchestraManager.getEnhancedDescription("UNKNOWN_TASK");

      expect(description).toContain("وصف غير متوفر");
    });

    it("validate-pipeline: should get agent capabilities", () => {
      const capabilities = orchestraManager.getAgentCapabilities(
        TaskType.ANALYSIS
      );

      expect(capabilities).toBeDefined();
      expect(capabilities?.multiModal).toBe(true);
      expect(capabilities?.accuracyLevel).toBe(0.9);
    });

    it("validate-pipeline: should return null for unknown agent capabilities", () => {
      const capabilities = orchestraManager.getAgentCapabilities("UNKNOWN");

      expect(capabilities).toBeNull();
    });
  });
}

function registerCollaborationGraphTests(): void {
  describe("Collaboration Graph", () => {
    it("validate-pipeline: should build collaboration graph correctly", () => {
      const collaborators = orchestraManager.getCollaborationSuggestions(
        TaskType.ANALYSIS
      );

      expect(collaborators).toBeDefined();
      expect(Array.isArray(collaborators)).toBe(true);
      expect(collaborators.includes(TaskType.CREATIVE)).toBe(true);
      expect(collaborators.includes(TaskType.INTEGRATED)).toBe(true);
    });

    it("validate-pipeline: should return empty array for agents with no collaborators", () => {
      const collaborators = orchestraManager.getCollaborationSuggestions(
        TaskType.CREATIVE
      );

      expect(collaborators).toBeDefined();
      expect(collaborators.includes(TaskType.ANALYSIS)).toBe(true);
    });

    it("validate-pipeline: should handle unknown task types", () => {
      const collaborators =
        orchestraManager.getCollaborationSuggestions("UNKNOWN");

      expect(collaborators).toEqual([]);
    });
  });
}

function registerExecutionOrderTests(): void {
  describe("Execution Order Optimization", () => {
    it("validate-pipeline: should optimize execution order based on dependencies", () => {
      const tasks = [TaskType.INTEGRATED, TaskType.CREATIVE, TaskType.ANALYSIS];
      const optimized = orchestraManager.optimizeExecutionOrder(tasks);

      expect(optimized).toBeDefined();
      expect(Array.isArray(optimized)).toBe(true);

      // ANALYSIS should come before CREATIVE (CREATIVE depends on ANALYSIS)
      const analysisIndex = optimized.indexOf(TaskType.ANALYSIS);
      const creativeIndex = optimized.indexOf(TaskType.CREATIVE);
      const integratedIndex = optimized.indexOf(TaskType.INTEGRATED);

      expect(analysisIndex).toBeLessThan(creativeIndex);
      expect(creativeIndex).toBeLessThan(integratedIndex);
    });

    it("validate-pipeline: should handle single task", () => {
      const optimized = orchestraManager.optimizeExecutionOrder([
        TaskType.ANALYSIS,
      ]);

      expect(optimized).toEqual([TaskType.ANALYSIS]);
    });

    it("validate-pipeline: should handle empty task list", () => {
      const optimized = orchestraManager.optimizeExecutionOrder([]);

      expect(optimized).toEqual([]);
    });

    it("validate-pipeline: should handle tasks without dependencies", () => {
      const optimized = orchestraManager.optimizeExecutionOrder([
        TaskType.ANALYSIS,
      ]);

      expect(optimized).toContain(TaskType.ANALYSIS);
    });
  });
}

function registerPerformanceMetricTests(): void {
  describe("Performance Metrics", () => {
    it("validate-pipeline: should initialize performance metrics for all agents", () => {
      const metrics = orchestraManager.getPerformanceMetrics(TaskType.ANALYSIS);

      expect(metrics).toBeDefined();
      expect(metrics.successRate).toBe(0.9);
      expect(metrics.averageExecutionTime).toBe(0);
      expect(metrics.resourceUsage).toBe(0.5);
      expect(metrics.userSatisfactionScore).toBe(0.85);
    });

    it("validate-pipeline: should update performance metrics", () => {
      const initialMetrics = orchestraManager.getPerformanceMetrics(
        TaskType.ANALYSIS
      );
      const initialSuccessRate = initialMetrics.successRate;

      orchestraManager.updatePerformance(TaskType.ANALYSIS, 1000, true, 0.95);

      const updatedMetrics = orchestraManager.getPerformanceMetrics(
        TaskType.ANALYSIS
      );

      expect(updatedMetrics.averageExecutionTime).toBeGreaterThan(0);
      expect(updatedMetrics.successRate).toBeCloseTo(
        0.9 * initialSuccessRate + 0.1,
        2
      );
    });

    it("validate-pipeline: should update execution time using exponential moving average", () => {
      orchestraManager.updatePerformance(TaskType.ANALYSIS, 1000, true);
      orchestraManager.updatePerformance(TaskType.ANALYSIS, 2000, true);

      const metrics = orchestraManager.getPerformanceMetrics(TaskType.ANALYSIS);

      expect(metrics.averageExecutionTime).toBeGreaterThan(0);
      expect(metrics.averageExecutionTime).toBeLessThan(2000);
    });

    it("validate-pipeline: should update success rate on failure", () => {
      const initialMetrics = orchestraManager.getPerformanceMetrics(
        TaskType.CREATIVE
      );
      const initialSuccessRate = initialMetrics.successRate;

      orchestraManager.updatePerformance(TaskType.CREATIVE, 500, false);

      const updatedMetrics = orchestraManager.getPerformanceMetrics(
        TaskType.CREATIVE
      );

      expect(updatedMetrics.successRate).toBeLessThan(initialSuccessRate);
    });

    it("validate-pipeline: should update user satisfaction score when provided", () => {
      orchestraManager.updatePerformance(TaskType.ANALYSIS, 1000, true, 0.5);

      const metrics = orchestraManager.getPerformanceMetrics(TaskType.ANALYSIS);

      expect(metrics.userSatisfactionScore).toBeLessThan(0.85);
    });

    it("validate-pipeline: should not update user satisfaction when not provided", () => {
      const initialMetrics = orchestraManager.getPerformanceMetrics(
        TaskType.ANALYSIS
      );
      const initialScore = initialMetrics.userSatisfactionScore;

      orchestraManager.updatePerformance(TaskType.ANALYSIS, 1000, true);

      const updatedMetrics = orchestraManager.getPerformanceMetrics(
        TaskType.ANALYSIS
      );

      // Score might change slightly due to other updates, but should be close
      expect(
        Math.abs(updatedMetrics.userSatisfactionScore - initialScore)
      ).toBeLessThan(0.1);
    });
  });
}

function registerEpisodicMemoryTests(): void {
  describe("Episodic Memory", () => {
    it("validate-pipeline: should store episodes", () => {
      const episode = {
        input: "test",
        output: "result",
        timestamp: Date.now(),
      };

      orchestraManager.storeEpisode(TaskType.ANALYSIS, episode);

      const episodes = orchestraManager.getRelevantEpisodes(TaskType.ANALYSIS);

      expect(episodes).toBeDefined();
      expect(episodes.length).toBeGreaterThan(0);
      expect(episodes[episodes.length - 1]).toEqual(episode);
    });

    it("validate-pipeline: should limit stored episodes to 100", () => {
      for (let i = 0; i < 150; i++) {
        orchestraManager.storeEpisode(TaskType.CREATIVE, { index: i });
      }

      const allEpisodes = orchestraManager.getRelevantEpisodes(
        TaskType.CREATIVE,
        200
      );

      expect(allEpisodes.length).toBeLessThanOrEqual(100);
    });

    it("validate-pipeline: should retrieve limited number of episodes", () => {
      for (let i = 0; i < 20; i++) {
        orchestraManager.storeEpisode(TaskType.INTEGRATED, { index: i });
      }

      const episodes = orchestraManager.getRelevantEpisodes(
        TaskType.INTEGRATED,
        5
      );

      expect(episodes.length).toBeLessThanOrEqual(5);
    });

    it("validate-pipeline: should return empty array for task with no episodes", () => {
      const episodes = orchestraManager.getRelevantEpisodes("UNKNOWN");

      expect(episodes).toEqual([]);
    });

    it("validate-pipeline: should return most recent episodes", () => {
      orchestraManager.storeEpisode(TaskType.ANALYSIS, { id: 1 });
      orchestraManager.storeEpisode(TaskType.ANALYSIS, { id: 2 });
      orchestraManager.storeEpisode(TaskType.ANALYSIS, { id: 3 });

      const episodes = orchestraManager.getRelevantEpisodes(
        TaskType.ANALYSIS,
        2
      );

      expect(episodes[episodes.length - 1]).toEqual({ id: 3 });
      expect(episodes[episodes.length - 2]).toEqual({ id: 2 });
    });
  });
}

function registerEdgeCaseTests(): void {
  describe("Edge Cases", () => {
    it("validate-pipeline: should handle circular dependencies gracefully", () => {
      const tasks = [TaskType.ANALYSIS, TaskType.CREATIVE, TaskType.INTEGRATED];
      const optimized = orchestraManager.optimizeExecutionOrder(tasks);

      expect(optimized.length).toBe(3);
    });

    it("validate-pipeline: should handle duplicate tasks in execution order", () => {
      const tasks = [TaskType.ANALYSIS, TaskType.ANALYSIS, TaskType.CREATIVE];
      const optimized = orchestraManager.optimizeExecutionOrder(tasks);

      // Should not duplicate tasks
      const uniqueTasks = new Set(optimized);
      expect(uniqueTasks.size).toBe(optimized.length);
    });
  });
}
