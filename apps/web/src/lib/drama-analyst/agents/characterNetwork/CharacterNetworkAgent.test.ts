import { describe, it, expect, beforeEach, vi } from "vitest";
import { CharacterNetworkAgent } from "./CharacterNetworkAgent";
import { StandardAgentInput } from "../shared/standardAgentPattern";
import { TaskType } from "@core/enums";

// Mock geminiService
vi.mock("../../services/geminiService", () => ({
  geminiService: {
    generateContent: vi
      .fn()
      .mockResolvedValue("Mock AI response for character network analysis"),
  },
}));

describe("CharacterNetworkAgent", () => {
  let agent: CharacterNetworkAgent;

  beforeEach(() => {
    agent = new CharacterNetworkAgent();
    vi.clearAllMocks();
  });

  describe("Configuration", () => {
    it("should initialize with correct configuration", () => {
      const config = agent.getConfig();

      expect(config.name).toBe("NetworkWeaver AI");
      expect(config.taskType).toBe(TaskType.CHARACTER_NETWORK);
      expect(config.confidenceFloor).toBeGreaterThanOrEqual(0.75);
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
    it("should execute character network analysis task successfully", async () => {
      const input: StandardAgentInput = {
        input: "حلل شبكة العلاقات بين الشخصيات في النص",
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
          originalText: "نص درامي يحتوي على عدة شخصيات متفاعلة",
          characters: ["البطل", "الخصم", "الحليف"],
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

    it("should analyze relationship types", async () => {
      const input: StandardAgentInput = {
        input: "حلل أنواع العلاقات بين الشخصيات",
        options: {},
        context: {
          originalText: "نص مع علاقات متنوعة",
          analyzeRelationshipTypes: true,
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should return text-only output without JSON blocks", async () => {
      const input: StandardAgentInput = {
        input: "ارسم شبكة الشخصيات",
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

    it("should identify central characters", async () => {
      const input: StandardAgentInput = {
        input: "حدد الشخصيات المحورية في الشبكة",
        options: {},
        context: {
          originalText: "نص مع شخصيات متعددة",
          identifyCentralCharacters: true,
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should analyze character alliances", async () => {
      const input: StandardAgentInput = {
        input: "حلل التحالفات بين الشخصيات",
        options: {},
        context: {
          originalText: "نص مع تحالفات معقدة",
          analyzeAlliances: true,
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should include context from previous stations", async () => {
      const input: StandardAgentInput = {
        input: "حلل شبكة الشخصيات",
        options: {},
        context: {
          originalText: "نص",
          previousStations: {
            characterAnalysis: "تحليل الشخصيات الفردية",
            plotAnalysis: "تحليل الحبكة",
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
        input: "حلل شبكة معقدة جداً من الشخصيات",
        options: {
          enableDebate: true,
          confidenceThreshold: 0.95,
          maxDebateRounds: 2,
        },
        context: {
          originalText: "نص معقد مع عشرات الشخصيات",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();

      if (result.confidence < 0.95) {
        expect(result.notes).toBeDefined();
      }
    });

    it("should handle uncertainty in relationship detection", async () => {
      const input: StandardAgentInput = {
        input: "حلل العلاقات مع سياق محدود",
        options: {
          enableUncertainty: true,
          confidenceThreshold: 0.7,
        },
        context: {
          originalText: "نص قصير مع علاقات غامضة",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it("should handle ambiguous relationships", async () => {
      const input: StandardAgentInput = {
        input: "حلل العلاقات الغامضة",
        options: {
          enableUncertainty: true,
          enableSelfCritique: true,
        },
        context: {
          originalText: "نص مع علاقات غير واضحة",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });

  describe("Hallucination Detection Path", () => {
    it("should detect and handle unsupported relationship claims", async () => {
      const input: StandardAgentInput = {
        input: "حلل العلاقات بناءً على النص فقط",
        options: {
          enableHallucination: true,
          confidenceThreshold: 0.75,
        },
        context: {
          originalText: "نص بسيط مع شخصيتين",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it("should maintain high confidence for clear relationships", async () => {
      const input: StandardAgentInput = {
        input: "حلل الشبكة",
        options: {
          enableHallucination: true,
          enableSelfCritique: true,
          confidenceThreshold: 0.75,
        },
        context: {
          originalText: "نص طويل مع علاقات واضحة ومحددة بين الشخصيات",
          characters: ["أحمد", "فاطمة", "خالد"],
          relationships: [
            { from: "أحمد", to: "فاطمة", type: "صداقة" },
            { from: "أحمد", to: "خالد", type: "عداء" },
          ],
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe("Post-Processing", () => {
    it("should clean JSON blocks from output", async () => {
      const input: StandardAgentInput = {
        input: "حلل الشبكة",
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

    it("should add appropriate notes based on network analysis", async () => {
      const input: StandardAgentInput = {
        input: "حلل الشبكة",
        options: {
          confidenceThreshold: 0.75,
        },
        context: {
          originalText: "نص درامي",
        },
      };

      const result = await agent.executeTask(input);

      expect(result.notes).toBeDefined();
      expect(typeof result.notes).toBe("string");
    });

    it("should include network metrics in metadata", async () => {
      const input: StandardAgentInput = {
        input: "حلل الشبكة",
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
        input: "حلل الشبكة",
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
        input: "حلل شبكة الشخصيات بشكل شامل",
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
        input: "حلل الشبكة",
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

  describe("Network Structure Analysis", () => {
    it("should identify network hubs", async () => {
      const input: StandardAgentInput = {
        input: "حدد المحاور الرئيسية في الشبكة",
        options: {},
        context: {
          originalText: "نص مع شخصيات مركزية",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should identify isolated characters", async () => {
      const input: StandardAgentInput = {
        input: "حدد الشخصيات المعزولة",
        options: {},
        context: {
          originalText: "نص مع شخصيات منعزلة",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should analyze network clusters", async () => {
      const input: StandardAgentInput = {
        input: "حلل التجمعات في الشبكة",
        options: {},
        context: {
          originalText: "نص مع مجموعات شخصيات",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should analyze relationship dynamics", async () => {
      const input: StandardAgentInput = {
        input: "حلل ديناميكيات العلاقات",
        options: {},
        context: {
          originalText: "نص مع علاقات متغيرة",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });

  describe("Integration with Standard Pattern", () => {
    it("should execute full standard pattern pipeline", async () => {
      const input: StandardAgentInput = {
        input:
          "حلل وارسم شبكة شاملة للعلاقات بين الشخصيات، مع تحديد المحاور والتحالفات والصراعات",
        options: {
          enableRAG: true,
          enableSelfCritique: true,
          enableConstitutional: true,
          enableUncertainty: true,
          enableHallucination: true,
          enableDebate: false,
        },
        context: {
          originalText:
            "قصة معقدة: أحمد البطل يتحالف مع فاطمة ضد خالد الخصم. سارة تقف في المنتصف محاولة التوفيق. علي صديق أحمد القديم يظهر لاحقاً.",
          characters: ["أحمد", "فاطمة", "خالد", "سارة", "علي"],
          analyzeRelationshipTypes: true,
          identifyCentralCharacters: true,
          analyzeAlliances: true,
          previousStations: {
            characterAnalysis: "تحليل مفصل لكل شخصية",
            plotAnalysis: "الحبكة تتمحور حول الصراع",
          },
        },
      };

      const result = await agent.executeTask(input);

      // Verify complete output structure
      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe("string");
      expect(result.text.length).toBeGreaterThan(50);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.notes).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.timestamp).toBeDefined();

      // Verify text-only output
      expect(result.text).not.toMatch(/\{.*:.*\}/);
      expect(result.text).not.toContain("```");
    });
  });
});
