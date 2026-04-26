/**
 * شبكة انحدار: تطابق بطاقات المشغّل مع المسارات الفعلية
 *
 * تمنع رجوع العطل: بطاقة تشير إلى مسار غير موجود أو مسار بدون بطاقة
 */
import { describe, it, expect } from "vitest";

import {
  platformApps,
  getAppById,
  getEnabledApps,
  getAppsByCategory,
  getEnabledAppsByCategory,
} from "@/config/apps.config";

// المسارات الحرجة التي يجب أن تكون مسجّلة في المشغّل
const CRITICAL_ROUTES = [
  "/arabic-creative-writing-studio",
  "/directors-studio",
  "/analysis",
  "/development",
  "/brain-storm-ai",
  "/cinematography-studio",
  "/breakdown",
  "/editor",
  "/BUDGET",
  "/actorai-arabic",
] as const;

describe("شبكة انحدار: تطابق بطاقات المشغّل", () => {
  // ------------------------------------------------------------------
  // 1) كل بطاقة تملك الحقول المطلوبة
  // ------------------------------------------------------------------
  it("كل بطاقة تملك id فريد و path يبدأ بـ /", () => {
    const ids = platformApps.map((a) => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    for (const app of platformApps) {
      expect(app.path).toMatch(/^\//);
      expect(app.name.length).toBeGreaterThan(0);
      expect(app.nameAr.length).toBeGreaterThan(0);
      expect(app.description.length).toBeGreaterThan(0);
      expect(app.icon.length).toBeGreaterThan(0);
      expect(app.color.length).toBeGreaterThan(0);
      expect(["production", "creative", "analysis", "management"]).toContain(
        app.category
      );
    }
  });

  // ------------------------------------------------------------------
  // 2) كل مسار حرج مسجّل في المشغّل
  // ------------------------------------------------------------------
  it("كل مسار حرج يملك بطاقة مفعّلة في platformApps", () => {
    const paths = platformApps.filter((a) => a.enabled).map((a) => a.path);
    for (const route of CRITICAL_ROUTES) {
      expect(paths).toContain(route);
    }
  });

  // ------------------------------------------------------------------
  // 3) getAppById يعيد التطبيق الصحيح
  // ------------------------------------------------------------------
  it("getAppById يعيد التطبيق المطابق أو undefined", () => {
    const first = platformApps[0];
    expect(getAppById(first.id)).toEqual(first);
    expect(getAppById("__nonexistent__")).toBeUndefined();
  });

  // ------------------------------------------------------------------
  // 4) getEnabledApps لا تُعيد تطبيقات معطّلة
  // ------------------------------------------------------------------
  it("getEnabledApps تعيد فقط المفعّلة", () => {
    const enabled = getEnabledApps();
    for (const app of enabled) {
      expect(app.enabled).toBe(true);
    }
    expect(enabled.length).toBeGreaterThan(0);
  });

  // ------------------------------------------------------------------
  // 5) الفئات الأربع لها تطبيقات
  // ------------------------------------------------------------------
  it("كل فئة من الأربع تملك تطبيقاً واحداً على الأقل", () => {
    for (const cat of [
      "production",
      "creative",
      "analysis",
      "management",
    ] as const) {
      const apps = getAppsByCategory(cat);
      expect(apps.length).toBeGreaterThan(0);
    }
  });

  // ------------------------------------------------------------------
  // 6) getEnabledAppsByCategory ⊆ getAppsByCategory
  // ------------------------------------------------------------------
  it("getEnabledAppsByCategory ترجع مجموعة فرعية من getAppsByCategory", () => {
    for (const cat of [
      "production",
      "creative",
      "analysis",
      "management",
    ] as const) {
      const all = getAppsByCategory(cat);
      const enabled = getEnabledAppsByCategory(cat);
      for (const app of enabled) {
        expect(all).toContainEqual(app);
        expect(app.enabled).toBe(true);
      }
    }
  });

  // ------------------------------------------------------------------
  // 7) لا يوجد مسارات مكررة
  // ------------------------------------------------------------------
  it("لا يوجد مساران يشيران لنفس الـ path", () => {
    const paths = platformApps.map((a) => a.path);
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(paths.length);
  });
});
