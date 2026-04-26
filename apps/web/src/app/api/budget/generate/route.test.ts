/**
 * اختبارات وحدة لمسار إنشاء الميزانية
 *
 * @description
 * يختبر منطق إنشاء الميزانية باستخدام Gemini API
 * بدون الحاجة إلى server جاري
 */

import { INITIAL_BUDGET_TEMPLATE } from "@/app/(main)/BUDGET/lib/constants";
import { generateBudgetFromScript } from "@/app/(main)/BUDGET/lib/geminiService";

import { POST } from "../route";

// Mock Gemini service
jest.mock("@/app/(main)/BUDGET/lib/geminiService", () => ({
  generateBudgetFromScript: jest.fn(),
}));

const mockGenerateBudgetFromScript =
  generateBudgetFromScript as jest.MockedFunction<
    typeof generateBudgetFromScript
  >;

describe("/api/budget/generate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST", () => {
    it("ينشئ ميزانية بنجاح مع سيناريو صالح", async () => {
      const mockBudget = {
        ...INITIAL_BUDGET_TEMPLATE,
        grandTotal: 50000,
        metadata: { title: "Test Movie" },
      };

      mockGenerateBudgetFromScript.mockResolvedValue(mockBudget);

      const request = new Request("http://localhost/api/budget/generate", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Movie",
          scenario:
            "This is a test scenario for a movie production that should be long enough to pass validation.",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.budget).toEqual(mockBudget);
      expect(mockGenerateBudgetFromScript).toHaveBeenCalledWith(
        "This is a test scenario for a movie production that should be long enough to pass validation.",
        INITIAL_BUDGET_TEMPLATE
      );
    });

    it("يرفض سيناريو قصير جداً", async () => {
      const request = new Request("http://localhost/api/budget/generate", {
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
      const request = new Request("http://localhost/api/budget/generate", {
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

    it("يحدث البيانات الوصفية بالعنوان", async () => {
      const mockBudget = {
        ...INITIAL_BUDGET_TEMPLATE,
        grandTotal: 75000,
      };

      mockGenerateBudgetFromScript.mockResolvedValue(mockBudget);

      const request = new Request("http://localhost/api/budget/generate", {
        method: "POST",
        body: JSON.stringify({
          title: "Updated Title",
          scenario:
            "This is a detailed scenario for testing metadata update functionality.",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.budget.metadata?.title).toBe("Updated Title");
    });

    it("يعالج خطأ Gemini API", async () => {
      mockGenerateBudgetFromScript.mockRejectedValue(
        new Error("Gemini API error")
      );

      const request = new Request("http://localhost/api/budget/generate", {
        method: "POST",
        body: JSON.stringify({
          scenario: "This is a valid scenario for testing error handling.",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request as any);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Gemini API error");
    });

    it("يعالج خطأ غير متوقع", async () => {
      mockGenerateBudgetFromScript.mockRejectedValue("string error");

      const request = new Request("http://localhost/api/budget/generate", {
        method: "POST",
        body: JSON.stringify({
          scenario: "This is a valid scenario for testing unexpected error.",
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
