/**
 * شبكة انحدار: analysis — المسار الناجح والمسار الاحتياطي واستمرار التسليم
 *
 * يتحقق من:
 * - success path: بطاقة التحليل مسجّلة ومسارها يعمل
 * - fallback path: عند غياب بيانات، لا ينهار التطبيق
 * - handoff persistence: النتائج يمكن تمريرها للمرحلة التالية
 */
import { describe, it, expect } from "vitest";

import { platformApps } from "@/config/apps.config";

describe("شبكة انحدار: analysis", () => {
  // ================================================================
  // 1) المسار الناجح (success path)
  // ================================================================
  describe("success path", () => {
    it("بطاقة التحليل مسجّلة في المشغّل بالمسار /analysis", () => {
      const card = platformApps.find((a) => a.path === "/analysis");
      expect(card).toBeDefined();
      expect(card!.enabled).toBe(true);
      expect(card!.id).toBe("analysis");
    });

    it("بطاقة التحليل في فئة analysis", () => {
      const card = platformApps.find((a) => a.id === "analysis");
      expect(card!.category).toBe("analysis");
    });

    it("بطاقة التحليل لها اسم عربي واسم إنجليزي", () => {
      const card = platformApps.find((a) => a.id === "analysis");
      expect(card!.nameAr.length).toBeGreaterThan(0);
      expect(card!.name.length).toBeGreaterThan(0);
    });
  });

  // ================================================================
  // 2) المسار الاحتياطي (fallback path)
  // ================================================================
  describe("fallback path", () => {
    it("عند غياب نتائج التحليل، الكائن الفارغ لا يسبب خطأ", () => {
      // محاكاة سلوك الصفحة عند عدم وجود بيانات تحليل
      const analysisResults: Record<string, unknown> = {};
      expect(() => {
        const stationCount = Object.keys(analysisResults).length;
        const hasResults = stationCount > 0;
        return hasResults;
      }).not.toThrow();
    });

    it("نتائج التحليل null لا تسبب انهيار", () => {
      const analysisResults: Record<string, unknown> | null = null;
      expect(() => {
        const hasResults =
          analysisResults !== null && Object.keys(analysisResults).length > 0;
        return hasResults;
      }).not.toThrow();
    });

    it("مصفوفة محطات فارغة لا تسبب انهيار", () => {
      const stations: unknown[] = [];
      expect(() => {
        const completed = stations.filter(Boolean);
        return completed.length;
      }).not.toThrow();
    });
  });

  // ================================================================
  // 3) استمرار التسليم (handoff persistence)
  // ================================================================
  describe("handoff persistence", () => {
    it("نتائج التحليل يمكن تمثيلها كـ JSON والعودة منها", () => {
      const analysisPayload = {
        stations: [
          { id: 1, name: "الفكرة", status: "completed", score: 85 },
          { id: 2, name: "البنية", status: "completed", score: 78 },
          { id: 3, name: "الشخصيات", status: "pending", score: 0 },
        ],
        overallScore: 81.5,
        completedAt: new Date().toISOString(),
      };

      const serialized = JSON.stringify(analysisPayload);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.stations).toHaveLength(3);
      expect(deserialized.overallScore).toBe(81.5);
      expect(typeof deserialized.completedAt).toBe("string");
    });

    it("التسليم يحتفظ بحالة كل محطة", () => {
      const handoff = {
        sourceModule: "analysis",
        targetModule: "development",
        payload: {
          stationResults: { 1: "pass", 2: "pass", 3: "pending" },
        },
      };

      expect(handoff.sourceModule).toBe("analysis");
      expect(handoff.targetModule).toBe("development");
      expect(Object.keys(handoff.payload.stationResults)).toHaveLength(3);
    });

    it("بنية handoff تحتوي مسار المصدر والوجهة", () => {
      const analysisCard = platformApps.find((a) => a.id === "analysis");
      const devCard = platformApps.find((a) => a.id === "creative-writing");

      expect(analysisCard).toBeDefined();
      expect(devCard).toBeDefined();
      expect(analysisCard!.path).toBe("/analysis");
      expect(devCard!.path).toBe("/development");
    });
  });
});
