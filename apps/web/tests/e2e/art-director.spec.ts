/**
 * اختبارات End-to-End لـ Art Director
 * تغطي: دخول الصفحة، إضافة موقع، إنشاء لوحة مزاج، إضافة قطعة ديكور
 */

import { test, expect, type Page } from "@playwright/test";

const ART_DIRECTOR_STORAGE_KEY = "the-copy.art-director.state.v1";
const ART_DIRECTOR_CLEAR_MARKER = "__art_director_e2e_cleared";
const REMOTE_APP_STATE_ENABLED =
  process.env["NEXT_PUBLIC_ENABLE_REMOTE_APP_STATE"] === "true" ||
  Boolean(process.env["NEXT_PUBLIC_APP_STATE_BASE_URL"]);

async function clearSavedArtDirectorState(page: Page) {
  await page.addInitScript(
    ({ storageKey, clearMarker }) => {
      if (window.sessionStorage.getItem(clearMarker)) {
        return;
      }

      window.localStorage.removeItem(storageKey);
      window.sessionStorage.setItem(clearMarker, "1");
    },
    {
      clearMarker: ART_DIRECTOR_CLEAR_MARKER,
      storageKey: ART_DIRECTOR_STORAGE_KEY,
    }
  );

  if (!REMOTE_APP_STATE_ENABLED) {
    return;
  }

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

async function expectLocalInspirationResult(page: Page) {
  await expect
    .poll(
      async () =>
        page.evaluate((storageKey) => {
          const raw = window.localStorage.getItem(storageKey);
          if (!raw) return false;

          try {
            const payload = JSON.parse(raw) as {
              inspiration?: { result?: unknown };
            };

            return Boolean(payload.inspiration?.result);
          } catch {
            return false;
          }
        }, ART_DIRECTOR_STORAGE_KEY),
      { timeout: 10000 }
    )
    .toBe(true);
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

test.describe("Art Director - لوحة التحكم والمواقع", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await clearSavedArtDirectorState(page);
    await page.goto("/art-director");
    await page.waitForSelector('[role="main"]', { timeout: 10000 });
  });

  test("تحميل الصفحة وعرض لوحة التحكم", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("CineArchitect");

    const quickActions = page.locator("text=إجراءات سريعة");
    await expect(quickActions).toBeVisible();

    const toolsSection = page.locator("text=الأدوات المتاحة");
    await expect(toolsSection).toBeVisible();

    await expect(page.locator("text=تعذر تحميل ملخص لوحة التحكم")).toHaveCount(
      0
    );

    const statCards = page.locator(".art-grid-4").first().locator(":scope > *");
    await expect(statCards).toHaveCount(4);

    await page.screenshot({
      path: "test-results/art-director-dashboard.png",
      fullPage: true,
    });
  });

  test("الانتقال إلى تبويب المواقع والبحث", async ({ page }) => {
    await page.click('nav button:has-text("المواقع")');
    await page.waitForSelector('h1:has-text("المواقع")', { timeout: 5000 });

    const addButton = page.locator('button:has-text("إضافة موقع جديد")');
    await expect(addButton).toBeVisible();

    const searchInput = page.locator('input[placeholder*="ابحث"]');
    await searchInput.fill("موقع-غير-موجود-اختبارياً-99999");
    await page.click('button:has-text("بحث")');

    await expect(page.locator("text=لا توجد مواقع")).toBeVisible();

    await page.screenshot({
      path: "test-results/art-director-locations.png",
      fullPage: true,
    });
  });

  test("إضافة موقع جديد", async ({ page }) => {
    const uniqueSuffix = Date.now().toString();
    const locationNameAr = `قصر الاختبار ${uniqueSuffix}`;
    const locationNameEn = `Test Palace ${uniqueSuffix}`;

    await page.click('nav button:has-text("المواقع")');
    await page.waitForSelector('h1:has-text("المواقع")', { timeout: 5000 });

    await page.click('button:has-text("إضافة موقع جديد")');
    await page.waitForSelector("text=إضافة موقع جديد", { timeout: 5000 });

    await page.fill("#location-name-ar", locationNameAr);
    await page.fill("#location-name-en", locationNameEn);
    await page.selectOption("#location-type", "interior");
    await page.fill("#location-address", "مصر الجديدة، القاهرة");
    await page.fill("#location-features", "إضاءة طبيعية, سقف عالي, زخارف فنية");

    const submitButton = page.getByRole("button", {
      name: "إضافة",
      exact: true,
    });
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();

    await expect(page.locator(`text=${locationNameAr}`)).toBeVisible({
      timeout: 10000,
    });

    await page.screenshot({
      path: "test-results/art-director-location-added.png",
      fullPage: true,
    });
  });

  test("الإجراءات السريعة من لوحة التحكم", async ({ page }) => {
    await page.click('button:has-text("إنشاء Mood Board")');
    await page.waitForSelector('h1:has-text("الإلهام البصري")', {
      timeout: 5000,
    });

    await page.click('nav button:has-text("لوحة التحكم")');
    await page.waitForSelector('h1:has-text("مرحباً بك")', { timeout: 5000 });

    await page.click('button:has-text("إضافة موقع")');
    await page.waitForSelector('h1:has-text("المواقع")', { timeout: 5000 });

    await page.screenshot({
      path: "test-results/art-director-quick-actions.png",
      fullPage: true,
    });
  });
});

test.describe("Art Director - الإلهام والأدوات والديكورات", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await clearSavedArtDirectorState(page);
    await page.goto("/art-director");
    await page.waitForSelector('[role="main"]', { timeout: 10000 });
  });

  test("الانتقال إلى الإلهام البصري وتحليل المشهد", async ({ page }) => {
    await page.click('nav button:has-text("الإلهام البصري")');
    await page.waitForSelector('h1:has-text("الإلهام البصري")', {
      timeout: 5000,
    });

    const descriptionField = page.locator('textarea[placeholder*="صف المشهد"]');
    await expect(descriptionField).toBeVisible();

    await descriptionField.fill(
      "مشهد رومانسي في مقهى قديم بباريس في الثلاثينيات"
    );
    await page.selectOption("#mood-select", "romantic");
    await page.selectOption("#era-select", "1920s");

    const stateSave = REMOTE_APP_STATE_ENABLED
      ? page.waitForResponse(
          (response) =>
            response.url().includes("/api/app-state/art-director") &&
            response.request().method() === "PUT" &&
            response.ok()
        )
      : null;

    await page.click('button:has-text("تحليل المشهد")');

    await expect(page.locator("text=نتائج التحليل")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/الباليت المقترح:/)).toBeVisible();
    await expectLocalInspirationResult(page);

    if (stateSave) {
      await stateSave;
      await expectRemoteInspirationResult(page);
    }

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
    await page.click('nav button:has-text("الديكورات")');
    await page.waitForSelector('h1:has-text("إدارة الديكورات")', {
      timeout: 5000,
    });

    const addButton = page.locator('button:has-text("إضافة قطعة")');
    await expect(addButton).toBeVisible();
    await addButton.click();

    await page.waitForSelector("text=إضافة قطعة ديكور", { timeout: 5000 });

    await page.fill("#piece-name-ar", "كنبة كلاسيكية");
    await page.fill("#piece-name-en", "Classic Sofa");
    await page.selectOption("#piece-condition", "excellent");
    await page.fill("#piece-dimensions", "200×80×90 سم");

    await page.getByRole("button", { name: "إضافة", exact: true }).click();

    await expect(page.locator("text=كنبة كلاسيكية")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole("heading", { name: "تقرير الاستدامة" })
    ).toBeVisible();
  });
});
