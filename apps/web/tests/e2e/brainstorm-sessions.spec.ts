/**
 * E2E — brain-storm-ai session flow
 * Tests: create brief → start session → run phases → view concepts
 */

import { test, expect, type Page, type Route } from "@playwright/test";

const BASE_BRIEF_ID = "e2e-brief-001";
const BASE_SESSION_ID = "e2e-session-001";
const BASE_CONCEPT_ID = "e2e-concept-001";
const BASE_IDEA_ID = "e2e-idea-001";

const MOCK_BRIEF = {
  id: BASE_BRIEF_ID,
  title: "فيلم تشويق نفسي",
  body: "قصة عن شخص يكتشف أن ذاكرته مزيفة",
  audienceProfile: "بالغون 18-35",
  constraints: "ميزانية متوسطة",
  creativeSeed: "الهوية والذاكرة",
  createdBy: "user-1",
};

const MOCK_SESSION = {
  session: {
    id: BASE_SESSION_ID,
    briefId: BASE_BRIEF_ID,
    status: "planning",
  },
  brief: MOCK_BRIEF,
  ideas: [],
  concepts: [],
};

const MOCK_SESSION_WITH_IDEAS = {
  ...MOCK_SESSION,
  session: { ...MOCK_SESSION.session, status: "divergent" },
  ideas: [
    {
      id: BASE_IDEA_ID,
      ideaStrId: "IDEA-001",
      headline: "الصدى المزيف",
      premise: "رجل يكتشف أن كل ذكرياته زرعت بواسطة حكومة",
      technique: "whatif",
      status: "alive" as const,
      scores: {
        originality: 80,
        thematicDepth: 75,
        audienceFit: 70,
        conflictComplexity: 85,
        producibility: 60,
        culturalResonance: 72,
        composite: 74,
      },
    },
  ],
};

const MOCK_CONCEPTS = {
  concepts: [
    {
      concept: {
        id: BASE_CONCEPT_ID,
        dossierMd: "# الصدى المزيف\n\nفكرة تشويقية نفسية عن الذاكرة والهوية.",
        dossierJson: {
          logline: "رجل يكتشف أن ذاكرته كاملاً مزيفة",
          premise: "في مجتمع مراقب",
          themes: "الهوية والحرية",
          characters: "البطل: رجل في الثلاثينيات",
          conflictMap: "الفرد ضد الدولة",
          plotArc: "اكتشاف → صراع → تحرر",
          audienceGenre: "تشويق/إثارة للبالغين",
          producibilityBrief: "إنتاج متوسط التكلفة",
          productionNotes: "مواقع حضرية",
        },
      },
      idea: {
        id: BASE_IDEA_ID,
        ideaStrId: "IDEA-001",
        headline: "الصدى المزيف",
      },
    },
  ],
  brief: { title: "فيلم تشويق نفسي" },
};

async function setupMocks(page: Page): Promise<void> {
  await page.route("**/api/brainstorm/briefs", async (route: Route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: MOCK_BRIEF }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [MOCK_BRIEF] }),
      });
    }
  });

  await page.route("**/api/brainstorm/sessions", async (route: Route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { session: MOCK_SESSION.session },
      }),
    });
  });

  await page.route(
    `**/api/brainstorm/sessions/${BASE_SESSION_ID}`,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: MOCK_SESSION_WITH_IDEAS }),
      });
    }
  );

  await page.route(
    `**/api/brainstorm/sessions/${BASE_SESSION_ID}/divergent`,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    }
  );

  await page.route(
    `**/api/brainstorm/sessions/${BASE_SESSION_ID}/concepts`,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: MOCK_CONCEPTS }),
      });
    }
  );
}

test.describe("brain-storm-ai — session flow", () => {
  test.use({
    baseURL:
      process.env["PLAYWRIGHT_BASE_URL"] ??
      `http://127.0.0.1:${process.env["PLAYWRIGHT_PORT"] ?? "5010"}`,
  });

  test("يُنشئ brief جديد ويبدأ جلسة", async ({ page }) => {
    await setupMocks(page);
    await page.goto("/brain-storm-ai/briefs/new");

    await expect(
      page.getByTestId("brief-title"),
      "حقل العنوان ظاهر"
    ).toBeVisible();

    await page.getByTestId("brief-title").fill("فيلم تشويق نفسي");
    await page
      .getByTestId("brief-body")
      .fill("قصة عن شخص يكتشف أن ذاكرته مزيفة");
    await page.getByTestId("brief-audience").fill("بالغون 18-35");

    await page.getByTestId("submit-brief").click();

    await expect(page).toHaveURL(
      new RegExp(`/brain-storm-ai/sessions/${BASE_SESSION_ID}`),
      { timeout: 10000 }
    );
  });

  test("يعرض صفحة الجلسة مع المراحل والأفكار", async ({ page }) => {
    await setupMocks(page);
    await page.goto(`/brain-storm-ai/sessions/${BASE_SESSION_ID}`);

    await expect(page.getByTestId("session-page")).toBeVisible();
    await expect(page.getByTestId("phase-progress")).toBeVisible();

    await expect(
      page.getByTestId(`idea-card-IDEA-001`),
      "بطاقة الفكرة ظاهرة"
    ).toBeVisible();
  });

  test("يُشغّل مرحلة divergent وينعكس التغيير", async ({ page }) => {
    const planningSession = {
      ...MOCK_SESSION,
      session: { ...MOCK_SESSION.session, status: "planning" },
    };

    let callCount = 0;
    await page.route(
      `**/api/brainstorm/sessions/${BASE_SESSION_ID}`,
      async (route: Route) => {
        callCount += 1;
        const data =
          callCount === 1 ? planningSession : MOCK_SESSION_WITH_IDEAS;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data }),
        });
      }
    );
    await page.route(
      `**/api/brainstorm/sessions/${BASE_SESSION_ID}/divergent`,
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
    );

    await page.goto(`/brain-storm-ai/sessions/${BASE_SESSION_ID}`);
    await expect(
      page.getByTestId("run-phase-divergent"),
      "زر تشغيل مرحلة divergent ظاهر"
    ).toBeVisible();

    await page.getByTestId("run-phase-divergent").click();

    await expect(
      page.getByTestId(`idea-card-IDEA-001`),
      "الفكرة ظاهرة بعد تشغيل المرحلة"
    ).toBeVisible({ timeout: 10000 });
  });

  test("تعرض صفحة الـ concepts الدوسيه الصحيح", async ({ page }) => {
    await setupMocks(page);
    await page.goto(`/brain-storm-ai/sessions/${BASE_SESSION_ID}/concepts`);

    await expect(page.getByTestId("concepts-page")).toBeVisible();
    await expect(
      page.getByTestId("concept-tab-IDEA-001"),
      "تبويب الـ concept ظاهر"
    ).toBeVisible();
    await expect(
      page.getByTestId("dossier-IDEA-001"),
      "الدوسيه ظاهر"
    ).toBeVisible();
  });
});
