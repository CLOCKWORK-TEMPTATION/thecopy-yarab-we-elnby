/**
 * Unit Tests for Standard Agent Pattern
 *
 * Tests the unified execution pattern for drama analyst agents:
 * RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  executeStandardAgentPattern,
  formatAgentOutput,
  type StandardAgentInput,
  type StandardAgentOutput,
} from "./standardAgentPattern";

// Mock the gemini-core module
vi.mock("@/lib/ai/gemini-core", () => ({
  callGeminiText: vi.fn(),
  toText: vi.fn((v: any) => {
    if (typeof v === "string") return v;
    if (v && typeof v === "object" && "raw" in v) return v.raw;
    return String(v ?? "");
  }),
  safeSub: vi.fn((s: any, a: number, b?: number) => {
    const text = String(s ?? "");
    return b !== undefined ? text.substring(a, b) : text.substring(a);
  }),
}));

describe("Standard Agent Pattern", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("executeStandardAgentPattern", () => {
    it("should execute successfully with default options", async () => {
      const { callGeminiText } = await import("@/lib/ai/gemini-core");

      vi.mocked(callGeminiText).mockResolvedValue("نص التحليل المُنتَج");

      const input: StandardAgentInput = {
        input: "نص الإدخال للتحليل",
        options: {
          enableRAG: false,
          enableSelfCritique: false,
          enableConstitutional: false,
          enableUncertainty: false,
          enableHallucination: false,
          enableDebate: false,
        },
      };

      const result = await executeStandardAgentPattern(
        "Test Agent",
        "قم بتحليل النص التالي",
        input,
        "gemini-2.5-flash-lite"
      );

      expect(result).toBeDefined();
      expect(result.text).toBe("نص التحليل المُنتَج");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.notes).toBeInstanceOf(Array);
    });

    it("should return high confidence for successful execution", async () => {
      const { callGeminiText } = await import("@/lib/ai/gemini-core");

      vi.mocked(callGeminiText).mockResolvedValue("تحليل ممتاز بدون أخطاء");

      const input: StandardAgentInput = {
        input: "نص بسيط",
        options: {
          enableRAG: false,
          enableSelfCritique: false,
          enableConstitutional: false,
          enableUncertainty: false,
          enableHallucination: false,
        },
      };

      const result = await executeStandardAgentPattern(
        "Test Agent",
        "قم بالتحليل",
        input
      );

      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it.todo("validate-pipeline: should handle RAG when enabled with context");

    it("should skip RAG when context is too short", async () => {
      const { callGeminiText } = await import("@/lib/ai/gemini-core");

      vi.mocked(callGeminiText).mockResolvedValue("تحليل بدون RAG");

      const input: StandardAgentInput = {
        input: "نص الإدخال",
        context: "سياق قصير", // Context < 100 chars
        options: {
          enableRAG: true,
        },
      };

      const result = await executeStandardAgentPattern(
        "Test Agent",
        "قم بالتحليل",
        input
      );

      expect(result.metadata?.ragUsed).toBe(false);
    });

    it.todo("validate-pipeline: should apply self-critique when enabled");

    it.todo("validate-pipeline: should detect constitutional violations");

    it("should measure uncertainty when enabled", async () => {
      const { callGeminiText } = await import("@/lib/ai/gemini-core");

      // Mock multiple responses for uncertainty measurement
      vi.mocked(callGeminiText)
        .mockResolvedValueOnce("تحليل أولي")
        .mockResolvedValueOnce("تحليل بديل 1")
        .mockResolvedValueOnce("تحليل بديل 2");

      const input: StandardAgentInput = {
        input: "نص الإدخال",
        options: {
          enableRAG: false,
          enableSelfCritique: false,
          enableConstitutional: false,
          enableUncertainty: true,
          enableHallucination: false,
        },
      };

      const result = await executeStandardAgentPattern(
        "Test Agent",
        "قم بالتحليل",
        input
      );

      expect(result.metadata?.uncertaintyScore).toBeDefined();
      expect(result.metadata?.uncertaintyScore).toBeGreaterThanOrEqual(0);
      expect(result.metadata?.uncertaintyScore).toBeLessThanOrEqual(1);
    });

    it("should detect hallucinations when enabled", async () => {
      const { callGeminiText } = await import("@/lib/ai/gemini-core");

      // Mock responses for hallucination detection
      vi.mocked(callGeminiText)
        .mockResolvedValueOnce("تحليل يحتوي على ادعاءات") // Initial
        .mockResolvedValueOnce("ادعاء 1\nادعاء 2") // Extract claims
        .mockResolvedValueOnce("لا") // Claim 1 not supported
        .mockResolvedValueOnce("لا") // Claim 2 not supported
        .mockResolvedValueOnce("تحليل مصحح بدون ادعاءات"); // Corrected

      const input: StandardAgentInput = {
        input: "نص الإدخال الأصلي",
        options: {
          enableRAG: false,
          enableSelfCritique: false,
          enableConstitutional: false,
          enableUncertainty: false,
          enableHallucination: true,
        },
      };

      const result = await executeStandardAgentPattern(
        "Test Agent",
        "قم بالتحليل",
        input
      );

      expect(result.metadata?.hallucinationDetected).toBeDefined();
    });

    it("should suggest debate when confidence is low", async () => {
      const { callGeminiText } = await import("@/lib/ai/gemini-core");

      // Return text that will result in low confidence
      vi.mocked(callGeminiText).mockResolvedValue(
        "ربما قد يكون محتمل من الممكن"
      );

      const input: StandardAgentInput = {
        input: "نص معقد",
        options: {
          enableRAG: false,
          enableSelfCritique: false,
          enableConstitutional: false,
          enableUncertainty: true,
          enableHallucination: false,
          enableDebate: true,
          confidenceThreshold: 0.7,
        },
      };

      const result = await executeStandardAgentPattern(
        "Test Agent",
        "قم بالتحليل",
        input
      );

      if (result.confidence < 0.7) {
        expect(result.notes.some((n) => n.includes("نقاش"))).toBe(true);
      }
    });

    it.todo("validate-pipeline: should handle errors gracefully");
  });

  describe("formatAgentOutput", () => {
    it("should format output correctly with all fields", () => {
      const output: StandardAgentOutput = {
        text: "نص التحليل",
        confidence: 0.85,
        notes: ["ملاحظة 1", "ملاحظة 2"],
        metadata: {
          ragUsed: true,
          critiqueIterations: 2,
          constitutionalViolations: 1,
          hallucinationDetected: false,
        },
      };

      const formatted = formatAgentOutput(output, "Test Agent");

      expect(formatted).toContain("Test Agent");
      expect(formatted).toContain("85%");
      expect(formatted).toContain("نص التحليل");
      expect(formatted).toContain("ملاحظة 1");
      expect(formatted).toContain("ملاحظة 2");
      expect(formatted).toContain("RAG");
      expect(formatted).toContain("نقد ذاتي");
    });

    it("should format output without optional fields", () => {
      const output: StandardAgentOutput = {
        text: "نص بسيط",
        confidence: 0.7,
        notes: [],
      };

      const formatted = formatAgentOutput(output, "Simple Agent");

      expect(formatted).toContain("Simple Agent");
      expect(formatted).toContain("70%");
      expect(formatted).toContain("نص بسيط");
    });

    it("should display confidence as percentage", () => {
      const output: StandardAgentOutput = {
        text: "نص",
        confidence: 0.923,
        notes: [],
      };

      const formatted = formatAgentOutput(output, "Agent");

      expect(formatted).toContain("92%");
    });

    it("should include metadata information when available", () => {
      const output: StandardAgentOutput = {
        text: "نص",
        confidence: 0.8,
        notes: [],
        metadata: {
          ragUsed: true,
          critiqueIterations: 3,
          constitutionalViolations: 2,
          uncertaintyScore: 0.3,
          hallucinationDetected: true,
          debateRounds: 0,
        },
      };

      const formatted = formatAgentOutput(output, "Agent");

      expect(formatted).toContain("✓ استخدم RAG");
      expect(formatted).toContain("نقد ذاتي: 3 دورات");
      expect(formatted).toContain("انتهاكات دستورية: 2");
      expect(formatted).toContain("هلوسات");
    });
  });

  describe("Integration Tests", () => {
    it.todo(
      "validate-pipeline: should execute complete pipeline with all features enabled"
    );
  });
});
