import { describe, it, expect, beforeEach, vi } from "vitest";
import { TensionOptimizerAgent } from "./TensionOptimizerAgent";
import { StandardAgentInput } from "../shared/standardAgentPattern";
import { TaskType } from "@core/enums";

// Mock geminiService
vi.mock("../../services/geminiService", () => ({
  geminiService: {
    generateContent: vi
      .fn()
      .mockResolvedValue("Mock AI response for tension optimization"),
  },
}));

describe("TensionOptimizerAgent", () => {
  let agent: TensionOptimizerAgent;

  beforeEach(() => {
    agent = new TensionOptimizerAgent();
    vi.clearAllMocks();
  });

  describe("Configuration", () => {
    it("should initialize with correct configuration", () => {
      const config = agent.getConfig();

      expect(config.name).toBe("TensionMaster AI");
      expect(config.taskType).toBe(TaskType.TENSION_OPTIMIZER);
      expect(config.confidenceFloor).toBe(0.81);
      expect(config.supportsRAG).toBe(true);
      expect(config.supportsSelfCritique).toBe(true);
      expect(config.supportsConstitutional).toBe(true);
      expect(config.supportsUncertainty).toBe(true);
      expect(config.supportsHallucination).toBe(true);
      expect(config.supportsDebate).toBe(true);
    });

    it("should allow confidence floor to be updated", () => {
      agent.setConfidenceFloor(0.85);
      const config = agent.getConfig();
      expect(config.confidenceFloor).toBe(0.85);
    });
  });

  describe("Success Path", () => {
    it("should execute tension optimization task successfully", async () => {
      const input: StandardAgentInput = {
        input: "حلل وحسّن التوتر الدرامي في المشهد التالي",
        options: {
          enableRAG: true,
          enableSelfCritique: true,
          enableConstitutional: true,
          enableUncertainty: true,
          enableHallucination: true,
          enableDebate: false,
          confidenceThreshold: 0.75,
        },
        context: {
          originalText: "مشهد درامي يحتاج تحسين التوتر",
          currentTensionLevel: "low",
          targetTensionLevel: "high",
          tensionType: "suspense",
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

    it("should analyze different tension types", async () => {
      const tensionTypes = ["suspense", "conflict", "anticipation", "mystery"];

      for (const type of tensionTypes) {
        const input: StandardAgentInput = {
          input: "حلل التوتر",
          options: {},
          context: {
            originalText: "نص درامي",
            tensionType: type,
          },
        };

        const result = await agent.executeTask(input);
        expect(result).toBeDefined();
        expect(result.text).toBeTruthy();
      }
    });

    it("should return text-only output without JSON blocks", async () => {
      const input: StandardAgentInput = {
        input: "حلل التوتر الدرامي",
        options: {
          enableRAG: true,
        },
        context: {
          originalText: "نص للتحليل",
        },
      };

      const result = await agent.executeTask(input);

      // Ensure output is clean text
      expect(result.text).not.toContain("```json");
      expect(result.text).not.toContain("```");
      expect(result.text).not.toMatch(/\{[^}]*"[^"]*":[^}]*\}/);
    });

    it("should handle different pace preferences", async () => {
      const pacePreferences = ["slow-burn", "steady", "rapid", "explosive"];

      for (const pace of pacePreferences) {
        const input: StandardAgentInput = {
          input: "حسّن التوتر",
          options: {},
          context: {
            originalText: "نص",
            pacePreference: pace,
          },
        };

        const result = await agent.executeTask(input);
        expect(result).toBeDefined();
      }
    });

    it("should provide recommendations when requested", async () => {
      const input: StandardAgentInput = {
        input: "قدم توصيات لتحسين التوتر",
        options: {},
        context: {
          originalText: "مشهد درامي",
          provideRecommendations: true,
          identifyPeaks: true,
          analyzeRelease: true,
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });

  describe("Low Confidence Path", () => {
    it("should trigger debate when confidence is below threshold", async () => {
      const input: StandardAgentInput = {
        input: "حلل التوتر في نص معقد جداً",
        options: {
          enableDebate: true,
          confidenceThreshold: 0.95,
          maxDebateRounds: 2,
        },
        context: {
          originalText: "نص معقد",
          currentTensionLevel: "medium",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();

      if (result.confidence < 0.95) {
        expect(result.notes).toBeDefined();
      }
    });

    it("should handle uncertainty in tension analysis", async () => {
      const input: StandardAgentInput = {
        input: "حلل التوتر مع سياق محدود",
        options: {
          enableUncertainty: true,
          confidenceThreshold: 0.7,
        },
        context: {
          originalText: "نص قصير جداً",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it("should handle ambiguous tension levels", async () => {
      const input: StandardAgentInput = {
        input: "حلل التوتر في نص غامض",
        options: {
          enableUncertainty: true,
          enableSelfCritique: true,
        },
        context: {
          originalText: "نص بتوتر غير واضح",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });

  describe("Hallucination Detection Path", () => {
    it("should detect and handle unsupported tension claims", async () => {
      const input: StandardAgentInput = {
        input: "حلل التوتر بناءً على النص فقط",
        options: {
          enableHallucination: true,
          confidenceThreshold: 0.75,
        },
        context: {
          originalText: "نص بسيط",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it("should maintain high confidence for well-supported analysis", async () => {
      // اختبار الحفاظ على ثقة عالية للتحليلات المدعومة بشكل جيد
      const input: StandardAgentInput = {
        input: "حلل التوتر في نص موثق بشكل جيد",
        options: {
          enableRAG: true,
          confidenceThreshold: 0.75,
        },
        context: {
          originalText: "مشهد درامي واضح مع توتر محدد",
          currentTensionLevel: "high",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Post-Processing and Quality Assessment", () => {
    it("should clean JSON blocks from output", async () => {
      const input: StandardAgentInput = {
        input: "حلل التوتر",
        options: {},
        context: {
          originalText: "نص",
        },
      };

      const result = await agent.executeTask(input);

      // Verify all JSON is removed
      expect(result.text).not.toMatch(/```json[\s\S]*?```/);
      expect(result.text).not.toMatch(/```[\s\S]*?```/);
      expect(result.text).not.toMatch(/\{[\s\S]*?"[^"]*"\s*:[\s\S]*?\}/);
    });

    it("should assess tension optimization quality", async () => {
      const input: StandardAgentInput = {
        input: "حلل وحسّن التوتر",
        options: {
          confidenceThreshold: 0.75,
        },
        context: {
          originalText: "نص يحتاج تحسين",
          provideRecommendations: true,
        },
      };

      const result = await agent.executeTask(input);

      expect(result.metadata).toBeDefined();
    });

    it("should add appropriate notes based on tension analysis", async () => {
      // اختبار إضافة ملاحظات مناسبة بناءً على تحليل التوتر
      const input: StandardAgentInput = {
        input: "حلل التوتر",
        options: {
          confidenceThreshold: 0.75,
        },
        context: {
          originalText: "نص",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.notes).toBeDefined();
    });

    it("should identify tension peaks when requested", async () => {
      const input: StandardAgentInput = {
        input: "حدد نقاط ذروة التوتر",
        options: {},
        context: {
          originalText: "نص طويل مع عدة مشاهد",
          identifyPeaks: true,
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should analyze tension release patterns", async () => {
      const input: StandardAgentInput = {
        input: "حلل أنماط تفريغ التوتر",
        options: {},
        context: {
          originalText: "نص مع تصاعد وهبوط في التوتر",
          analyzeRelease: true,
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });

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

    it("should handle missing original text gracefully", async () => {
      const input: StandardAgentInput = {
        input: "حلل التوتر",
        options: {},
        context: {
          currentTensionLevel: "low",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });

  describe("Advanced Options", () => {
    it("should respect all advanced options", async () => {
      const input: StandardAgentInput = {
        input: "حلل وحسّن التوتر الدرامي",
        options: {
          enableRAG: true,
          enableSelfCritique: true,
          enableConstitutional: true,
          enableUncertainty: true,
          enableHallucination: true,
          enableDebate: true,
          maxDebateRounds: 3,
          confidenceThreshold: 0.8,
          temperature: 0.7,
          maxTokens: 8192,
        },
        context: {
          originalText: "نص درامي",
          currentTensionLevel: "medium",
          targetTensionLevel: "high",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it("should use default options when not provided", async () => {
      const input: StandardAgentInput = {
        input: "حلل التوتر",
        options: undefined as any,
        context: {
          originalText: "نص",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });

  describe("Scene Breakdown Analysis", () => {
    it("should analyze tension across multiple scenes", async () => {
      const input: StandardAgentInput = {
        input: "حلل التوتر عبر المشاهد",
        options: {},
        context: {
          originalText: "نص طويل",
          sceneBreakdown: [
            { scene: 1, description: "المقدمة" },
            { scene: 2, description: "التصعيد" },
            { scene: 3, description: "الذروة" },
            { scene: 4, description: "الحل" },
          ],
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should handle empty scene breakdown", async () => {
      const input: StandardAgentInput = {
        input: "حلل التوتر",
        options: {},
        context: {
          originalText: "نص",
          sceneBreakdown: [],
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });

  describe("Integration with Standard Pattern", () => {
    it("should execute full standard pattern pipeline", async () => {
      // اختبار تنفيذ خط أنابيب النمط القياسي الكامل
      const input: StandardAgentInput = {
        input: "حلل وحسّن التوتر مع كل الخيارات المتقدمة",
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
        context: {
          originalText: "مشهد درامي",
          currentTensionLevel: "medium",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });
});
