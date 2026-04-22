/**
 * اختبارات وحدة لمسار تحليل الميزانية
 *
 * @description
 * يختبر منطق تحليل السيناريو باستخدام Gemini API
 * بدون الحاجة إلى server جاري
 */

import { POST } from "../route";
import { geminiService } from "@/app/(main)/BUDGET/lib/geminiService";

// Mock Gemini service
jest.mock("@/app/(main)/BUDGET/lib/geminiService", () => ({
  geminiService: {
    analyzeScript: jest.fn(),
  },
}));

const mockAnalyzeScript = geminiService.analyzeScript as jest.MockedFunction<
  typeof geminiService.analyzeScript
>;

describe("/api/budget/analyze", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST", () => {
    it("يحلل السيناريو بنجاح مع سيناريو صالح", async () => {
      const mockAnalysis = {
        summary: "Test analysis summary",
        recommendations: ["Rec 1", "Rec 2"],
        riskFactors: ["Risk 1"],
        costOptimization: ["Opt 1"],
        shootingSchedule: {
          totalDays: 30,
          phases: {
            preProduction: 10,
            production: 15,
            postProduction: 5,
          },
        },
      };

      mockAnalyzeScript.mockResolvedValue(mockAnalysis);

      const request = new Request("http://localhost/api/budget/analyze", {
        method: "POST",
        body: JSON.stringify({
          scenario:
            "This is a test scenario for analysis that should be long enough.",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.analysis).toEqual(mockAnalysis);
      expect(mockAnalyzeScript).toHaveBeenCalledWith(
        "This is a test scenario for analysis that should be long enough."
      );
    });

    it("يرفض سيناريو قصير جداً", async () => {
      const request = new Request("http://localhost/api/budget/analyze", {
        method: "POST",
        body: JSON.stringify({
          scenario: "short",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain("السيناريو قصير جداً");
    });

    it("يرفض طلب بدون سيناريو", async () => {
      const request = new Request("http://localhost/api/budget/analyze", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain("السيناريو مطلوب");
    });

    it("يعالج خطأ Gemini API", async () => {
      mockAnalyzeScript.mockRejectedValue(new Error("Gemini analysis error"));

      const request = new Request("http://localhost/api/budget/analyze", {
        method: "POST",
        body: JSON.stringify({
          scenario:
            "This is a valid scenario for testing error handling in analysis.",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request as any);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Gemini analysis error");
    });

    it("يعالج خطأ غير متوقع", async () => {
      mockAnalyzeScript.mockRejectedValue("unexpected error");

      const request = new Request("http://localhost/api/budget/analyze", {
        method: "POST",
        body: JSON.stringify({
          scenario:
            "This is a valid scenario for testing unexpected error handling.",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request as any);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toContain("حدث خطأ غير متوقع");
    });
  });
});
