/**
 * اختبارات End-to-End لأداة brain-storm-ai
 * يختبر التدفق الكامل من منظور المستخدم النهائي
 */

import { logger } from "@/lib/logger";
import { test, expect } from "@playwright/test";

test.describe("E2E: brain-storm-ai — تدفق تشغيلي كامل", () => {
  test.setTimeout(60000); // 60 ثانية للاختبارات الطويلة

  test.beforeEach(async ({ page }) => {
    // تنظيف localStorage قبل كل اختبار
    await page.addInitScript(() => {
      localStorage.clear();
    });

    // الذهاب إلى الصفحة
    await page.goto("/brain-storm-ai");
  });

  test("يجتاز تدفق عصف ذهني كامل من البداية إلى النهاية", async ({ page }) => {
    // انتظار تحميل الصفحة
    await expect(page.locator("text=منصة العصف الذهني الذكي")).toBeVisible();

    // إدخال فكرة إبداعية
    const briefInput = page
      .locator('textarea[placeholder*="اكتب فكرتك"]')
      .first();
    await expect(briefInput).toBeVisible();
    await briefInput.fill(
      "فكرة لتطبيق تعليمي تفاعلي باستخدام الذكاء الاصطناعي لمساعدة الطلاب في التعلم"
    );

    // بدء الجلسة
    const startButton = page.locator('button:has-text("ابدأ الجلسة")').first();
    await expect(startButton).toBeVisible();
    await startButton.click();

    // انتظار بدء المعالجة
    await expect(page.locator("text=جاري المعالجة")).toBeVisible({
      timeout: 10000,
    });

    // انتظار ظهور شريط التقدم
    await expect(page.locator("text=التقدم الكلي")).toBeVisible({
      timeout: 15000,
    });

    // مراقبة تطور التقدم عبر المراحل
    let previousProgress = 0;
    for (let attempt = 0; attempt < 10; attempt++) {
      const progressText = await page
        .locator("text=/\\d+\\.\\d+%/")
        .textContent();
      if (progressText) {
        const currentProgress = parseFloat(progressText.replace("%", ""));
        logger.info(`التقدم الحالي: ${currentProgress}%`);

        // التأكد من أن التقدم يتزايد أو يظل كما هو (ليس يتناقص)
        expect(currentProgress).toBeGreaterThanOrEqual(previousProgress);
        previousProgress = currentProgress;

        // إذا وصل إلى 100% أو اكتملت الجلسة، نخرج
        if (currentProgress >= 100) {
          break;
        }
      }

      // انتظار قليل قبل التحقق التالي
      await page.waitForTimeout(2000);
    }

    // انتظار ظهور النتيجة النهائية
    await expect(
      page.locator("text=✅ تم إكمال جلسة العصف الذهني")
    ).toBeVisible({
      timeout: 30000,
    });

    // التحقق من وجود القرار النهائي
    await expect(page.locator("text=القرار النهائي:")).toBeVisible();

    // التحقق من وجود أزرار التصدير
    await expect(page.locator('button:has-text("JSON")')).toBeVisible();
    await expect(page.locator('button:has-text("Markdown")')).toBeVisible();
    await expect(page.locator('button:has-text("نسخ")')).toBeVisible();

    // التقاط screenshot للتوثيق
    await page.screenshot({
      path: `test-results/brainstorm-complete-${Date.now()}.png`,
      fullPage: true,
    });
  });

  test("يحفظ الجلسة ويسترجعها بعد إعادة التحميل", async ({ page }) => {
    // إنشاء جلسة وانتظار اكتمالها جزئياً
    await expect(page.locator("text=منصة العصف الذهني الذكي")).toBeVisible();

    const briefInput = page
      .locator('textarea[placeholder*="اكتب فكرتك"]')
      .first();
    await briefInput.fill("فكرة لاختبار الحفظ والاسترجاع");

    const startButton = page.locator('button:has-text("ابدأ الجلسة")').first();
    await startButton.click();

    // انتظار بدء المعالجة
    await expect(page.locator("text=جاري المعالجة")).toBeVisible();

    // انتظار حفظ الجلسة (سيحدث تلقائياً)
    await page.waitForTimeout(3000);

    // إعادة تحميل الصفحة
    await page.reload();

    // انتظار إعادة التحميل
    await expect(page.locator("text=منصة العصف الذهني الذكي")).toBeVisible();

    // التحقق من وجود الجلسة المحفوظة
    await expect(
      page.locator("text=فكرة لاختبار الحفظ والاسترجاع")
    ).toBeVisible();
  });

  test("يصدر الجلسة بتنسيقات مختلفة", async ({ page }) => {
    // انتظار تحميل وإنشاء جلسة مكتملة
    await expect(page.locator("text=منصة العصف الذهني الذكي")).toBeVisible();

    const briefInput = page
      .locator('textarea[placeholder*="اكتب فكرتك"]')
      .first();
    await briefInput.fill("فكرة لاختبار التصدير");

    const startButton = page.locator('button:has-text("ابدأ الجلسة")').first();
    await startButton.click();

    // انتظار اكتمال الجلسة
    await expect(
      page.locator("text=✅ تم إكمال جلسة العصف الذهني")
    ).toBeVisible({
      timeout: 45000,
    });

    // تجربة تصدير JSON
    const jsonButton = page.locator('button:has-text("JSON")');
    await expect(jsonButton).toBeVisible();

    // مراقبة التحميلات (سنحتاج إلى التعامل مع dialog التحميل)
    const downloadPromise = page.waitForEvent("download");
    await jsonButton.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/brainstorm_.*\.json/);

    // تجربة تصدير Markdown
    const mdButton = page.locator('button:has-text("Markdown")');
    const mdDownloadPromise = page.waitForEvent("download");
    await mdButton.click();

    const mdDownload = await mdDownloadPromise;
    expect(mdDownload.suggestedFilename()).toMatch(/brainstorm_.*\.md/);

    // تجربة النسخ للحافظة
    const copyButton = page.locator('button:has-text("نسخ")');
    await copyButton.click();

    // التحقق من ظهور تأكيد النسخ
    await expect(page.locator('button:has-text("تم النسخ!")')).toBeVisible();
  });

  test("يتعامل مع حالات الفشل بشكل صحيح", async ({ page }) => {
    // محاكاة فشل الشبكة أو API
    await page.route("**/api/brainstorm", (route) => route.abort());

    await expect(page.locator("text=منصة العصف الذهني الذكي")).toBeVisible();

    const briefInput = page
      .locator('textarea[placeholder*="اكتب فكرتك"]')
      .first();
    await briefInput.fill("فكرة ستفشل بسبب مشكلة فنية");

    const startButton = page.locator('button:has-text("ابدأ الجلسة")').first();
    await startButton.click();

    // انتظار ظهور رسالة الخطأ
    await expect(page.locator("text=فشل في الاتصال")).toBeVisible({
      timeout: 10000,
    });

    // التأكد من عدم تجمد الواجهة
    await expect(startButton).toBeEnabled();

    // التقاط screenshot للخطأ
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

    // انتظار ظهور لوحة المراحل
    await expect(page.locator("text=التحليل الأولي")).toBeVisible({
      timeout: 10000,
    });

    // التحقق من وجود جميع المراحل
    await expect(page.locator("text=التحليل الأولي")).toBeVisible();
    await expect(page.locator("text=التوسع الإبداعي")).toBeVisible();
    await expect(page.locator("text=التحقق والتدقيق")).toBeVisible();
    await expect(page.locator("text=النقاش والتوافق")).toBeVisible();
    await expect(page.locator("text=التقييم النهائي")).toBeVisible();

    // التحقق من وجود شريط التقدم الكلي
    await expect(page.locator("text=التقدم الكلي")).toBeVisible();

    // التقاط screenshot للمراحل
    await page.screenshot({
      path: `test-results/brainstorm-phases-${Date.now()}.png`,
      fullPage: true,
    });
  });

  test("يحافظ على الاتساق بعد إعادة التحميل في جلسة مكتملة", async ({
    page,
  }) => {
    // إنشاء جلسة كاملة
    await expect(page.locator("text=منصة العصف الذهني الذكي")).toBeVisible();

    const briefInput = page
      .locator('textarea[placeholder*="اكتب فكرتك"]')
      .first();
    await briefInput.fill("فكرة لاختبار الاتساق بعد إعادة التحميل");

    const startButton = page.locator('button:has-text("ابدأ الجلسة")').first();
    await startButton.click();

    // انتظار اكتمال الجلسة
    await expect(
      page.locator("text=✅ تم إكمال جلسة العصف الذهني")
    ).toBeVisible({
      timeout: 45000,
    });

    // التحقق من وجود النتيجة النهائية
    await expect(page.locator("text=القرار النهائي:")).toBeVisible();

    // إعادة تحميل الصفحة
    await page.reload();

    // التأكد من الاحتفاظ بالنتيجة
    await expect(
      page.locator("text=✅ تم إكمال جلسة العصف الذهني")
    ).toBeVisible();
    await expect(page.locator("text=القرار النهائي:")).toBeVisible();

    // التقاط screenshot للتحقق من الاتساق
    await page.screenshot({
      path: `test-results/brainstorm-consistency-${Date.now()}.png`,
      fullPage: true,
    });
  });
});
