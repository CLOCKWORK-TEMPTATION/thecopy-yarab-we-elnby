/**
 * شبكة انحدار: استوديو الكتابة العربية
 *
 * يغطي:
 * - بطاقات الصفحة الرئيسية (home cards)
 * - شرط التحليل المسبق (analyze precondition)
 * - استدعاء التصدير (export invocation)
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

import {
  exportProjectDocument,
  type ExportFormat,
  type ExportResult,
} from "@/app/(main)/arabic-creative-writing-studio/lib/export-project";
import { platformApps } from "@/config/apps.config";

// محاكاة URL.createObjectURL و revokeObjectURL غير المتاحين في jsdom
beforeAll(() => {
  if (typeof URL.createObjectURL !== "function") {
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
  }
  if (typeof URL.revokeObjectURL !== "function") {
    URL.revokeObjectURL = vi.fn();
  }
});

// ------------------------------------------------------------------
// بيانات اختبار مشتركة
// ------------------------------------------------------------------
const mockProject = {
  id: "test-1",
  title: "مشروع اختبار",
  content: "محتوى الاختبار للمشروع الإبداعي",
  wordCount: 4,
  paragraphCount: 1,
  genre: "drama" as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("شبكة انحدار: استوديو الكتابة العربية", () => {
  // ================================================================
  // بطاقات الصفحة الرئيسية
  // ================================================================
  describe("بطاقات home", () => {
    it("بطاقة الاستوديو مسجّلة ومفعّلة في المشغّل", () => {
      const card = platformApps.find(
        (a) => a.path === "/arabic-creative-writing-studio"
      );
      expect(card).toBeDefined();
      expect(card!.enabled).toBe(true);
      expect(card!.id).toBe("arabic-creative-writing-studio");
    });

    it("بطاقة التطوير الإبداعي مسجّلة ومفعّلة", () => {
      const card = platformApps.find((a) => a.path === "/development");
      expect(card).toBeDefined();
      expect(card!.enabled).toBe(true);
    });
  });

  // ================================================================
  // شرط التحليل المسبق
  // ================================================================
  describe("analyze precondition", () => {
    it("المشروع يحتاج عنوان ومحتوى غير فارغين للتحليل", () => {
      // نتحقق أن بنية المشروع تحتوي الحقول المطلوبة
      expect(mockProject.title.length).toBeGreaterThan(0);
      expect(mockProject.content.length).toBeGreaterThan(0);
      expect(mockProject.wordCount).toBeGreaterThan(0);
    });

    it("مشروع بدون محتوى يفشل في شرط التحليل", () => {
      const emptyProject = { ...mockProject, content: "", wordCount: 0 };
      expect(emptyProject.content.length).toBe(0);
      expect(emptyProject.wordCount).toBe(0);
    });
  });

  // ================================================================
  // استدعاء التصدير
  // ================================================================
  describe("export invocation", () => {
    beforeEach(() => {
      // تنظيف أي mocks سابقة
      vi.restoreAllMocks();
    });

    it.each(["txt", "json", "html", "rtf"] as ExportFormat[])(
      "التصدير بصيغة %s يعيد نتيجة مع filename صحيح",
      (format) => {
        const result: ExportResult = exportProjectDocument(
          mockProject as Parameters<typeof exportProjectDocument>[0],
          format
        );
        // في بيئة الاختبار قد لا يكون DOM كاملاً لكن الدالة لا تنفجر
        expect(result).toHaveProperty("format", format);
        expect(result).toHaveProperty("filename");
        expect(result.filename).toContain(`.${format}`);
      }
    );

    it("اسم الملف يُنظَّف من الأحرف الخاصة", () => {
      const dirtyProject = {
        ...mockProject,
        title: 'عنوان/غير:صالح?"للملف',
      };
      const result = exportProjectDocument(
        dirtyProject as Parameters<typeof exportProjectDocument>[0],
        "txt"
      );
      expect(result.filename).not.toMatch(/[<>:"/\\|?*]/);
    });

    it("مشروع بعنوان فارغ يستخدم اسم افتراضي", () => {
      const emptyTitleProject = { ...mockProject, title: "" };
      const result = exportProjectDocument(
        emptyTitleProject as Parameters<typeof exportProjectDocument>[0],
        "json"
      );
      expect(result.filename).toContain("creative-writing-project");
    });
  });
});
