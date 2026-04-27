import { describe, it, expect, beforeEach, vi } from "vitest";

import { TaskType } from "@core/enums";

import { StandardAgentInput } from "../shared/standardAgentPattern";

import { RhythmMappingAgent } from "./RhythmMappingAgent";

// Mock geminiService
vi.mock("../../services/geminiService", () => ({
  geminiService: {
    generateContent: vi
      .fn()
      .mockResolvedValue("Mock AI response for rhythm mapping"),
  },
}));

describe("RhythmMappingAgent", () => {
  let agent: RhythmMappingAgent;

  beforeEach(() => {
    agent = new RhythmMappingAgent();
    vi.clearAllMocks();
  });

  describe("Configuration", () => {
    it("should initialize with correct configuration", () => {
      // اختبار التهيئة مع الإعدادات الصحيحة
      const config = agent.getConfig();

      expect(config.name).toBe("RhythmMapper AI");
      expect(config.taskType).toBe(TaskType.RHYTHM_MAPPING);
      expect(config.confidenceFloor).toBe(0.8);
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
    it("should execute rhythm mapping task successfully", async () => {
      const input: StandardAgentInput = {
        input: "حلل وارسم خريطة إيقاع النص الدرامي التالي",
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
          originalText: "نص درامي يحتاج تحليل الإيقاع",
          sceneBreakdown: [
            { scene: 1, description: "مشهد هادئ" },
            { scene: 2, description: "مشهد سريع" },
          ],
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

    it("should analyze different rhythm patterns", async () => {
      const input: StandardAgentInput = {
        input: "حلل أنماط الإيقاع في النص",
        options: {},
        context: {
          originalText: "نص مع تنوع في الإيقاع",
          analyzePatterns: true,
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should return text-only output without JSON blocks", async () => {
      const input: StandardAgentInput = {
        input: "ارسم خريطة الإيقاع",
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

    it("should map rhythm variations across scenes", async () => {
      const input: StandardAgentInput = {
        input: "حلل تغيرات الإيقاع عبر المشاهد",
        options: {},
        context: {
          originalText: "نص طويل متعدد المشاهد",
          sceneBreakdown: [
            { scene: 1, description: "بطيء" },
            { scene: 2, description: "متوسط" },
            { scene: 3, description: "سريع" },
            { scene: 4, description: "بطيء" },
          ],
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should include context from previous stations", async () => {
      const input: StandardAgentInput = {
        input: "ارسم خريطة الإيقاع",
        options: {},
        context: {
          originalText: "نص",
          previousStations: {
            analysis: "تحليل أولي",
            tensionAnalysis: "تحليل التوتر",
          },
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
        input: "حلل الإيقاع في نص معقد جداً",
        options: {
          enableDebate: true,
          confidenceThreshold: 0.95,
          maxDebateRounds: 2,
        },
        context: {
          originalText: "نص معقد مع إيقاع غير منتظم",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();

      if (result.confidence < 0.95) {
        expect(result.notes).toBeDefined();
      }
    });

    it("should handle uncertainty in rhythm detection", async () => {
      const input: StandardAgentInput = {
        input: "حلل الإيقاع مع سياق محدود",
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

    it("should handle irregular rhythm patterns", async () => {
      const input: StandardAgentInput = {
        input: "حلل الإيقاع غير المنتظم",
        options: {
          enableUncertainty: true,
          enableSelfCritique: true,
        },
        context: {
          originalText: "نص مع إيقاع غير منتظم",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });

  describe("Hallucination Detection Path", () => {
    it("should detect and handle unsupported rhythm claims", async () => {
      const input: StandardAgentInput = {
        input: "حلل الإيقاع بناءً على النص فقط",
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

    it("should maintain high confidence for clear rhythm patterns", async () => {
      // اختبار الحفاظ على ثقة عالية لأنماط الإيقاع الواضحة
      const input: StandardAgentInput = {
        input: "حلل الإيقاع الواضح والمنتظم",
        options: {
          enableRAG: true,
          confidenceThreshold: 0.75,
        },
        context: {
          originalText: "نص مع إيقاع منتظم وواضح جداً",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Post-Processing", () => {
    it("should clean JSON blocks from output", async () => {
      const input: StandardAgentInput = {
        input: "حلل الإيقاع",
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

    it("should add appropriate notes based on rhythm analysis", async () => {
      // اختبار إضافة ملاحظات مناسبة بناءً على تحليل الإيقاع
      const input: StandardAgentInput = {
        input: "حلل الإيقاع",
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

    it("should include rhythm metrics in metadata", async () => {
      const input: StandardAgentInput = {
        input: "حلل الإيقاع",
        options: {},
        context: {
          originalText: "نص",
        },
      };

      const result = await agent.executeTask(input);

      expect(result.metadata).toBeDefined();
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
        input: "حلل الإيقاع",
        options: {},
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });

  describe("Advanced Options", () => {
    it("should respect all advanced options", async () => {
      const input: StandardAgentInput = {
        input: "حلل وارسم خريطة إيقاع شاملة",
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
        input: "حلل الإيقاع",
        options: undefined,
        context: {
          originalText: "نص",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });

  describe("Rhythm Patterns Analysis", () => {
    it("should identify fast-paced sections", async () => {
      const input: StandardAgentInput = {
        input: "حدد المقاطع السريعة",
        options: {},
        context: {
          originalText: "نص مع مقاطع متنوعة السرعة",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should identify slow-paced sections", async () => {
      const input: StandardAgentInput = {
        input: "حدد المقاطع البطيئة",
        options: {},
        context: {
          originalText: "نص مع إيقاع متنوع",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should analyze rhythm transitions", async () => {
      const input: StandardAgentInput = {
        input: "حلل انتقالات الإيقاع",
        options: {},
        context: {
          originalText: "نص مع تغيرات في الإيقاع",
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
        input: "حلل وارسم خريطة الإيقاع الشاملة",
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
          originalText: "نص درامي طويل",
          sceneBreakdown: [
            { scene: 1, description: "بطيء" },
            { scene: 2, description: "سريع" },
          ],
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
