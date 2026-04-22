import { describe, expect, it } from "vitest";

import pagesManifest from "./pages.manifest.json";
import {
  platformApps,
  FEATURED_APP_PATHS,
  getEnabledApps,
} from "./apps.config";

// ====================================================================
// مجموعة الاختبارات الأصلية — التغطية الأساسية للسجل
// ====================================================================

describe("central app registry", () => {
  it("covers all published tool routes except helper pages", () => {
    const ignoredPaths = new Set(["/apps-overview"]);

    const publishedToolPaths = pagesManifest.pages
      .map((page) => page.path)
      .filter((path) => !ignoredPaths.has(path));

    const registeredPaths = new Set(platformApps.map((app) => app.path));

    expect(publishedToolPaths.every((path) => registeredPaths.has(path))).toBe(
      true
    );
  });

  it("keeps registry paths unique", () => {
    const paths = platformApps.map((app) => app.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

// ====================================================================
// اختبارات صحة المسارات — ضمان أن enabled:true يعني route موجود فعلًا
// ====================================================================

describe("route integrity", () => {
  const publishedPaths = new Set(pagesManifest.pages.map((p) => p.path));

  it("no enabled app points to an unpublished route", () => {
    // أي تطبيق enabled:true يجب أن يكون path موجودًا في pages.manifest.json
    // إذا فشل هذا الاختبار → أضف enabled:false للتطبيق المعني
    const violations = getEnabledApps().filter(
      (app) => !publishedPaths.has(app.path)
    );

    expect(violations).toHaveLength(0);

    if (violations.length > 0) {
      // رسالة تشخيصية واضحة
      const report = violations
        .map((v) => `  - id:"${v.id}" path:"${v.path}" (not in manifest)`)
        .join("\n");
      console.error(`Apps with dead routes:\n${report}`);
    }
  });

  it("keeps registry ids unique", () => {
    const ids = platformApps.map((app) => app.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all apps have non-empty nameAr", () => {
    // nameAr فارغ يعني التسمية العربية مفقودة — مطلوب دائمًا
    const violations = platformApps.filter(
      (app) => !app.nameAr || app.nameAr.trim().length === 0
    );
    expect(violations).toHaveLength(0);
  });

  it("all apps have non-empty name (English)", () => {
    const violations = platformApps.filter(
      (app) => !app.name || app.name.trim().length === 0
    );
    expect(violations).toHaveLength(0);
  });

  it("all apps have a valid category", () => {
    const validCategories = [
      "production",
      "creative",
      "analysis",
      "management",
    ];
    const violations = platformApps.filter(
      (app) => !validCategories.includes(app.category)
    );
    expect(violations).toHaveLength(0);
  });
});

// ====================================================================
// اختبارات FEATURED_APP_PATHS — ضمان أن المشغّل يعرض بطاقات صالحة
// ====================================================================

describe("FEATURED_APP_PATHS integrity", () => {
  it("has exactly 12 featured paths (to fill the launcher grid)", () => {
    expect(FEATURED_APP_PATHS).toHaveLength(12);
  });

  it("all featured paths resolve to enabled apps", () => {
    // أي مسار في FEATURED_APP_PATHS يجب أن يكون له تطبيق enabled:true
    // إذا فشل هذا → البطاقة ستظهر فارغة في المشغّل
    const enabledPaths = new Set(getEnabledApps().map((app) => app.path));
    const unresolved = FEATURED_APP_PATHS.filter(
      (path) => !enabledPaths.has(path)
    );

    expect(unresolved).toHaveLength(0);
  });

  it("featured paths are unique (no duplicate launcher cards)", () => {
    expect(new Set(FEATURED_APP_PATHS).size).toBe(FEATURED_APP_PATHS.length);
  });

  it("all featured paths exist in the published manifest", () => {
    const publishedPaths = new Set(pagesManifest.pages.map((p) => p.path));
    const dead = FEATURED_APP_PATHS.filter((path) => !publishedPaths.has(path));
    expect(dead).toHaveLength(0);
  });
});
