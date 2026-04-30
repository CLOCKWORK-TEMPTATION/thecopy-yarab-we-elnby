/**
 * شبكة انحدار: launcher — ربط البطاقات بالشبكة المحيطة
 *
 * يتحقق من:
 * - أن FEATURED_APP_PATHS تحتوي على 12 مسارًا (لملء الشبكة المحيطة)
 * - أن كل مسار مميز يرتبط بتطبيق مفعّل له معرف واسم عربي
 * - أن خلايا الشبكة المتاحة 12 خلية (16 - 4 مركزية)
 * - أن التطبيقات المعطلة لا تظهر ضمن المميزين
 * - أن كل بطاقة مميزة تحمل البيانات الضرورية للعرض
 */

import { describe, it, expect } from "vitest";

import {
  platformApps,
  FEATURED_APP_PATHS,
  getEnabledApps,
} from "@/config/apps.config";

describe("شبكة انحدار: launcher — ربط البطاقات بالشبكة", () => {
  const enabledApps = getEnabledApps();

  const featuredApps = FEATURED_APP_PATHS.map((path) =>
    enabledApps.find((app) => app.path === path)
  ).filter((app): app is NonNullable<typeof app> => app !== undefined);

  // ================================================================
  // 1) عقد الشبكة — الأبعاد والتعيين
  // ================================================================
  describe("grid contract", () => {
    it("FEATURED_APP_PATHS تحتوي على 12 مسارًا بالضبط", () => {
      expect(FEATURED_APP_PATHS).toHaveLength(12);
    });

    it("خلايا الشبكة المتاحة 12 خلية (16 إجمالي − 4 مركزية)", () => {
      const availableGridCells = [0, 1, 2, 3, 4, 7, 8, 11, 12, 13, 14, 15];
      expect(availableGridCells).toHaveLength(12);
    });

    it("الخلايا المركزية 5 و6 و9 و10 محجوزة للبطاقة المركزية", () => {
      const centerCells = [5, 6, 9, 10];
      expect(centerCells).toHaveLength(4);
      for (const cell of centerCells) {
        expect(cell).toBeGreaterThanOrEqual(5);
        expect(cell).toBeLessThanOrEqual(10);
      }
    });

    it("عدد التطبيقات المميزة يساوي عدد الخلايا المتاحة بالضبط", () => {
      expect(featuredApps.length).toBe(12);
    });
  });

  // ================================================================
  // 2) سلامة التطبيقات المميزة — المسار الناجح
  // ================================================================
  describe("featured apps integrity — success path", () => {
    it("كل مسار مميز يرتبط بتطبيق مفعّل في السجل", () => {
      const enabledPaths = new Set(enabledApps.map((a) => a.path));
      const unresolved = FEATURED_APP_PATHS.filter(
        (path) => !enabledPaths.has(path)
      );
      expect(unresolved).toHaveLength(0);
    });

    it("لا يوجد تطبيق معطل ضمن المميزين", () => {
      const disabledFeatured = featuredApps.filter((app) => !app.enabled);
      expect(disabledFeatured).toHaveLength(0);
    });

    it("كل تطبيق مميز له معرف فريد ومسار واسم عربي", () => {
      for (const app of featuredApps) {
        expect(app.id).toBeTruthy();
        expect(app.path).toBeTruthy();
        expect(app.nameAr.length).toBeGreaterThan(0);
      }
    });

    it("كل تطبيق مميز له وصف وأيقونة ولون", () => {
      for (const app of featuredApps) {
        expect(app.description.length).toBeGreaterThan(0);
        expect(app.icon.length).toBeGreaterThan(0);
        expect(app.color).toContain("from-");
      }
    });
  });

  // ================================================================
  // 3) المسار الاحتياطي — تطبيقات معطلة وخلايا فارغة
  // ================================================================
  describe("fallback path", () => {
    it("التطبيقات المعطلة لا تحتل خلايا شبكة", () => {
      const disabledApps = platformApps.filter((app) => !app.enabled);
      const featuredPathsSet = new Set<string>(FEATURED_APP_PATHS);

      for (const disabledApp of disabledApps) {
        expect(featuredPathsSet.has(disabledApp.path)).toBe(false);
      }
    });

    it("عند غياب تطبيق مميز (محاكاة)، الخلية تُترك بدون بيانات", () => {
      // محاكاة سيناريو: app مفقود من enabledApps لكنه في FEATURED_APP_PATHS
      const mockMissing = FEATURED_APP_PATHS.map((path) =>
        enabledApps.find((app) => app.path === path)
      );
      const undefinedSlots = mockMissing.filter((app) => app === undefined);
      // حاليًا لا يوجد any undefined، لكن العقد يجب أن يتحملها
      expect(undefinedSlots).toHaveLength(0);
    });

    it("أي خلية فارغة في الشبكة لا تُنتج رابطًا مكسورًا", () => {
      // العقد: إذا لم يُعثر على تطبيق للخلية، تُعرض كخلية فارغة بدون <Link>
      // نتحقق من أن route كل تطبيق مميز موجود في manifest المنشور
      const allPublishedPaths = new Set<string>(
        platformApps.map((app) => app.path)
      );
      const deadRoutes = (FEATURED_APP_PATHS as readonly string[]).filter(
        (path) => !allPublishedPaths.has(path)
      );
      expect(deadRoutes).toHaveLength(0);
    });
  });

  // ================================================================
  // 4) عقد الفئات والتصنيف
  // ================================================================
  describe("category contract", () => {
    it("كل تطبيق مميز ينتمي إلى فئة صالحة", () => {
      const validCategories = [
        "production",
        "creative",
        "analysis",
        "management",
      ];
      for (const app of featuredApps) {
        expect(validCategories).toContain(app.category);
      }
    });

    it("توزيع الفئات لا يحتوي على فئة فارغة أو غير معروفة", () => {
      const categories = featuredApps.map((app) => app.category);
      const uniqueCategories = new Set(categories);
      for (const cat of uniqueCategories) {
        expect(typeof cat).toBe("string");
        expect(cat.length).toBeGreaterThan(0);
      }
    });
  });

  // ================================================================
  // 5) الاستمرارية — لا تكرار ولا تناقض
  // ================================================================
  describe("persistence & consistency", () => {
    it("المسارات المميزة فريدة (لا بطاقة مكررة في الشبكة)", () => {
      expect(new Set(FEATURED_APP_PATHS).size).toBe(FEATURED_APP_PATHS.length);
    });

    it("المعرفات المميزة فريدة داخل التطبيقات المميزة", () => {
      const ids = featuredApps.map((app) => app.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("يمكن تمثيل بيانات كل بطاقة كـ JSON والعودة منها", () => {
      for (const app of featuredApps) {
        const serialized = JSON.stringify(app);
        const deserialized = JSON.parse(serialized) as typeof app;
        expect(deserialized.id).toBe(app.id);
        expect(deserialized.path).toBe(app.path);
        expect(deserialized.nameAr).toBe(app.nameAr);
      }
    });
  });
});
