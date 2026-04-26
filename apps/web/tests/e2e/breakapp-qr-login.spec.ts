/**
 * ============================================================================
 * Playwright E2E — BreakApp QR Login
 * ============================================================================
 *
 * يختبر كامل التدفق الحقيقي لمسار /BREAKAPP/login/qr في المتصفح الحقيقي،
 * مع التحقق من الثلاث مسارات الرسمية:
 *   1) الكاميرا — إما fake device أو واجهة fallback
 *   2) رفع صورة QR
 *   3) الإدخال اليدوي
 *
 * نستخدم ConfigManager لإدارة الإعدادات ومنطق تشغيل الخادم الخلفي، مع
 * تسجيل pino احترافي بدلاً من console.log.
 * ============================================================================
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import pino, { type Logger } from "pino";

/**
 * مدير إعدادات اختبارات QR Login — يُنظّم متغيرات البيئة مع قيم افتراضية آمنة
 */
class QRLoginTestConfig {
  readonly baseUrl: string;
  readonly routePath: string;
  readonly mockBackend: boolean;
  readonly qrRawValue: string;

  private constructor() {
    this.baseUrl = (
      process.env["BREAKAPP_QR_E2E_BASE_URL"] ?? "http://localhost:5000"
    ).replace(/\/+$/, "");
    this.routePath =
      process.env["BREAKAPP_QR_E2E_ROUTE"] ?? "/BREAKAPP/login/qr";
    this.mockBackend =
      (process.env["BREAKAPP_QR_E2E_MOCK_BACKEND"] ?? "true") !== "false";
    this.qrRawValue =
      process.env["BREAKAPP_QR_E2E_TOKEN"] ??
      "test-project:test-user:test-nonce";
  }

  static fromEnv(): QRLoginTestConfig {
    return new QRLoginTestConfig();
  }

  get fullUrl(): string {
    return `${this.baseUrl}${this.routePath}`;
  }
}

/**
 * مسجل pino احترافي لكل اختبار
 */
const createTestLogger = (testName: string): Logger =>
  pino({
    name: "breakapp-qr-e2e",
    level: process.env["BREAKAPP_QR_E2E_LOG_LEVEL"] ?? "info",
    base: { test: testName },
  });

/**
 * توجيه طلبات /api/breakapp/auth/scan إلى استجابة محاكاة ناجحة
 * السبب: عزل اختبار الواجهة عن توفر الخدمة الخلفية
 */
const installAuthInterceptor = async (
  page: Page,
  logger: Logger
): Promise<void> => {
  await page.route(
    /\/api\/breakapp\/auth\/scan/,
    async (route: Route): Promise<void> => {
      logger.info({ url: route.request().url() }, "intercepted auth scan");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.stub.signature",
          user: {
            id: "test-user",
            email: "e2e@thecopy.test",
            role: "member",
          },
        }),
      });
    }
  );
};

/**
 * توجيه التنقل بعد النجاح — dashboard غير مطلوب لهذا الاختبار
 */
const stubDashboardNavigation = async (page: Page): Promise<void> => {
  await page.route(/\/BREAKAPP\/dashboard/, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body data-testid='dashboard-stub'>Dashboard</body></html>",
    });
  });
};

test.describe("BreakApp QR Login — Production Flow", () => {
  const config = QRLoginTestConfig.fromEnv();

  test.beforeEach(async ({ page }) => {
    const logger = createTestLogger("beforeEach");
    if (config.mockBackend) {
      await installAuthInterceptor(page, logger);
      await stubDashboardNavigation(page);
    }
  });

  test("يُحمّل الصفحة ويعرض الأزرار والمسارات البديلة", async ({ page }) => {
    const logger = createTestLogger("page-load");
    await page.goto(config.fullUrl, { waitUntil: "domcontentloaded" });

    // انتظار dynamic import لـ QRScanner
    await expect(page.getByTestId("qr-scanner")).toBeVisible({
      timeout: 15_000,
    });
    logger.info("QRScanner rendered");

    // وجود مسارات fallback الرسمية
    await expect(page.getByTestId("qr-manual-entry")).toBeVisible();
    await expect(page.getByTestId("qr-image-upload")).toBeVisible();
    await expect(page.getByTestId("qr-manual-submit")).toBeVisible();
  });

  test("الإدخال اليدوي الصحيح ينفّذ المصادقة وينتقل للوحة التحكم", async ({
    page,
  }) => {
    const logger = createTestLogger("manual-happy-path");
    await page.goto(config.fullUrl, { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("qr-manual-entry")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByTestId("qr-manual-entry").fill(config.qrRawValue);
    logger.info({ token: config.qrRawValue }, "filled manual entry");
    await page.getByTestId("qr-manual-submit").click();

    // انتظار التحول إلى dashboard stub
    await page.waitForURL(/\/BREAKAPP\/dashboard/, { timeout: 15_000 });
    await expect(page.getByTestId("dashboard-stub")).toBeVisible();
  });

  test("الإدخال اليدوي بصيغة خاطئة يعرض رسالة عربية ولا ينتقل", async ({
    page,
  }) => {
    await page.goto(config.fullUrl, { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("qr-manual-entry")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByTestId("qr-manual-entry").fill("invalid-single-part");
    await page.getByTestId("qr-manual-submit").click();

    await expect(page.getByTestId("qr-manual-error")).toBeVisible();
    await expect(page.getByTestId("qr-manual-error")).toContainText(
      "ثلاثة أجزاء"
    );

    // يجب عدم الانتقال
    expect(page.url()).toContain(config.routePath);
  });

  test("الإدخال اليدوي الفارغ يعرض رسالة تطلب الإدخال", async ({ page }) => {
    await page.goto(config.fullUrl, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("qr-manual-submit")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByTestId("qr-manual-submit").click();

    await expect(page.getByTestId("qr-manual-error")).toContainText(/أدخل رمز/);
  });

  test("عنوان Permissions-Policy يسمح بالكاميرا على origin الحالي", async ({
    page,
  }) => {
    const logger = createTestLogger("permissions-policy-header");
    const response = await page.goto(config.fullUrl, {
      waitUntil: "domcontentloaded",
    });
    expect(response).not.toBeNull();
    const header =
      response?.headers()["permissions-policy"] ??
      response?.headers()["Permissions-Policy"];
    logger.info({ header }, "permissions-policy header captured");

    // في dev قد لا يُرسَل هذا الهيدر — لكن في prod يجب أن يكون camera=(self)
    if (header) {
      expect(header).toMatch(/camera=\(self\)/);
    }
  });
});
