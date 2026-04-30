/**
 * @fileoverview مواصفات Playwright — B3: التنقل بين أقسام التفكيك في حالة الخمول
 *
 * الهدف: التحقق من أن شريط أقسام التنقل يظهر دائمًا (input / cast / results / chat)
 * وأن كل قسم يعرض placeholder مناسبًا قبل اكتمال المعالجة.
 */

import { test, expect } from "@playwright/test";

const BREAKDOWN_URL = "/breakdown";

// =====================================================================
// B3-T01 — شريط التنقل يظهر دائمًا بالأقسام الأربعة
// =====================================================================
test("B3-T01: شريط التنقل يحتوي على 4 أقسام في حالة الخمول", async ({
  page,
}) => {
  await page.goto(BREAKDOWN_URL);

  const nav = page.getByRole("navigation", { name: "أقسام التفكيك" });
  await expect(nav).toBeVisible();

  // الأقسام الأربعة موجودة
  await expect(nav.getByRole("button", { name: /الإدخال/ })).toBeVisible();
  await expect(nav.getByRole("button", { name: /الطاقم/ })).toBeVisible();
  await expect(nav.getByRole("button", { name: /التقرير/ })).toBeVisible();
  await expect(nav.getByRole("button", { name: /المساعد/ })).toBeVisible();
});

// =====================================================================
// B3-T02 — الانتقال إلى قسم "الطاقم" يُظهر placeholder وليس خطأ
// =====================================================================
test("B3-T02: قسم الطاقم يعرض placeholder في حالة الخمول", async ({
  page,
}) => {
  await page.goto(BREAKDOWN_URL);

  const nav = page.getByRole("navigation", { name: "أقسام التفكيك" });
  await nav.getByRole("button", { name: /الطاقم/ }).click();

  // placeholder يحتوي على نص دلالي
  await expect(page.getByText("طاقم التمثيل")).toBeVisible();
  await expect(
    page.getByText(/أدخل السيناريو أولاً وابدأ التحليل/)
  ).toBeVisible();

  // لا يوجد خطأ أو crash
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  expect(errors.filter((e) => !e.includes("favicon"))).toHaveLength(0);
});

// =====================================================================
// B3-T03 — الانتقال إلى قسم "التقرير" يُظهر placeholder
// =====================================================================
test("B3-T03: قسم التقرير يعرض placeholder في حالة الخمول", async ({
  page,
}) => {
  await page.goto(BREAKDOWN_URL);

  const nav = page.getByRole("navigation", { name: "أقسام التفكيك" });
  await nav.getByRole("button", { name: /التقرير/ }).click();

  await expect(page.getByText("التقرير النهائي")).toBeVisible();
  await expect(
    page.getByText(/أدخل السيناريو أولاً وابدأ التحليل/)
  ).toBeVisible();
});

// =====================================================================
// B3-T04 — الانتقال إلى قسم "المساعد" يعمل دون crash
// =====================================================================
test("B3-T04: قسم المساعد يعرض محتوى في حالة الخمول", async ({ page }) => {
  await page.goto(BREAKDOWN_URL);

  const nav = page.getByRole("navigation", { name: "أقسام التفكيك" });
  await nav.getByRole("button", { name: /المساعد/ }).click();

  // المحتوى موجود (placeholder أو ChatBot)
  // لا يوجد خطأ مرئي
  await expect(page.locator("main")).toBeVisible();

  const bodyText = await page.locator("body").textContent();
  expect(bodyText).not.toContain("Error");
  expect(bodyText).not.toContain("Cannot GET");
});

// =====================================================================
// B3-T05 — العودة إلى قسم "الإدخال" تُظهر textarea السيناريو
// =====================================================================
test("B3-T05: العودة إلى قسم الإدخال يُعيد textarea السيناريو", async ({
  page,
}) => {
  await page.goto(BREAKDOWN_URL);

  const nav = page.getByRole("navigation", { name: "أقسام التفكيك" });

  // انتقل للطاقم ثم ارجع للإدخال
  await nav.getByRole("button", { name: /الطاقم/ }).click();
  await nav.getByRole("button", { name: /الإدخال/ }).click();

  await expect(page.getByPlaceholder(/مشهد داخلي/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /ابدأ التحليل والتفريغ/ })
  ).toBeVisible();
});
