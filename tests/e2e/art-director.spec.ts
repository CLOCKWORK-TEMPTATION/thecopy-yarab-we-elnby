/**
 * اختبارات End-to-End لتطبيق Art Director
 * تغطي: دخول الصفحة، إضافة موقع، إنشاء لوحة مزاج، إضافة قطعة ديكور
 */

import { test, expect } from "@playwright/test";

test.describe("Art Director - مسار مدير الديكور والفن", () => {
  test.beforeEach(async ({ page }) => {
    // الانتقال إلى صفحة art-director
    await page.goto("/art-director");
    // انتظار تحميل الصفحة
    await page.waitForSelector('[role="main"]', { timeout: 10000 });
  });

  test("تحميل الصفحة وعرض لوحة التحكم", async ({ page }) => {
    // التحقق من عنوان الصفحة
    await expect(page.locator("h1")).toContainText("CineArchitect");

    // التحقق من وجود الإجراءات السريعة
    const quickActions = page.locator("text=إجراءات سريعة");
    await expect(quickActions).toBeVisible();

    // التحقق من وجود الأدوات المتاحة
    const toolsSection = page.locator("text=الأدوات المتاحة");
    await expect(toolsSection).toBeVisible();

    // التحقق من وجود بطاقات الإحصائيات
    const statCards = page.locator(".art-grid-4 >> div");
    await expect(statCards).toHaveCount(4);

    // التقاط screenshot
    await page.screenshot({
      path: "test-results/art-director-dashboard.png",
      fullPage: true,
    });
  });

  test("الانتقال إلى تبويب المواقع والبحث", async ({ page }) => {
    // الضغط على زر المواقع في القائمة الجانبية
    await page.click('nav button:has-text("المواقع")');

    // انتظار تحميل صفحة المواقع
    await page.waitForSelector('h1:has-text("المواقع")', { timeout: 5000 });

    // التحقق من وجود زر إضافة موقع
    const addButton = page.locator('button:has-text("إضافة موقع جديد")');
    await expect(addButton).toBeVisible();

    // البحث عن موقع (سيعيد قائمة فارغة في البداية)
    const searchInput = page.locator('input[placeholder*="ابحث عن موقع"]');
    await expect(searchInput).toBeVisible();

    const searchButton = page.locator('button:has-text("بحث")');
    await expect(searchButton).toBeVisible();

    // التقاط screenshot لصفحة المواقع
    await page.screenshot({
      path: "test-results/art-director-locations.png",
      fullPage: true,
    });
  });

  test("إضافة موقع جديد", async ({ page }) => {
    // الذهاب إلى صفحة المواقع
    await page.click('nav button:has-text("المواقع")');
    await page.waitForSelector('h1:has-text("المواقع")');

    // الضغط على زر إضافة موقع
    await page.click('button:has-text("إضافة موقع جديد")');

    // انتظار ظهور النموذج
    await page.waitForSelector('form', { timeout: 5000 });

    // ملء النموذج
    await page.fill('input[name="name"]', 'موقع تجريبي');
    await page.fill('input[name="nameAr"]', 'Test Location');
    await page.fill('input[name="address"]', '123 Test Street, Test City');
    await page.selectOption('select[name="type"]', 'exterior');

    // إضافة ميزات
    await page.fill('input[name="features"]', 'parking, lighting');

    // الضغط على زر الحفظ
    await page.click('button:has-text("حفظ")');

    // انتظار الاستجابة (قد يستغرق وقتاً)
    await page.waitForTimeout(3000);

    // التحقق من عدم ظهور رسالة خطأ
    const errorMessage = page.locator('.error-message, .text-red-500');
    await expect(errorMessage).not.toBeVisible();

    // التقاط screenshot
    await page.screenshot({
      path: "test-results/art-director-location-added.png",
      fullPage: true,
    });
  });

  test("إنشاء لوحة مزاج (Mood Board)", async ({ page }) => {
    // الذهاب إلى صفحة الإلهام
    await page.click('nav button:has-text("الإلهام البصري")');
    await page.waitForSelector('h1:has-text("الإلهام البصري")', { timeout: 5000 });

    // ملء وصف المشهد
    const sceneDescription = `
      مشهد درامي في غرفة مظلمة، شخص يجلس على كرسي قديم،
      الإضاءة تأتي من نافذة واحدة، المزاج حزين ومتأمل.
      الألوان الباردة، تركيز على الظلال والإضاءة الناعمة.
    `;

    await page.fill('textarea[name="scene"]', sceneDescription);

    // اختيار المزاج والحقبة
    await page.selectOption('select[name="mood"]', 'dramatic');
    await page.selectOption('select[name="era"]', 'modern');

    // الضغط على زر تحليل المشهد
    await page.click('button:has-text("تحليل المشهد")');

    // انتظار النتائج
    await page.waitForSelector('.analysis-results, .mood-board', { timeout: 15000 });

    // التحقق من وجود نتائج التحليل
    const analysisSummary = page.locator('.analysis-summary, [data-testid="analysis-summary"]');
    await expect(analysisSummary).toBeVisible();

    // التحقق من وجود التوصيات
    const recommendations = page.locator('.recommendations li, [data-testid="recommendations"] li');
    await expect(recommendations.first()).toBeVisible();

    // التقاط screenshot
    await page.screenshot({
      path: "test-results/art-director-inspiration-result.png",
      fullPage: true,
    });
  });

  test("إضافة قطعة ديكور جديدة", async ({ page }) => {
    // الذهاب إلى صفحة الديكورات
    await page.click('nav button:has-text("الديكورات")');
    await page.waitForSelector('h1:has-text("إدارة قطع الديكور")', { timeout: 5000 });

    // الضغط على زر إضافة قطعة
    await page.click('button:has-text("إضافة قطعة جديدة")');

    // انتظار النموذج
    await page.waitForSelector('form', { timeout: 5000 });

    // ملء النموذج
    await page.fill('input[name="name"]', 'كرسي خشبي قديم');
    await page.fill('input[name="category"]', 'furniture');
    await page.fill('input[name="quantity"]', '1');
    await page.fill('input[name="condition"]', 'good');
    await page.fill('textarea[name="description"]', 'كرسي خشبي أنيق للمشاهد الدرامية');

    // الضغط على حفظ
    await page.click('button:has-text("حفظ القطعة")');

    // انتظار الاستجابة
    await page.waitForTimeout(3000);

    // التحقق من عدم الخطأ
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).not.toBeVisible();

    // التقاط screenshot
    await page.screenshot({
      path: "test-results/art-director-set-added.png",
      fullPage: true,
    });
  });

  test("عرض الإجراءات السريعة", async ({ page }) => {
    // التحقق من وجود أزرار الإجراءات السريعة
    const quickActionButtons = page.locator('.quick-actions button, [data-testid="quick-actions"] button');
    await expect(quickActionButtons).toHaveCountGreaterThan(0);

    // الضغط على أول زر إجراء سريع
    await quickActionButtons.first().click();

    // انتظار أي تغيير في الواجهة
    await page.waitForTimeout(1000);

    // التقاط screenshot
    await page.screenshot({
      path: "test-results/art-director-quick-actions.png",
      fullPage: true,
    });
  });

  test("التحقق من استجابة الواجهة للأحجام المختلفة", async ({ page }) => {
    // تعيين حجم viewport صغير
    await page.setViewportSize({ width: 768, height: 1024 });

    // التحقق من أن القائمة الجانبية تظهر بشكل صحيح
    const sidebar = page.locator('nav, .sidebar');
    await expect(sidebar).toBeVisible();

    // تعيين حجم viewport كبير
    await page.setViewportSize({ width: 1920, height: 1080 });

    // التحقق من التخطيط
    const mainContent = page.locator('[role="main"]');
    await expect(mainContent).toBeVisible();
  });

  test("اختبار التنقل بين التبويبات", async ({ page }) => {
    const tabs = [
      "لوحة التحكم",
      "جميع الأدوات",
      "الإلهام البصري",
      "المواقع",
      "الديكورات",
      "الإنتاجية",
      "التوثيق"
    ];

    for (const tabName of tabs) {
      // الضغط على التبويب
      await page.click(`nav button:has-text("${tabName}")`);

      // انتظار تحميل المحتوى
      await page.waitForSelector('[role="main"]', { timeout: 5000 });

      // التحقق من أن المحتوى تغير
      const currentTab = page.locator('[role="main"] h1, [role="main"] h2').first();
      await expect(currentTab).toBeVisible();
    }
  });
});