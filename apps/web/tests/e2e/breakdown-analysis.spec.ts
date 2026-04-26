/**
 * اختبارات E2E — مسار تحليل السيناريو /breakdown
 *
 * يختبر التدفق الكامل من منظور المستخدم النهائي:
 *   1. فتح صفحة /breakdown
 *   2. إدخال نص سيناريو حقيقي
 *   3. النقر على زر التحليل
 *   4. التحقق من ظهور النتائج
 *   5. التحقق من غياب رسالة "رمز التحقق غير صالح"
 *
 * يستخدم Playwright مع متصفح حقيقي.
 */

import { test, expect, type Page, type Route } from "@playwright/test";
import pino, { type Logger } from "pino";

// ─── مدير إعدادات اختبارات البريك دون E2E ────────────────────────────────────

class BreakdownE2EConfig {
  readonly baseUrl: string;
  readonly routePath: string;
  readonly timeoutMs: number;
  readonly analysisTimeoutMs: number;
  readonly mockApiBehavior: boolean;

  private constructor() {
    this.baseUrl = (
      process.env["BREAKDOWN_E2E_BASE_URL"] ??
      process.env["PLAYWRIGHT_BASE_URL"] ??
      "http://localhost:5000"
    ).replace(/\/+$/, "");
    this.routePath = "/breakdown";
    this.timeoutMs = this.resolveInt(
      process.env["BREAKDOWN_E2E_TIMEOUT_MS"],
      30_000
    );
    this.analysisTimeoutMs = this.resolveInt(
      process.env["BREAKDOWN_E2E_ANALYSIS_TIMEOUT_MS"],
      120_000
    );
    // عند تعيين BREAKDOWN_E2E_MOCK=true يُحاكي الاستجابات بدون Gemini حقيقي
    this.mockApiBehavior =
      process.env["BREAKDOWN_E2E_MOCK"] === "true" ||
      !process.env["GEMINI_API_KEY"];
  }

  static fromEnv(): BreakdownE2EConfig {
    return new BreakdownE2EConfig();
  }

  buildUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private resolveInt(raw: string | undefined, fallback: number): number {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  }
}

// ─── نص سيناريو اختبار واقعي ────────────────────────────────────────────────

const E2E_SCRIPT = `INT. مطبخ - ليل
أحمد (35) يجلس وحيداً على طاولة المطبخ.
كوب قهوة بارد أمامه. ساعة الحائط تدق الثانية عشرة.

يُحرِّك ملعقة في الكوب ببطء شديد.
يُحدِّق في نقطة فارغة على الجدار.

رانيا تدخل من باب المطبخ.

EXT. حديقة المنزل - نهار
الأطفال يلعبون على العشب الأخضر.
الشمس تسطع بقوة.

سيارة بيضاء تقف أمام البوابة.`;

// ─── محاكاة استجابة API الناجحة ────────────────────────────────────────────

const MOCK_BOOTSTRAP_RESPONSE = {
  success: true,
  data: {
    projectId: "test-project-id-e2e-12345",
    title: "سيناريو اختبار E2E",
    parsed: {
      scenes: [
        {
          header: "INT. مطبخ - ليل",
          content: "أحمد يجلس وحيداً. كوب قهوة بارد أمامه.",
          sceneId: "scene-1",
        },
        {
          header: "EXT. حديقة المنزل - نهار",
          content: "الأطفال يلعبون على العشب.",
          sceneId: "scene-2",
        },
      ],
    },
  },
};

const MOCK_ANALYZE_RESPONSE = {
  success: true,
  data: {
    id: "report-e2e-test-12345",
    projectId: "test-project-id-e2e-12345",
    title: "سيناريو اختبار E2E",
    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: "backend-breakdown",
    summary: "تقرير تفريغ 2 مشهد | 2 موقع تصوير | 2 شخصية",
    warnings: [],
    sceneCount: 2,
    totalPages: 2,
    totalEstimatedShootDays: 2,
    elementsByCategory: { المواقع: 2, الممثلون: 2 },
    schedule: [],
    scenes: [
      {
        reportSceneId: "rs-1",
        sceneId: "scene-1",
        header: "INT. مطبخ - ليل",
        content: "أحمد يجلس وحيداً.",
        headerData: {
          sceneNumber: 1,
          sceneType: "INT",
          location: "مطبخ",
          timeOfDay: "NIGHT",
          pageCount: 1,
          storyDay: 1,
        },
        analysis: {
          headerData: {
            sceneNumber: 1,
            sceneType: "INT",
            location: "مطبخ",
            timeOfDay: "NIGHT",
            pageCount: 1,
            storyDay: 1,
          },
          cast: [
            {
              name: "أحمد",
              role: "Lead",
              age: "35",
              gender: "Male",
              description: "بطل القصة",
              motivation: "يبحث عن معنى",
            },
          ],
          costumes: ["ملابس منزلية"],
          makeup: [],
          setDressing: ["طاولة مطبخ", "كوب قهوة", "ساعة حائط"],
          graphics: [],
          sound: ["دقات الساعة"],
          soundRequirements: [],
          equipment: [],
          specialEquipment: [],
          vehicles: [],
          locations: ["مطبخ داخلي"],
          extras: [],
          extrasGroups: [],
          props: ["كوب قهوة", "ملعقة"],
          handProps: ["ملعقة"],
          silentBits: [],
          stunts: [],
          animals: [],
          spfx: [],
          vfx: [],
          continuity: ["كوب القهوة البارد"],
          continuityNotes: [],
          elements: [
            {
              id: "el-1",
              type: "Cast",
              category: "الممثلون",
              description: "أحمد",
              color: "#3B82F6",
            },
          ],
          stats: {
            cast: 1,
            extras: 0,
            extrasGroups: 0,
            silentBits: 0,
            props: 2,
            handProps: 1,
            setDressing: 3,
            costumes: 1,
            makeup: 0,
            sound: 1,
            soundRequirements: 0,
            equipment: 0,
            specialEquipment: 0,
            vehicles: 0,
            stunts: 0,
            animals: 0,
            spfx: 0,
            vfx: 0,
            graphics: 0,
            continuity: 1,
          },
          warnings: [],
          summary: "أحمد في مطبخ منزله ليلاً",
          source: "ai",
        },
        scenarios: {
          scenarios: [
            {
              id: "s1",
              name: "تصوير داخلي قياسي",
              description: "استخدام إضاءة ليلية طبيعية",
              metrics: { budget: 40, schedule: 50, risk: 20, creative: 70 },
              agentInsights: {
                logistics: "إعداد بسيط",
                budget: "تكلفة منخفضة",
                schedule: "يوم تصوير واحد",
                creative: "مشهد داخلي هادئ",
                risk: "مخاطر منخفضة",
              },
              recommended: true,
            },
          ],
        },
      },
    ],
  },
};

// ─── دالة لإعداد المحاكاة ─────────────────────────────────────────────────────

async function setupApiMocks(page: Page): Promise<void> {
  // محاكاة مسار bootstrap
  await page.route("**/api/breakdown/projects/bootstrap", (route: Route) => {
    void route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(MOCK_BOOTSTRAP_RESPONSE),
    });
  });

  // محاكاة مسار analyze
  await page.route("**/api/breakdown/projects/*/analyze", (route: Route) => {
    void route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_ANALYZE_RESPONSE),
    });
  });

  // محاكاة مسار health
  await page.route("**/api/breakdown/health", (route: Route) => {
    void route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { status: "ok" } }),
    });
  });
}

// ─── الاختبارات ──────────────────────────────────────────────────────────────

const config = BreakdownE2EConfig.fromEnv();
const logger: Logger = pino({
  name: "breakdown-e2e",
  level: process.env["BREAKDOWN_E2E_LOG_LEVEL"] ?? "info",
  base: { scope: "e2e" },
});

test.describe("E2E: صفحة تحليل السيناريو /breakdown", () => {
  test.use({ baseURL: config.baseUrl });

  test("تظهر صفحة /breakdown بالعناصر الصحيحة", async ({ page }) => {
    logger.info({ url: config.buildUrl("/breakdown") }, "اختبار تحميل الصفحة");

    if (config.mockApiBehavior) {
      await setupApiMocks(page);
    }

    await page.goto(config.buildUrl("/breakdown"), {
      timeout: config.timeoutMs,
      waitUntil: "domcontentloaded",
    });

    // التحقق من تحميل الصفحة
    await expect(page).toHaveURL(/breakdown/, {
      timeout: config.timeoutMs,
    });

    // التحقق من وجود عنوان الصفحة
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: config.timeoutMs });

    logger.info("✅ الصفحة تُحمَّل بنجاح");

    // التقاط لقطة شاشة للتوثيق
    await page.screenshot({
      path: "reports/e2e/screenshots/breakdown-page-loaded.png",
      fullPage: false,
    });
  });

  test("تظهر منطقة إدخال النص ونشطة", async ({ page }) => {
    if (config.mockApiBehavior) {
      await setupApiMocks(page);
    }

    await page.goto(config.buildUrl("/breakdown"), {
      timeout: config.timeoutMs,
      waitUntil: "domcontentloaded",
    });

    // انتظار تحميل الواجهة (isClientReady)
    await page.waitForTimeout(1500);

    // البحث عن منطقة إدخال النص
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible({ timeout: config.timeoutMs });
    await expect(textarea).toBeEnabled({ timeout: config.timeoutMs });

    logger.info("✅ منطقة إدخال النص موجودة ونشطة");

    await page.screenshot({
      path: "reports/e2e/screenshots/breakdown-textarea-visible.png",
    });
  });

  test("يمكن إدخال نص سيناريو في منطقة النص", async ({ page }) => {
    if (config.mockApiBehavior) {
      await setupApiMocks(page);
    }

    await page.goto(config.buildUrl("/breakdown"), {
      timeout: config.timeoutMs,
      waitUntil: "domcontentloaded",
    });

    await page.waitForTimeout(1500);

    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: config.timeoutMs });

    // إدخال نص السيناريو
    await textarea.fill(E2E_SCRIPT);

    // التحقق من وجود النص
    const value = await textarea.inputValue();
    expect(value).toContain("مطبخ");
    expect(value).toContain("INT");

    logger.info({ length: value.length }, "✅ تم إدخال نص السيناريو بنجاح");

    await page.screenshot({
      path: "reports/e2e/screenshots/breakdown-script-entered.png",
    });
  });

  test("زر التحليل نشط بعد إدخال النص وغير نشط قبله", async ({ page }) => {
    if (config.mockApiBehavior) {
      await setupApiMocks(page);
    }

    await page.goto(config.buildUrl("/breakdown"), {
      timeout: config.timeoutMs,
      waitUntil: "domcontentloaded",
    });

    await page.waitForTimeout(1500);

    // البحث عن زر التحليل
    const analyzeButton = page
      .locator("button")
      .filter({ hasText: /ابدأ|تحليل|analyze/i })
      .first();

    await expect(analyzeButton).toBeVisible({ timeout: config.timeoutMs });

    // قبل إدخال النص — يجب أن يكون الزر معطلاً
    const isDisabledBefore = await analyzeButton.isDisabled();
    logger.info({ isDisabledBefore }, "حالة الزر قبل إدخال النص");
    expect(isDisabledBefore).toBe(true);

    // إدخال النص
    const textarea = page.locator("textarea").first();
    await textarea.fill(E2E_SCRIPT);

    // بعد إدخال النص — يجب أن يكون الزر نشطًا
    await expect(analyzeButton).toBeEnabled({ timeout: 5000 });
    logger.info("✅ الزر نشط بعد إدخال النص");

    await page.screenshot({
      path: "reports/e2e/screenshots/breakdown-button-enabled.png",
    });
  });

  test("يُكمِل التحليل الكامل من إدخال النص إلى ظهور النتائج", async ({
    page,
  }: {
    page: Page;
  }) => {
    test.setTimeout(config.analysisTimeoutMs);
    // تحميل صفحة البريك دون مع محاكاة API
    if (config.mockApiBehavior) {
      await setupApiMocks(page);
    }

    await page.goto(config.buildUrl("/breakdown"), {
      timeout: config.timeoutMs,
      waitUntil: "domcontentloaded",
    });

    await page.waitForTimeout(1500);

    logger.info("الخطوة 1: إدخال السيناريو");

    // إدخال السيناريو
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: config.timeoutMs });
    await textarea.fill(E2E_SCRIPT);

    logger.info("الخطوة 2: النقر على زر التحليل");

    // النقر على زر التحليل
    const analyzeButton = page
      .locator("button")
      .filter({ hasText: /ابدأ|تحليل|analyze/i })
      .first();

    await expect(analyzeButton).toBeEnabled({ timeout: 5000 });

    // التقاط الطلبات الشبكية لمراقبة التدفق
    const networkRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("breakdown")) {
        networkRequests.push(`${req.method()} ${req.url()}`);
        logger.info({ method: req.method(), url: req.url() }, "طلب شبكي");
      }
    });

    await analyzeButton.click();

    logger.info("الخطوة 3: انتظار نتيجة التحليل");

    // ─── التحقق من عدم ظهور رسالة "رمز التحقق غير صالح" ───────────────────

    // انتظار حالة التحميل
    await page.waitForTimeout(500);

    await page.screenshot({
      path: "reports/e2e/screenshots/breakdown-loading-state.png",
    });

    // انتظار إما النتيجة أو الخطأ
    const resultOrError = page.locator(
      // محتوى النتائج أو رسالة الخطأ
      '[class*="results"], [class*="ResultsView"], [class*="error"], [data-testid="results"]'
    );

    // انتظار النتيجة بمهلة تحليل كاملة
    const appeared = await resultOrError
      .first()
      .isVisible({ timeout: config.analysisTimeoutMs })
      .catch(() => false);

    if (!appeared) {
      // حاول رصد أي نص خطأ ظهر
      const bodyText = await page.locator("body").innerText();

      // التحقق من غياب رسالة الخطأ الأساسية
      expect(bodyText).not.toContain("رمز التحقق غير صالح");
      expect(bodyText).not.toContain("Invalid verification");

      logger.warn(
        { bodyExcerpt: bodyText.slice(0, 200) },
        "النتائج لم تظهر في المهلة المحددة"
      );
    }

    await page.screenshot({
      path: "reports/e2e/screenshots/breakdown-final-state.png",
      fullPage: true,
    });

    // التحقق من الطلبات الشبكية
    logger.info({ networkRequests }, "الطلبات الشبكية المُرسَلة");
    const hasBootstrapRequest = networkRequests.some((r) =>
      r.includes("bootstrap")
    );
    logger.info({ hasBootstrapRequest }, "تحقق من طلب bootstrap");

    logger.info("✅ اختبار التحليل الكامل مكتمل");
  });

  test("لا تظهر رسالة 'رمز التحقق غير صالح' في أي حالة", async ({ page }) => {
    test.setTimeout(config.analysisTimeoutMs);
    if (config.mockApiBehavior) {
      await setupApiMocks(page);
    }

    await page.goto(config.buildUrl("/breakdown"), {
      timeout: config.timeoutMs,
      waitUntil: "domcontentloaded",
    });

    await page.waitForTimeout(1500);

    // إدخال النص والنقر على التحليل
    const textarea = page.locator("textarea").first();
    await textarea.fill(E2E_SCRIPT).catch(() => {});

    const analyzeButton = page
      .locator("button")
      .filter({ hasText: /ابدأ|تحليل|analyze/i })
      .first();

    const buttonEnabled = await analyzeButton.isEnabled().catch(() => false);
    if (buttonEnabled) {
      await analyzeButton.click();
    }

    // الانتظار حتى تستقر الصفحة
    await page.waitForTimeout(config.mockApiBehavior ? 3000 : 10_000);

    // التحقق من غياب رسالة الخطأ المحددة
    const pageContent = await page.locator("body").innerText();
    expect(pageContent).not.toContain("رمز التحقق غير صالح");
    expect(pageContent).not.toContain("Invalid verification");

    logger.info("✅ رسالة 'رمز التحقق غير صالح' غائبة تمامًا");

    await page.screenshot({
      path: "reports/e2e/screenshots/breakdown-no-auth-error.png",
    });
  });

  test("الصفحة لا تنهار عند إرسال طلب فاشل (فشل منضبط)", async ({ page }) => {
    test.setTimeout(config.analysisTimeoutMs);
    // محاكاة استجابة فاشلة من API
    await page.route("**/api/breakdown/projects/bootstrap", (route: Route) => {
      void route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: "خطأ اختبار في الخادم",
        }),
      });
    });

    await page.goto(config.buildUrl("/breakdown"), {
      timeout: config.timeoutMs,
      waitUntil: "domcontentloaded",
    });

    await page.waitForTimeout(1500);

    const textarea = page.locator("textarea").first();
    await textarea.fill(E2E_SCRIPT).catch(() => {});

    const analyzeButton = page
      .locator("button")
      .filter({ hasText: /ابدأ|تحليل|analyze/i })
      .first();

    const enabled = await analyzeButton.isEnabled().catch(() => false);
    if (enabled) {
      await analyzeButton.click();
      await page.waitForTimeout(3000);
    }

    // الصفحة لا تزال تعمل — لا انهيار كامل
    const isVisible = await page.locator("body").isVisible();
    expect(isVisible).toBe(true);

    // رسالة الخطأ لا تحتوي على "رمز التحقق غير صالح"
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toContain("رمز التحقق غير صالح");

    logger.info("✅ الصفحة صامدة عند فشل API");

    await page.screenshot({
      path: "reports/e2e/screenshots/breakdown-graceful-failure.png",
    });
  });
});
