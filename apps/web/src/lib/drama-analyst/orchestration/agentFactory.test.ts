import { describe, it, expect, vi, beforeEach } from "vitest";

import { TaskType } from "@core/enums";

import type {
  getAgentConfig as getAgentConfigType,
  listAgentConfigs as listAgentConfigsType,
} from "./agentFactory";

// مخزن وكلاء الذكاء الاصطناعي - محاكاة التكوينات الأساسية
vi.mock("@agents/index", () => ({
  AGENT_CONFIGS: [
    {
      id: TaskType.ANALYSIS,
      name: "تحليل",
      description: "وكيل التحليل النصوص الدرامية",
      category: "core",
      capabilities: {
        multiModal: true,
        reasoningChains: true,
        accuracyLevel: 0.9,
      },
      collaboratesWith: [],
      dependsOn: [],
      enhances: [],
      systemPrompt: "تحليل النصوص",
      cacheStrategy: "adaptive",
      parallelizable: true,
      confidenceThreshold: 0.8,
    },
    {
      id: TaskType.CREATIVE,
      name: "إبداع",
      description: "وكيل الإبداع والكتابة",
      category: "creative",
      capabilities: {
        multiModal: false,
        reasoningChains: true,
        accuracyLevel: 0.85,
      },
      collaboratesWith: [TaskType.ANALYSIS],
      dependsOn: [],
      enhances: [],
      systemPrompt: "إبداع النصوص",
      cacheStrategy: "none",
      parallelizable: false,
      confidenceThreshold: 0.75,
    },
    {
      id: TaskType.INTEGRATED,
      name: "متكامل",
      description: "وكيل متكامل للتحليل والإبداع",
      category: "core",
      capabilities: {
        multiModal: true,
        reasoningChains: true,
        accuracyLevel: 0.95,
      },
      collaboratesWith: [],
      dependsOn: [TaskType.ANALYSIS, TaskType.CREATIVE],
      enhances: [],
      systemPrompt: "تحليل وإبداع متكامل",
      cacheStrategy: "aggressive",
      parallelizable: true,
      confidenceThreshold: 0.9,
    },
  ],
}));

let getAgentConfig: typeof getAgentConfigType;
let listAgentConfigs: typeof listAgentConfigsType;

describe("AgentFactory", () => {
  beforeEach(async () => {
    vi.resetModules();
    const agentFactoryModule = await import("./agentFactory");
    getAgentConfig = agentFactoryModule.getAgentConfig;
    listAgentConfigs = agentFactoryModule.listAgentConfigs;
  });

  registerGetAgentConfigTests();
  registerListAgentConfigsTests();
  registerIntegrationTests();
  registerEdgeCaseTests();
});

function registerGetAgentConfigTests(): void {
  describe("getAgentConfig", () => {
    it("should return agent config for valid task type", () => {
      const config = getAgentConfig(TaskType.ANALYSIS);

      expect(config).toBeDefined();
      expect(config?.id).toBe(TaskType.ANALYSIS);
      expect(config?.name).toBe("تحليل");
      expect(config?.description).toContain("تحليل");
    });

    it("should return config for CREATIVE task", () => {
      const config = getAgentConfig(TaskType.CREATIVE);

      expect(config).toBeDefined();
      expect(config?.id).toBe(TaskType.CREATIVE);
      expect(config?.name).toBe("إبداع");
    });

    it("should return config for INTEGRATED task", () => {
      const config = getAgentConfig(TaskType.INTEGRATED);

      expect(config).toBeDefined();
      expect(config?.id).toBe(TaskType.INTEGRATED);
      expect(config?.capabilities.multiModal).toBe(true);
    });

    it("should return undefined for unknown task type", () => {
      const config = getAgentConfig("UNKNOWN_TASK");

      expect(config).toBeUndefined();
    });

    it("should return config with all required properties", () => {
      const config = getAgentConfig(TaskType.ANALYSIS);

      expect(config).toBeDefined();
      expect(config?.id).toBeDefined();
      expect(config?.name).toBeDefined();
      expect(config?.description).toBeDefined();
      expect(config?.category).toBeDefined();
      expect(config?.capabilities).toBeDefined();
      expect(config?.systemPrompt).toBeDefined();
      expect(config?.cacheStrategy).toBeDefined();
    });

    it("should return config with correct capabilities", () => {
      const config = getAgentConfig(TaskType.ANALYSIS);

      expect(config?.capabilities).toBeDefined();
      expect(config?.capabilities.multiModal).toBe(true);
      expect(config?.capabilities.reasoningChains).toBe(true);
      expect(config?.capabilities.accuracyLevel).toBe(0.9);
    });

    it("should return config with collaboration info", () => {
      const config = getAgentConfig(TaskType.CREATIVE);

      expect(config?.collaboratesWith).toBeDefined();
      expect(Array.isArray(config?.collaboratesWith)).toBe(true);
      expect(config?.collaboratesWith).toContain(TaskType.ANALYSIS);
    });

    it("should return config with dependency info", () => {
      const config = getAgentConfig(TaskType.INTEGRATED);

      expect(config?.dependsOn).toBeDefined();
      expect(Array.isArray(config?.dependsOn)).toBe(true);
      expect(config?.dependsOn).toContain(TaskType.ANALYSIS);
      expect(config?.dependsOn).toContain(TaskType.CREATIVE);
    });

    it("should return config with cache strategy", () => {
      const analysisConfig = getAgentConfig(TaskType.ANALYSIS);
      const creativeConfig = getAgentConfig(TaskType.CREATIVE);
      const integratedConfig = getAgentConfig(TaskType.INTEGRATED);

      expect(analysisConfig?.cacheStrategy).toBe("adaptive");
      expect(creativeConfig?.cacheStrategy).toBe("none");
      expect(integratedConfig?.cacheStrategy).toBe("aggressive");
    });

    it("should return config with parallelizable flag", () => {
      const analysisConfig = getAgentConfig(TaskType.ANALYSIS);
      const creativeConfig = getAgentConfig(TaskType.CREATIVE);

      expect(analysisConfig?.parallelizable).toBe(true);
      expect(creativeConfig?.parallelizable).toBe(false);
    });

    it("should return config with confidence threshold", () => {
      const config = getAgentConfig(TaskType.ANALYSIS);

      expect(config?.confidenceThreshold).toBeDefined();
      expect(config?.confidenceThreshold).toBe(0.8);
    });
  });
}

function registerListAgentConfigsTests(): void {
  describe("listAgentConfigs", () => {
    it("should return all agent configurations", () => {
      const configs = listAgentConfigs();

      expect(configs).toBeDefined();
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBe(3);
    });

    it("should return readonly array", () => {
      const configs = listAgentConfigs();

      expect(configs).toBeDefined();
      // TypeScript ينفذ readonly في وقت التجميع
      expect(Array.isArray(configs)).toBe(true);
    });

    it("should include all task types", () => {
      const configs = listAgentConfigs();

      const ids = configs.map((c) => c.id);

      expect(ids).toContain(TaskType.ANALYSIS);
      expect(ids).toContain(TaskType.CREATIVE);
      expect(ids).toContain(TaskType.INTEGRATED);
    });

    it("should return configs with valid structure", () => {
      const configs = listAgentConfigs();

      configs.forEach((config) => {
        expect(config.id).toBeDefined();
        expect(config.name).toBeDefined();
        expect(config.description).toBeDefined();
        expect(config.capabilities).toBeDefined();
        expect(config.systemPrompt).toBeDefined();
      });
    });

    it("should not return empty array", () => {
      const configs = listAgentConfigs();

      expect(configs.length).toBeGreaterThan(0);
    });

    it("should return configs with unique IDs", () => {
      const configs = listAgentConfigs();
      const ids = configs.map((c) => c.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(configs.length);
    });

    it("should return configs with different categories", () => {
      const configs = listAgentConfigs();
      const categories = configs.map((c) => c.category);

      expect(categories).toContain("core");
      expect(categories).toContain("creative");
    });
  });
}

function registerIntegrationTests(): void {
  describe("Integration", () => {
    it("should allow getting config and listing all configs", () => {
      const allConfigs = listAgentConfigs();
      const firstConfig = getAgentConfig(allConfigs[0].id);

      expect(firstConfig).toBeDefined();
      expect(firstConfig?.id).toBe(allConfigs[0].id);
    });

    it("should maintain consistency between get and list", () => {
      const allConfigs = listAgentConfigs();

      allConfigs.forEach((config) => {
        const retrieved = getAgentConfig(config.id);
        expect(retrieved).toEqual(config);
      });
    });
  });
}

function registerEdgeCaseTests(): void {
  describe("Edge Cases", () => {
    it("should handle null task type gracefully", () => {
      const config = getAgentConfig(null);

      expect(config).toBeUndefined();
    });

    it("should handle empty string task type", () => {
      const config = getAgentConfig("");

      expect(config).toBeUndefined();
    });

    it("should not mutate returned configs", () => {
      const config1 = getAgentConfig(TaskType.ANALYSIS);
      const config2 = getAgentConfig(TaskType.ANALYSIS);

      expect(config1).toEqual(config2);
    });
  });
}
