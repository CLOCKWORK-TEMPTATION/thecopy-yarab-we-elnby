/**
 * اختبارات End-to-End لـ Art Director
 * تغطي: دخول الصفحة، إضافة موقع، إنشاء لوحة مزاج، إضافة قطعة ديكور
 */

import { test, expect, type Page } from "@playwright/test";

async function clearSavedArtDirectorState(page: Page) {
  const primeResponse = await page.request.get("/api/app-state/art-director");
  let csrfToken = (await page.context().cookies()).find(
    (cookie) => cookie.name === "XSRF-TOKEN"
  )?.value;

  if (!csrfToken) {
    const setCookie = primeResponse.headers()["set-cookie"] ?? "";
    csrfToken = /XSRF-TOKEN=([^;]+)/.exec(setCookie)?.[1];
  }

  const clearOptions = csrfToken
    ? {
        headers: {
          "X-XSRF-TOKEN": decodeURIComponent(csrfToken),
          "x-xsrf-token": decodeURIComponent(csrfToken),
        },
      }
    : {};
  const clearResponse = await page.request.delete(
    "/api/app-state/art-director",
    clearOptions
  );

  expect([200, 204, 404]).toContain(clearResponse.status());
}

async function expectRemoteInspirationResult(page: Page) {
  await expect
    .poll(
      async () => {
        const response = await page.request.get("/api/app-state/art-director");
        const payload = (await response.json()) as {
          data?: { inspiration?: { result?: unknown } } | null;
        };
        return Boolean(payload.data?.inspiration?.result);
      },
      { timeout: 10000 }
    )
    .toBe(true);
}

test.describe("Art Director - مسار مدير الديكور والفن", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await clearSavedArtDirectorState(page);
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

    // التحقق من اختفاء رسالة الملخص إن وُجدت مؤقتاً أثناء التحميل.
    await expect(page.locator("text=تعذر تحميل ملخص لوحة التحكم")).toHaveCount(
      0
    );

    // التحقق من عدد بطاقات الإحصائيات فقط دون احتساب العناصر الداخلية.
    const statCards = page.locator(".art-grid-4").first().locator(":scope > *");
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

    // البحث عن قيمة غير موجودة لضمان ظهور الحالة الفارغة بشكل حتمي.
    const searchInput = page.locator('input[placeholder*="ابحث"]');
    await searchInput.fill("موقع-غير-موجود-اختبارياً-99999");
    await page.click('button:has-text("بحث")');

    // التحقق من ظهور حالة "لا توجد مواقع"
    await expect(page.locator("text=لا توجد مواقع")).toBeVisible();

    // التقاط screenshot
    await page.screenshot({
      path: "test-results/art-director-locations.png",
      fullPage: true,
    });
  });

  test("إضافة موقع جديد", async ({ page }) => {
    const uniqueSuffix = Date.now().toString();
    const locationNameAr = `قصر الاختبار ${uniqueSuffix}`;
    const locationNameEn = `Test Palace ${uniqueSuffix}`;

    // الانتقال إلى تبويب المواقع
    await page.click('nav button:has-text("المواقع")');
    await page.waitForSelector('h1:has-text("المواقع")', { timeout: 5000 });

    // فتح نموذج الإضافة
    await page.click('button:has-text("إضافة موقع جديد")');

    // انتظار ظهور النموذج
    await page.waitForSelector("text=إضافة موقع جديد", { timeout: 5000 });

    // ملء البيانات
    await page.fill("#location-name-ar", locationNameAr);
    await page.fill("#location-name-en", locationNameEn);
    await page.selectOption("#location-type", "interior");
    await page.fill("#location-address", "مصر الجديدة، القاهرة");
    await page.fill("#location-features", "إضاءة طبيعية, سقف عالي, زخارف فنية");

    // حفظ الموقع عبر زر الإضافة داخل النموذج نفسه.
    const submitButton = page.getByRole("button", {
      name: "إضافة",
      exact: true,
    });
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();

    // التحقق من ظهور الموقع في القائمة
    await expect(page.locator(`text=${locationNameAr}`)).toBeVisible({
      timeout: 10000,
    });

    // التقاط screenshot
    await page.screenshot({
      path: "test-results/art-director-location-added.png",
      fullPage: true,
    });
  });

  test("الانتقال إلى الإلهام البصري وتحليل المشهد", async ({ page }) => {
    // الضغط على زر الإلهام البصري في القائمة الجانبية
    await page.click('nav button:has-text("الإلهام البصري")');

    // انتظار تحميل الصفحة
    await page.waitForSelector('h1:has-text("الإلهام البصري")', {
      timeout: 5000,
    });

    // التحقق من وجود حقل وصف المشهد
    const descriptionField = page.locator('textarea[placeholder*="صف المشهد"]');
    await expect(descriptionField).toBeVisible();

    // ملء وصف المشهد
    await descriptionField.fill(
      "مشهد رومانسي في مقهى قديم بباريس في الثلاثينيات"
    );

    // اختيار المزاج
    await page.selectOption("#mood-select", "romantic");

    // اختيار الحقبة
    await page.selectOption("#era-select", "1920s");

    const stateSave = page.waitForResponse(
      (response) =>
        response.url().includes("/api/app-state/art-director") &&
        response.request().method() === "PUT" &&
        response.ok()
    );

    await page.click('button:has-text("تحليل المشهد")');

    await expect(page.locator("text=نتائج التحليل")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/الباليت المقترح:/)).toBeVisible();
    await stateSave;
    await expectRemoteInspirationResult(page);

    await page.reload();
    await page.waitForSelector('h1:has-text("الإلهام البصري")', {
      timeout: 10000,
    });
    await expect(descriptionField).toHaveValue(
      "مشهد رومانسي في مقهى قديم بباريس في الثلاثينيات"
    );
    await expect(page.locator("text=نتائج التحليل")).toBeVisible();
  });

  test("تشغيل محلل التناسق البصري يعرض نتيجة واضحة", async ({ page }) => {
    await page.click('nav button:has-text("جميع الأدوات")');
    await page.waitForSelector('h1:has-text("جميع الأدوات")', {
      timeout: 5000,
    });

    await page.click('button:has-text("محلل الاتساق البصري الذكي")');
    await page.fill('input[aria-label="رقم المشهد"]', "scene-001");
    await page.fill('input[aria-label="الألوان المرجعية"]', "#FF5733, #3498DB");
    await page.selectOption('select[aria-label="حالة الإضاءة"]', "daylight");
    await page.click('button:has-text("تنفيذ")');

    await expect(page.locator("text=درجة الاتساق")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=مشاكل مكتشفة")).toBeVisible();
    await expect(page.locator("text=نجح التنفيذ")).toBeVisible();
  });

  test("الانتقال إلى الديكورات وإضافة قطعة", async ({ page }) => {
    // الضغط على زر الديكورات في القائمة الجانبية
    await page.click('nav button:has-text("الديكورات")');

    // انتظار تحميل الصفحة
    await page.waitForSelector('h1:has-text("إدارة الديكورات")', {
      timeout: 5000,
    });

    // التحقق من وجود زر إضافة قطعة
    const addButton = page.locator('button:has-text("إضافة قطعة")');
    await expect(addButton).toBeVisible();

    // فتح نموذج الإضافة
    await addButton.click();

    // انتظار ظهور النموذج
    await page.waitForSelector("text=إضافة قطعة ديكور", { timeout: 5000 });

    // ملء البيانات
    await page.fill("#piece-name-ar", "كنبة كلاسيكية");
    await page.fill("#piece-name-en", "Classic Sofa");
    await page.selectOption("#piece-condition", "excellent");
    await page.fill("#piece-dimensions", "200×80×90 سم");

    // حفظ القطعة
    await page.getByRole("button", { name: "إضافة", exact: true }).click();

    await expect(page.locator("text=كنبة كلاسيكية")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole("heading", { name: "تقرير الاستدامة" })
    ).toBeVisible();
  });

  test("الإجراءات السريعة من لوحة التحكم", async ({ page }) => {
    // البقاء في لوحة التحكم (الصفحة الافتراضية)

    // الضغط على "إنشاء Mood Board"
    await page.click('button:has-text("إنشاء Mood Board")');

    // التحقق من الانتقال إلى تبويب الإلهام البصري
    await page.waitForSelector('h1:has-text("الإلهام البصري")', {
      timeout: 5000,
    });

    // العودة إلى لوحة التحكم
    await page.click('nav button:has-text("لوحة التحكم")');
    await page.waitForSelector('h1:has-text("مرحباً بك")', { timeout: 5000 });

    // الضغط على "إضافة موقع"
    await page.click('button:has-text("إضافة موقع")');

    // التحقق من الانتقال إلى تبويب المواقع
    await page.waitForSelector('h1:has-text("المواقع")', { timeout: 5000 });

    // التقاط screenshot
    await page.screenshot({
      path: "test-results/art-director-quick-actions.png",
      fullPage: true,
    });
  });
});
