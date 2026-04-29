/**
 * اختبارات End-to-End لأداة brain-storm-ai
 * يختبر التدفق الكامل من منظور المستخدم النهائي
 */

import { test, expect } from "@playwright/test";

import { logger } from "@/lib/logger";

async function gotoAndClear({
  page,
}: {
  page: import("@playwright/test").Page;
}) {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto("/brain-storm-ai");
}

test.describe("E2E: brain-storm-ai — التدفق التشغيلي", () => {
  test.setTimeout(60000);

  test.beforeEach(gotoAndClear);

  test("يجتاز تدفق عصف ذهني كامل من البداية إلى النهاية", async ({ page }) => {
    await expect(page.locator("text=منصة العصف الذهني الذكي")).toBeVisible();

    const briefInput = page
      .locator('textarea[placeholder*="اكتب فكرتك"]')
      .first();
    await expect(briefInput).toBeVisible();
    await briefInput.fill(
      "فكرة لتطبيق تعليمي تفاعلي باستخدام الذكاء الاصطناعي لمساعدة الطلاب في التعلم"
    );

    const startButton = page.locator('button:has-text("ابدأ الجلسة")').first();
    await expect(startButton).toBeVisible();
    await startButton.click();

    await expect(page.locator("text=جاري المعالجة")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=التقدم الكلي")).toBeVisible({
      timeout: 15000,
    });

    let previousProgress = 0;
    for (let attempt = 0; attempt < 10; attempt++) {
      const progressText = await page
        .locator("text=/\\d+\\.\\d+%/")
        .textContent();
      if (progressText) {
        const currentProgress = parseFloat(progressText.replace("%", ""));
        logger.info(`التقدم الحالي: ${currentProgress}%`);
        expect(currentProgress).toBeGreaterThanOrEqual(previousProgress);
        previousProgress = currentProgress;
        if (currentProgress >= 100) {
          break;
        }
      }
      await page.waitForTimeout(2000);
    }

    await expect(
      page.locator("text=✅ تم إكمال جلسة العصف الذهني")
    ).toBeVisible({ timeout: 30000 });
    await expect(page.locator("text=القرار النهائي:")).toBeVisible();
    await expect(page.locator('button:has-text("JSON")')).toBeVisible();
    await expect(page.locator('button:has-text("Markdown")')).toBeVisible();
    await expect(page.locator('button:has-text("نسخ")')).toBeVisible();

    await page.screenshot({
      path: `test-results/brainstorm-complete-${Date.now()}.png`,
      fullPage: true,
    });
  });

  test("يحفظ الجلسة ويسترجعها بعد إعادة التحميل", async ({ page }) => {
    await expect(page.locator("text=منصة العصف الذهني الذكي")).toBeVisible();

    const briefInput = page
      .locator('textarea[placeholder*="اكتب فكرتك"]')
      .first();
    await briefInput.fill("فكرة لاختبار الحفظ والاسترجاع");

    const startButton = page.locator('button:has-text("ابدأ الجلسة")').first();
    await startButton.click();

    await expect(page.locator("text=جاري المعالجة")).toBeVisible();
    await page.waitForTimeout(3000);
    await page.reload();

    await expect(page.locator("text=منصة العصف الذهني الذكي")).toBeVisible();
    await expect(
      page.locator("text=فكرة لاختبار الحفظ والاسترجاع")
    ).toBeVisible();
  });

  test("يصدر الجلسة بتنسيقات مختلفة", async ({ page }) => {
    await expect(page.locator("text=منصة العصف الذهني الذكي")).toBeVisible();

    const briefInput = page
      .locator('textarea[placeholder*="اكتب فكرتك"]')
      .first();
    await briefInput.fill("فكرة لاختبار التصدير");

    const startButton = page.locator('button:has-text("ابدأ الجلسة")').first();
    await startButton.click();

    await expect(
      page.locator("text=✅ تم إكمال جلسة العصف الذهني")
    ).toBeVisible({ timeout: 45000 });

    const jsonButton = page.locator('button:has-text("JSON")');
    await expect(jsonButton).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await jsonButton.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/brainstorm_.*\.json/);

    const mdButton = page.locator('button:has-text("Markdown")');
    const mdDownloadPromise = page.waitForEvent("download");
    await mdButton.click();

    const mdDownload = await mdDownloadPromise;
    expect(mdDownload.suggestedFilename()).toMatch(/brainstorm_.*\.md/);

    const copyButton = page.locator('button:has-text("نسخ")');
    await copyButton.click();

    await expect(page.locator('button:has-text("تم النسخ!")')).toBeVisible();
  });
});

test.describe("E2E: brain-storm-ai — المراحل والحالات", () => {
  test.setTimeout(60000);

  test.beforeEach(gotoAndClear);

  test("يتعامل مع حالات الفشل بشكل صحيح", async ({ page }) => {
    await page.route("**/api/brainstorm", (route) => route.abort());

    await expect(page.locator("text=منصة العصف الذهني الذكي")).toBeVisible();

    const briefInput = page
      .locator('textarea[placeholder*="اكتب فكرتك"]')
      .first();
    await briefInput.fill("فكرة ستفشل بسبب مشكلة فنية");

    const startButton = page.locator('button:has-text("ابدأ الجلسة")').first();
    await startButton.click();

    await expect(page.locator("text=فشل في الاتصال")).toBeVisible({
      timeout: 10000,
    });
    await expect(startButton).toBeEnabled();

    await page.screenshot({
      path: `test-results/brainstorm-error-${Date.now()}.png`,
      fullPage: true,
    });
  });

  test("يعرض المراحل والتقدم بوضوح", async ({ page }) => {
    await expect(page.locator("text=منصة العصف الذهني الذكي")).toBeVisible();

    const briefInput = page
      .locator('textarea[placeholder*="اكتب فكرتك"]')
      .first();
    await briefInput.fill("فكرة لاختبار عرض المراحل");

    const startButton = page.locator('button:has-text("ابدأ الجلسة")').first();
    await startButton.click();

    await expect(page.locator("text=التحليل الأولي")).toBeVisible({
      timeout: 10000,
    });

    await expect(page.locator("text=التحليل الأولي")).toBeVisible();
    await expect(page.locator("text=التوسع الإبداعي")).toBeVisible();
    await expect(page.locator("text=التحقق والتدقيق")).toBeVisible();
    await expect(page.locator("text=النقاش والتوافق")).toBeVisible();
    await expect(page.locator("text=التقييم النهائي")).toBeVisible();
    await expect(page.locator("text=التقدم الكلي")).toBeVisible();

    await page.screenshot({
      path: `test-results/brainstorm-phases-${Date.now()}.png`,
      fullPage: true,
    });
  });

  test("يحافظ على الاتساق بعد إعادة التحميل في جلسة مكتملة", async ({
    page,
  }) => {
    await expect(page.locator("text=منصة العصف الذهني الذكي")).toBeVisible();

    const briefInput = page
      .locator('textarea[placeholder*="اكتب فكرتك"]')
      .first();
    await briefInput.fill("فكرة لاختبار الاتساق بعد إعادة التحميل");

    const startButton = page.locator('button:has-text("ابدأ الجلسة")').first();
    await startButton.click();

    await expect(
      page.locator("text=✅ تم إكمال جلسة العصف الذهني")
    ).toBeVisible({ timeout: 45000 });
    await expect(page.locator("text=القرار النهائي:")).toBeVisible();

    await page.reload();

    await expect(
      page.locator("text=✅ تم إكمال جلسة العصف الذهني")
    ).toBeVisible();
    await expect(page.locator("text=القرار النهائي:")).toBeVisible();

    await page.screenshot({
      path: `test-results/brainstorm-consistency-${Date.now()}.png`,
      fullPage: true,
    });
  });
});
