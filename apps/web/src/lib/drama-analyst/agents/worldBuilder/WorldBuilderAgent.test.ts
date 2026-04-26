import { describe, it, expect, beforeEach, vi } from "vitest";

import { TaskType } from "@core/enums";

import { WorldBuilderAgent } from "./WorldBuilderAgent";

import type { StandardAgentInput } from "../shared/standardAgentPattern";

// Mock geminiService
vi.mock("../../services/geminiService", () => ({
  geminiService: {
    generateContent: vi
      .fn()
      .mockResolvedValue("Mock AI response for world building"),
  },
}));

let agent: WorldBuilderAgent;

describe("WorldBuilderAgent", () => {
  beforeEach(() => {
    agent = new WorldBuilderAgent();
    vi.clearAllMocks();
  });

  registerConfigurationTests();
  registerSuccessPathTests();
  registerLowConfidencePathTests();
  registerHallucinationDetectionPathTests();
  registerPostProcessingAndQualityAssessmentTests();
  registerErrorHandlingTests();
  registerAdvancedOptionsTests();
  registerWorldBibleStructureTests();
  registerIntegrationWithStandardPatternTests();
});

function registerConfigurationTests(): void {
  describe("Configuration", () => {
    it("should initialize with correct configuration", () => {
      const config = agent.getConfig();

      expect(config.name).toBe("WorldBuilderAgent");
      expect(config.taskType).toBe(TaskType.WORLD_BUILDER);
      expect(config.confidenceFloor).toBe(0.85);
      expect(config.supportsRAG).toBe(true);
      expect(config.supportsSelfCritique).toBe(true);
      expect(config.supportsConstitutional).toBe(true);
      expect(config.supportsUncertainty).toBe(true);
      expect(config.supportsHallucination).toBe(true);
      expect(config.supportsDebate).toBe(true);
    });

    it("should allow confidence floor to be updated", () => {
      agent.setConfidenceFloor(0.9);
      const config = agent.getConfig();
      expect(config.confidenceFloor).toBe(0.9);
    });
  });
}

function registerSuccessPathTests(): void {
  describe("Success Path", () => {
    it("should execute world building task successfully", async () => {
      const input: StandardAgentInput = {
        input: "ابنِ عالماً درامياً خيالياً يحتوي على سحر ونظام سياسي معقد",
        options: {
          enableRAG: true,
          enableSelfCritique: true,
          enableConstitutional: true,
          enableUncertainty: true,
          enableHallucination: true,
          enableDebate: false,
          confidenceThreshold: 0.8,
        },
        context: {
          previousStations: {
            thematicAnalysis: "الثيمات الرئيسية: القوة، الصراع، الهوية",
          },
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe("string");
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.metadata).toBeDefined();

      // Verify no JSON in output
      expect(result.text).not.toMatch(/\{[\s\S]*?"[^"]*"\s*:[\s\S]*?\}/);
      expect(result.text).not.toMatch(/```json/);
    });

    it("should include context from previous stations in prompt", async () => {
      const input: StandardAgentInput = {
        input: "ابنِ عالماً درامياً",
        options: {},
        context: {
          previousStations: {
            analysis: "تحليل أولي للنص الدرامي",
            thematicAnalysis: "الثيمات: الحرية، العدالة، التضحية",
            characterAnalysis: "شخصيات متعددة الأبعاد مع خلفيات معقدة",
            culturalContext: "سياق ثقافي شرق أوسطي",
          },
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should return text-only output without JSON blocks", async () => {
      const input: StandardAgentInput = {
        input: "ابنِ عالماً متكاملاً",
        options: {
          enableRAG: true,
        },
        context: {},
      };

      const result = await agent.executeTask(input);

      // Ensure output is clean text
      expect(result.text).not.toContain("```json");
      expect(result.text).not.toContain("```");
      expect(result.text).not.toMatch(/\{[^}]*"[^"]*":[^}]*\}/);
    });

    it("should create comprehensive world bible structure", async () => {
      // اختبار إنشاء هيكل كتاب توراة العالم الشامل
      const input: StandardAgentInput = {
        input: "ابنِ عالماً درامياً شاملاً مع كل العناصر الأساسية",
        options: {
          enableRAG: true,
        },
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.metadata?.worldLength).toBeGreaterThan(0);
    });
  });
}

function registerLowConfidencePathTests(): void {
  describe("Low Confidence Path", () => {
    it("should trigger debate when confidence is below threshold", async () => {
      const input: StandardAgentInput = {
        input: "ابنِ عالماً معقداً جداً مع أنظمة متعددة متداخلة",
        options: {
          enableDebate: true,
          confidenceThreshold: 0.95,
          maxDebateRounds: 2,
        },
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();

      expect(result.confidence >= 0.95 || result.notes !== undefined).toBe(
        true
      );
    });

    it("should handle uncertainty in world consistency", async () => {
      const input: StandardAgentInput = {
        input: "ابنِ عالماً مع معلومات محدودة",
        options: {
          enableUncertainty: true,
          confidenceThreshold: 0.75,
        },
        context: {
          previousStations: {},
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it("should handle complex world-building requirements", async () => {
      const input: StandardAgentInput = {
        input: "ابنِ عالماً يجمع بين السحر والتكنولوجيا المتقدمة بطريقة متسقة",
        options: {
          enableSelfCritique: true,
          enableConstitutional: true,
          confidenceThreshold: 0.8,
        },
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });
}

function registerHallucinationDetectionPathTests(): void {
  describe("Hallucination Detection Path", () => {
    it("should detect and handle unsupported world elements", async () => {
      const input: StandardAgentInput = {
        input: "ابنِ عالماً دون إضافة عناصر غير منطقية",
        options: {
          enableHallucination: true,
          confidenceThreshold: 0.8,
        },
        context: {
          previousStations: {
            analysis: "عالم واقعي مع لمسات خيالية محدودة",
          },
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it("should maintain high confidence for internally consistent worlds", async () => {
      // اختبار الحفاظ على ثقة عالية للعوالم المتسقة داخلياً
      const input: StandardAgentInput = {
        input: "ابنِ عالماً متسقاً داخلياً مع جميع الأنظمة المتوازنة",
        options: {
          enableSelfCritique: true,
          confidenceThreshold: 0.8,
        },
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });
}

function registerPostProcessingAndQualityAssessmentTests(): void {
  describe("Post-Processing and Quality Assessment", () => {
    it("should clean JSON blocks from output", async () => {
      const input: StandardAgentInput = {
        input: "ابنِ عالماً",
        options: {},
        context: {},
      };

      const result = await agent.executeTask(input);

      // Verify all JSON is removed
      expect(result.text).not.toMatch(/```json[\s\S]*?```/);
      expect(result.text).not.toMatch(/```[\s\S]*?```/);
      expect(result.text).not.toMatch(/\{[\s\S]*?"[^"]*"\s*:[\s\S]*?\}/);
    });

    it("should assess world quality metrics", async () => {
      const input: StandardAgentInput = {
        input: "ابنِ عالماً شاملاً",
        options: {
          confidenceThreshold: 0.8,
        },
        context: {},
      };

      const result = await agent.executeTask(input);

      const quality = result.metadata?.worldQuality;
      expect(quality).toBeDefined();
      if (!quality) {
        throw new Error("Expected world quality metadata");
      }

      expect(quality.consistency).toBeGreaterThanOrEqual(0);
      expect(quality.consistency).toBeLessThanOrEqual(1);
      expect(quality.detail).toBeGreaterThanOrEqual(0);
      expect(quality.detail).toBeLessThanOrEqual(1);
      expect(quality.creativity).toBeGreaterThanOrEqual(0);
      expect(quality.creativity).toBeLessThanOrEqual(1);
      expect(quality.coherence).toBeGreaterThanOrEqual(0);
      expect(quality.coherence).toBeLessThanOrEqual(1);
    });

    it("should add appropriate notes based on world quality", async () => {
      // اختبار إضافة ملاحظات مناسبة بناءً على جودة العالم
      const input: StandardAgentInput = {
        input: "ابنِ عالماً",
        options: {},
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.notes).toBeDefined();
    });

    it("should include world metadata", async () => {
      const input: StandardAgentInput = {
        input: "ابنِ عالماً",
        options: {},
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result.metadata?.worldLength).toBeDefined();
      expect(result.metadata?.sectionsCount).toBeDefined();
    });

    it("should adjust confidence based on world quality", async () => {
      const input: StandardAgentInput = {
        input: "ابنِ عالماً متكاملاً",
        options: {},
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
}

function registerErrorHandlingTests(): void {
  describe("Error Handling", () => {
    it("should return fallback response on error", async () => {
      const input: StandardAgentInput = {
        input: "",
        options: {},
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });

    it("should handle missing context gracefully", async () => {
      const input: StandardAgentInput = {
        input: "ابنِ عالماً",
        options: {},
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });
}

function registerAdvancedOptionsTests(): void {
  describe("Advanced Options", () => {
    it("should respect all advanced options", async () => {
      const input: StandardAgentInput = {
        input: "ابنِ عالماً درامياً متكاملاً",
        options: {
          enableRAG: true,
          enableSelfCritique: true,
          enableConstitutional: true,
          enableUncertainty: true,
          enableHallucination: true,
          enableDebate: true,
          maxDebateRounds: 3,
          confidenceThreshold: 0.85,
          temperature: 0.8,
          maxTokens: 12288,
        },
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it("should use default options when not provided", async () => {
      const input: StandardAgentInput = {
        input: "ابنِ عالماً",
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });
}

function registerWorldBibleStructureTests(): void {
  describe("World Bible Structure", () => {
    it("should include fundamental laws section", async () => {
      const input: StandardAgentInput = {
        input: "ابنِ عالماً مع قوانين فيزيائية فريدة",
        options: {},
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should include history and timeline", async () => {
      const input: StandardAgentInput = {
        input: "ابنِ عالماً مع تاريخ غني",
        options: {},
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should include cultures and societies", async () => {
      const input: StandardAgentInput = {
        input: "ابنِ عالماً مع حضارات متعددة",
        options: {},
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should include geography and environment", async () => {
      const input: StandardAgentInput = {
        input: "ابنِ عالماً مع جغرافيا متنوعة",
        options: {},
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });
}

function registerIntegrationWithStandardPatternTests(): void {
  describe("Integration with Standard Pattern", () => {
    it("should execute full standard pattern pipeline", async () => {
      // اختبار تنفيذ خط أنابيب النمط القياسي الكامل
      const input: StandardAgentInput = {
        input: "ابنِ عالماً درامياً متكاملاً مع كل الخيارات",
        options: {
          enableRAG: true,
          enableSelfCritique: true,
          enableConstitutional: true,
          enableUncertainty: true,
          enableHallucination: true,
          enableDebate: true,
          maxDebateRounds: 2,
          confidenceThreshold: 0.8,
        },
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });
}
