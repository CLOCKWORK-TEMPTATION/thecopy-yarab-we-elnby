/**
 * E2E — breakdown session flow
 * Tests: upload screenplay → view scenes → open scene detail → view cast list
 */

import { test, expect, type Page, type Route } from "@playwright/test";

const BASE_PROJECT_ID = "e2e-project-001";
const BASE_SCENE_ID = "e2e-scene-001";

const MOCK_SCREENPLAY_RESPONSE = {
  success: true,
  data: { projectId: BASE_PROJECT_ID },
};

const MOCK_SESSION = {
  success: true,
  data: {
    id: "report-001",
    projectId: BASE_PROJECT_ID,
    title: "سيناريو الاختبار",
    generatedAt: new Date().toISOString(),
    scenes: [
      {
        reportSceneId: "rs-1",
        sceneId: BASE_SCENE_ID,
        header: "INT. مطبخ - ليل",
        content: "أحمد يجلس وحيداً. كوب قهوة بارد أمامه.",
        headerData: {
          sceneNumber: 1,
          type: "INT",
          location: "مطبخ",
          timeOfDay: "ليل",
          raw: "INT. مطبخ - ليل",
        },
        analysis: {
          cast: [
            {
              name: "أحمد",
              role: "Lead",
              age: "35",
              description: "بطل القصة",
            },
          ],
          props: ["كوب قهوة", "ملعقة"],
          handProps: ["ملعقة"],
          costumes: ["ملابس منزلية"],
          makeup: [],
          vehicles: [],
          stunts: [],
          spfx: [],
          vfx: [],
          setDressing: ["طاولة مطبخ", "ساعة حائط"],
          locations: ["مطبخ داخلي"],
          extras: [],
          summary: "أحمد في مطبخ منزله ليلاً",
          warnings: [],
          elements: [],
        },
      },
    ],
    schedule: [],
  },
};

const MOCK_ANALYSIS_TRIGGER = {
  success: true,
};

const E2E_SCRIPT = `INT. مطبخ - ليل

أحمد (35) يجلس وحيداً على طاولة المطبخ.
كوب قهوة بارد أمامه.`;

async function setupMocks(page: Page): Promise<void> {
  await page.route("**/api/breakdown/screenplays", async (route: Route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SCREENPLAY_RESPONSE),
    });
  });

  await page.route(
    `**/api/breakdown/sessions/${BASE_PROJECT_ID}`,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SESSION),
      });
    }
  );

  await page.route("**/api/breakdown/sessions", async (route: Route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ANALYSIS_TRIGGER),
      });
    }
  });
}

test.describe("breakdown — session flow", () => {
  test.use({
    baseURL:
      process.env["PLAYWRIGHT_BASE_URL"] ??
      `http://127.0.0.1:${process.env["PLAYWRIGHT_PORT"] ?? "5010"}`,
  });

  test("يرفع سيناريو وينتقل إلى صفحة الجلسة", async ({ page }) => {
    await setupMocks(page);
    await page.goto("/breakdown/screenplays/new");

    await expect(
      page.getByTestId("new-screenplay-page"),
      "صفحة السيناريو الجديد ظاهرة"
    ).toBeVisible();

    await page.getByTestId("screenplay-title").fill("سيناريو الاختبار");
    await page.getByTestId("screenplay-content").fill(E2E_SCRIPT);
    await page.getByTestId("submit-screenplay").click();

    await expect(page).toHaveURL(
      new RegExp(`/breakdown/sessions/${BASE_PROJECT_ID}`),
      { timeout: 10000 }
    );
  });

  test("تعرض قائمة المشاهد بشكل صحيح", async ({ page }) => {
    await setupMocks(page);
    await page.goto(`/breakdown/sessions/${BASE_PROJECT_ID}`);

    await expect(
      page.getByTestId("breakdown-session-page"),
      "صفحة الجلسة ظاهرة"
    ).toBeVisible();

    await expect(
      page.getByTestId(`scene-card-${BASE_SCENE_ID}`),
      "بطاقة المشهد ظاهرة"
    ).toBeVisible();
  });

  test("يُشغّل التحليل الكامل من زر الجلسة", async ({ page }) => {
    await setupMocks(page);
    await page.goto(`/breakdown/sessions/${BASE_PROJECT_ID}`);

    const runBtn = page.getByTestId("run-analysis-btn");
    await expect(runBtn).toBeVisible();
    await expect(runBtn).toBeEnabled();

    await runBtn.click();

    await expect(
      page.getByTestId(`scene-card-${BASE_SCENE_ID}`),
      "المشاهد لا تزال ظاهرة بعد التحليل"
    ).toBeVisible({ timeout: 10000 });
  });

  test("يفتح تفاصيل المشهد ويعرض BreakdownSheet", async ({ page }) => {
    await setupMocks(page);
    await page.goto(`/breakdown/sessions/${BASE_PROJECT_ID}`);

    await page.getByTestId(`scene-card-${BASE_SCENE_ID}`).click();

    await expect(page).toHaveURL(
      new RegExp(
        `/breakdown/sessions/${BASE_PROJECT_ID}/scenes/${BASE_SCENE_ID}`
      ),
      { timeout: 10000 }
    );

    await expect(
      page.getByTestId("scene-detail-page"),
      "صفحة تفاصيل المشهد ظاهرة"
    ).toBeVisible();

    await expect(
      page.getByTestId("breakdown-sheet"),
      "BreakdownSheet ظاهر"
    ).toBeVisible();
  });

  test("يُبدّل تبويبات BreakdownSheet", async ({ page }) => {
    await setupMocks(page);
    await page.goto(
      `/breakdown/sessions/${BASE_PROJECT_ID}/scenes/${BASE_SCENE_ID}`
    );

    await expect(page.getByTestId("breakdown-sheet")).toBeVisible();

    await page.getByTestId("breakdown-tab-cast").click();
    await expect(
      page.getByTestId("breakdown-tab-cast"),
      "تبويب الكاست نشط"
    ).toHaveClass(/amber/);

    await page.getByTestId("breakdown-tab-props").click();
    await expect(
      page.getByTestId("breakdown-tab-props"),
      "تبويب Props نشط"
    ).toHaveClass(/amber/);
  });

  test("يفتح صفحة التقارير ويعرض cast list", async ({ page }) => {
    await setupMocks(page);
    await page.goto(`/breakdown/sessions/${BASE_PROJECT_ID}`);

    await expect(
      page.getByTestId("view-reports-link"),
      "رابط التقارير ظاهر"
    ).toBeVisible();

    await page.getByTestId("view-reports-link").click();

    await expect(page).toHaveURL(
      new RegExp(`/breakdown/sessions/${BASE_PROJECT_ID}/reports`),
      { timeout: 10000 }
    );

    await expect(
      page.getByTestId("reports-page"),
      "صفحة التقارير ظاهرة"
    ).toBeVisible();

    await expect(
      page.getByTestId("report-tab-cast"),
      "تبويب الكاست ظاهر"
    ).toBeVisible();

    await expect(
      page.getByTestId("cast-list"),
      "قائمة الكاست ظاهرة"
    ).toBeVisible();
  });
});
