import { describe, it, expect, beforeEach, vi } from "vitest";

import { TaskType } from "@core/enums";

import { StandardAgentInput } from "../shared/standardAgentPattern";

import { AudienceResonanceAgent } from "./AudienceResonanceAgent";

// Mock geminiService
vi.mock("@/ai/gemini-service", () => ({
  geminiService: {
    generateContent: vi
      .fn()
      .mockResolvedValue("Mock AI response for audience resonance analysis"),
  },
}));

// Mock gemini-core
vi.mock("@/lib/ai/gemini-core", () => ({
  callGeminiText: vi.fn().mockResolvedValue("Mock Gemini text response"),
  toText: vi.fn((text: string) => text),
  safeSub: vi.fn((text: string) => text),
}));

describe("AudienceResonanceAgent", () => {
  let agent: AudienceResonanceAgent;

  beforeEach(() => {
    agent = new AudienceResonanceAgent();
    vi.clearAllMocks();
  });

  describe("Configuration", () => {
    it("should initialize with correct configuration", () => {
      const config = agent.getConfig();

      expect(config.name).toBe("EmpathyMatrix AI");
      expect(config.taskType).toBe(TaskType.AUDIENCE_RESONANCE);
      expect(config.confidenceFloor).toBe(0.75);
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
    it("should execute audience resonance analysis successfully", async () => {
      const input: StandardAgentInput = {
        input: "حلل صدى هذا المحتوى الدرامي مع الجمهور المستهدف",
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
          originalText: "نص درامي يتناول قضايا اجتماعية معاصرة",
          targetAudience: {
            demographics: {
              ageRange: "25-40",
              gender: "متنوع",
              education: "جامعي",
              culturalBackground: "عربي",
              socioeconomicStatus: "متوسط",
            },
            psychographics: {
              values: ["العدالة الاجتماعية", "الأسرة", "التطور الشخصي"],
              interests: ["الدراما الواقعية", "القضايا الاجتماعية"],
              lifestyle: "حضري",
              emotionalTriggers: ["التعاطف", "الإلهام", "التفكير"],
            },
            preferences: {
              genrePreferences: ["دراما اجتماعية", "واقعية"],
              contentStyle: "عميق ومؤثر",
              complexity: "متوسط إلى عالي",
            },
          },
          contentType: "مسلسل درامي",
          platform: "تلفزيون / منصات رقمية",
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

    it("should return text-only output without JSON blocks", async () => {
      const input: StandardAgentInput = {
        input: "حلل الصدى الجماهيري المتوقع",
        options: {
          enableRAG: true,
        },
        context: {
          originalText: "محتوى درامي عن علاقات أسرية",
          targetAudience: {
            demographics: {
              ageRange: "30-50",
            },
          },
        },
      };

      const result = await agent.executeTask(input);

      // Ensure output is clean text
      expect(result.text).not.toContain("```json");
      expect(result.text).not.toContain("```");
      expect(result.text).not.toMatch(/\{[^}]*"[^"]*":[^}]*\}/);
    });

    it("should analyze audience segments appropriately", async () => {
      // اختبار تحليل شرائح الجمهور بشكل مناسب
      const input: StandardAgentInput = {
        input: "حلل صدى المحتوى عبر شرائح جماهير مختلفة",
        options: {
          enableRAG: true,
        },
        context: {
          originalText: "محتوى درامي",
          targetAudience: {
            demographics: {
              ageRange: "25-50",
              gender: "متنوع",
            },
          },
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should include emotional resonance assessment", async () => {
      const input: StandardAgentInput = {
        input: "قيّم الصدى العاطفي المتوقع للمحتوى",
        options: {
          enableSelfCritique: true,
        },
        context: {
          originalText: "قصة مؤثرة عن الأمل والصمود في وجه الشدائد",
          targetAudience: {
            psychographics: {
              emotionalTriggers: ["التعاطف", "الإلهام", "الأمل"],
              values: ["التفاؤل", "القوة الداخلية"],
            },
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
        input: "حلل صدى محتوى معقد ومتعدد الطبقات",
        options: {
          enableDebate: true,
          confidenceThreshold: 0.9,
          maxDebateRounds: 2,
        },
        context: {
          originalText: "عمل درامي تجريبي مع رسائل متعددة",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();

      expect(result.confidence >= 0.9 || result.notes !== undefined).toBe(true);
    });

    it("should handle uncertainty in audience predictions", async () => {
      const input: StandardAgentInput = {
        input: "توقع استجابة الجمهور مع بيانات محدودة",
        options: {
          enableUncertainty: true,
          confidenceThreshold: 0.7,
        },
        context: {
          originalText: "محتوى جديد بدون نماذج سابقة",
          targetAudience: {},
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it("should handle diverse audience segments with conflicting preferences", async () => {
      const input: StandardAgentInput = {
        input: "حلل صدى محتوى مثير للجدل",
        options: {
          enableSelfCritique: true,
          enableConstitutional: true,
          confidenceThreshold: 0.75,
        },
        context: {
          originalText: "عمل يتناول قضايا جدلية ومثيرة للنقاش",
          targetAudience: {
            demographics: {
              ageRange: "18-65",
              culturalBackground: "متنوع",
            },
            psychographics: {
              values: ["متنوعة ومتضاربة أحياناً"],
            },
          },
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });

  describe("Hallucination Detection Path", () => {
    it("should detect and handle unsupported audience predictions", async () => {
      const input: StandardAgentInput = {
        input: "حلل الصدى بدقة بناءً على البيانات المتاحة فقط",
        options: {
          enableHallucination: true,
          confidenceThreshold: 0.75,
        },
        context: {
          originalText: "نص درامي قصير",
          targetAudience: {
            demographics: {
              ageRange: "25-35",
            },
          },
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();

      expect(
        !result.metadata?.hallucinationDetected ||
          result.notes.includes("تصحيح هلوسة")
      ).toBe(true);
    });

    it("should verify claims against provided context", async () => {
      const input: StandardAgentInput = {
        input: "قدم تحليلاً موثقاً للصدى الجماهيري",
        options: {
          enableHallucination: true,
          enableConstitutional: true,
        },
        context: {
          originalText: "محتوى درامي مع ثيمات محددة",
          targetAudience: {
            psychographics: {
              values: ["الصدق", "الشفافية"],
            },
          },
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  describe("Post-Processing Quality", () => {
    it("should assess comprehensiveness of analysis", async () => {
      const input: StandardAgentInput = {
        input: "قدم تحليلاً شاملاً ومفصلاً للصدى الجماهيري",
        options: {
          enableSelfCritique: true,
        },
        context: {
          originalText: "عمل درامي متكامل مع شخصيات معقدة وحبكة متعددة الطبقات",
          targetAudience: {
            demographics: {
              ageRange: "25-45",
              education: "جامعي",
            },
            psychographics: {
              values: ["العمق", "الأصالة", "التأثير الاجتماعي"],
              interests: ["الدراما الفكرية", "القضايا المعاصرة"],
            },
          },
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.metadata?.["comprehensiveness"]).toBeDefined();
      expect(result.metadata?.["comprehensiveness"]).toBeGreaterThanOrEqual(0);
      expect(result.metadata?.["comprehensiveness"]).toBeLessThanOrEqual(1);
    });

    it("should assess insight depth", async () => {
      const input: StandardAgentInput = {
        input: "قدم رؤى عميقة حول الصدى النفسي والعاطفي",
        options: {},
        context: {
          originalText: "محتوى يتناول الصراعات الداخلية والتحولات النفسية",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.metadata?.["insightDepth"]).toBeDefined();
      expect(result.metadata?.["insightDepth"]).toBeGreaterThanOrEqual(0);
      expect(result.metadata?.["insightDepth"]).toBeLessThanOrEqual(1);
    });

    it("should assess actionability of recommendations", async () => {
      const input: StandardAgentInput = {
        input: "قدم توصيات قابلة للتطبيق لتحسين الصدى الجماهيري",
        options: {
          enableSelfCritique: true,
        },
        context: {
          originalText: "عمل درامي يحتاج تحسين",
          targetAudience: {
            demographics: {
              ageRange: "18-40",
            },
          },
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.metadata?.["actionability"]).toBeDefined();
      expect(result.metadata?.["actionability"]).toBeGreaterThanOrEqual(0);
      expect(result.metadata?.["actionability"]).toBeLessThanOrEqual(1);
    });

    it("should generate appropriate notes based on quality metrics", async () => {
      const input: StandardAgentInput = {
        input: "حلل الصدى الجماهيري بشكل شامل",
        options: {},
        context: {
          originalText: "محتوى درامي جيد",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.notes).toBeDefined();
      expect(Array.isArray(result.notes)).toBe(true);
      expect(result.notes.length).toBeGreaterThan(0);
    });
  });

  describe("Advanced Options Tests", () => {
    it("should respect temperature setting", async () => {
      const input: StandardAgentInput = {
        input: "حلل الصدى",
        options: {
          temperature: 0.1,
        },
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
    });

    it("should handle previous response patterns", async () => {
      const input: StandardAgentInput = {
        input: "حلل الصدى بناءً على الأنماط السابقة",
        options: {},
        context: {
          originalText: "محتوى مشابه للأعمال السابقة",
          previousResponses: [
            {
              audienceSegment: "الشباب (18-25)",
              response: "إيجابية جداً",
              resonanceScore: 8.5,
            },
            {
              audienceSegment: "البالغون (35-50)",
              response: "مختلطة",
              resonanceScore: 6.0,
            },
          ],
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it("should handle platform-specific analysis", async () => {
      const input: StandardAgentInput = {
        input: "حلل الصدى حسب المنصة",
        options: {},
        context: {
          originalText: "محتوى قصير مناسب لوسائل التواصل",
          platform: "Instagram / TikTok",
          targetAudience: {
            demographics: {
              ageRange: "18-30",
            },
          },
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });

  describe("Error Handling", () => {
    it("should handle missing context gracefully", async () => {
      const input: StandardAgentInput = {
        input: "حلل الصدى الجماهيري",
        options: {},
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it("should provide fallback response on error", async () => {
      // Mock error in geminiService
      const { callGeminiText } = await import("@/lib/ai/gemini-core");
      vi.mocked(callGeminiText).mockRejectedValueOnce(new Error("API Error"));

      const input: StandardAgentInput = {
        input: "حلل الصدى",
        options: {},
        context: {},
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeLessThan(0.5);
    });

    it("should handle invalid audience profile", async () => {
      const input: StandardAgentInput = {
        input: "حلل الصدى",
        options: {},
        context: {
          targetAudience: null,
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });
  });

  describe("Integration Tests", () => {
    it("should execute full pipeline with all modules enabled", async () => {
      const input: StandardAgentInput = {
        input: "حلل الصدى الجماهيري بشكل كامل ومفصل",
        options: {
          enableRAG: true,
          enableSelfCritique: true,
          enableConstitutional: true,
          enableUncertainty: true,
          enableHallucination: true,
          enableDebate: false,
          confidenceThreshold: 0.75,
          maxIterations: 2,
        },
        context: {
          originalText: "عمل درامي اجتماعي يتناول قضايا معاصرة بعمق وحساسية",
          targetAudience: {
            demographics: {
              ageRange: "25-50",
              gender: "متنوع",
              education: "متوسط إلى عالي",
              culturalBackground: "عربي",
              socioeconomicStatus: "متوسط",
            },
            psychographics: {
              values: ["العدالة", "الأسرة", "التطور"],
              interests: ["الدراما الواقعية", "القضايا الاجتماعية"],
              lifestyle: "حضري",
              emotionalTriggers: ["التعاطف", "الإلهام"],
            },
            preferences: {
              genrePreferences: ["دراما اجتماعية"],
              contentStyle: "عميق ومؤثر",
              complexity: "متوسط",
            },
          },
          contentType: "مسلسل",
          platform: "تلفزيون / VOD",
        },
      };

      const result = await agent.executeTask(input);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.metadata).toBeDefined();
      expect(result.notes).toBeDefined();

      // Check metadata completeness
      expect(result.metadata?.ragUsed).toBeDefined();
      expect(result.metadata?.critiqueIterations).toBeGreaterThanOrEqual(0);
      expect(result.metadata?.constitutionalViolations).toBeGreaterThanOrEqual(
        0
      );
      expect(result.metadata?.uncertaintyScore).toBeGreaterThanOrEqual(0);
      expect(result.metadata?.hallucinationDetected).toBeDefined();
    });

    it("should maintain text-only output through entire pipeline", async () => {
      const input: StandardAgentInput = {
        input: "تحليل شامل",
        options: {
          enableRAG: true,
          enableSelfCritique: true,
          enableConstitutional: true,
          enableUncertainty: true,
          enableHallucination: true,
        },
        context: {
          originalText: "محتوى درامي",
          targetAudience: {
            demographics: { ageRange: "20-40" },
          },
        },
      };

      const result = await agent.executeTask(input);

      // Strict JSON-free verification
      expect(result.text).not.toMatch(/```/);
      expect(result.text).not.toMatch(/\{[\s\S]*?"[^"]*"\s*:[\s\S]*?\}/);
      expect(result.text).not.toMatch(/"[^"]*"\s*:\s*"[^"]*"/);
      expect(result.text).not.toMatch(/^\s*\{/);
      expect(result.text).not.toMatch(/\}\s*$/);
    });
  });
});
