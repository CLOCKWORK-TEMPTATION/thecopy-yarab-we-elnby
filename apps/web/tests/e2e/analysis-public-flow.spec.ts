import { expect, test, type Page } from "@playwright/test";

const BASE_URL = (
  process.env["ANALYSIS_E2E_BASE_URL"] ??
  process.env["PLAYWRIGHT_BASE_URL"] ??
  `http://127.0.0.1:${process.env["PLAYWRIGHT_PORT"] ?? "5010"}`
).replace(/\/+$/, "");

const ANALYSIS_ID = "e2e-analysis";

function sseEvent(id: number, event: string, data: unknown): string {
  return `id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function completedSseBody(): string {
  const events: string[] = [
    sseEvent(1, "pipeline.started", {
      type: "pipeline.started",
      analysisId: ANALYSIS_ID,
      projectName: "اختبار التحليل",
      capabilities: { exports: ["json", "docx"] },
    }),
  ];

  let id = 2;
  for (const stationId of [1, 2, 3, 4, 5, 6, 7] as const) {
    events.push(
      sseEvent(id++, "station.started", {
        type: "station.started",
        stationId,
        name: `المحطة ${stationId}`,
        at: new Date("2026-04-30T00:00:00.000Z").toISOString(),
      })
    );
    events.push(
      sseEvent(id++, "station.completed", {
        type: "station.completed",
        stationId,
        output: {
          details: {
            fullAnalysis: `نتيجة المحطة ${stationId}`,
            ...(stationId === 7
              ? { finalReport: "تقرير التحليل النهائي" }
              : {}),
          },
        },
        confidence: 0.91,
        durationMs: 10,
      })
    );
  }

  events.push(
    sseEvent(id, "pipeline.completed", {
      type: "pipeline.completed",
      status: "completed",
      durationMs: 140,
    })
  );

  return events.join("");
}

async function mockSuccessfulAnalysis(page: Page): Promise<void> {
  await page.route(
    "**/api/public/analysis/seven-stations/start",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, analysisId: ANALYSIS_ID }),
      });
    }
  );

  await page.route(
    `**/api/public/analysis/seven-stations/stream/${ANALYSIS_ID}`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream; charset=utf-8",
        body: completedSseBody(),
      });
    }
  );

  await page.route(
    `**/api/public/analysis/seven-stations/${ANALYSIS_ID}/export`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        headers: {
          "content-disposition": `attachment; filename="analysis-${ANALYSIS_ID}.json"`,
        },
        body: JSON.stringify({ analysisId: ANALYSIS_ID, status: "completed" }),
      });
    }
  );
}

test.describe("analysis public flow", () => {
  test("starts analysis, completes stations, exports valid formats, and resets", async ({
    page,
  }) => {
    await mockSuccessfulAnalysis(page);

    await page.goto(`${BASE_URL}/analysis`, { waitUntil: "domcontentloaded" });
    await page
      .getByPlaceholder("ألصق النص الدرامي هنا لبدء التحليل ...")
      .fill("نص عربي طويل لاختبار مسار التحليل العام");
    await page.getByRole("button", { name: /ابدأ التحليل/ }).click();

    await expect(page).toHaveURL(/analysis=e2e-analysis/);
    await expect(page.getByRole("button", { name: /تصدير JSON/ })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("button", { name: /تصدير DOCX/ })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /PDF/ })).toHaveCount(0);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /تصدير JSON/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`analysis-${ANALYSIS_ID}.json`);

    await page.getByRole("button", { name: /إعادة تعيين/ }).click();
    await expect(page).not.toHaveURL(/analysis=/);
    await expect(
      page.getByPlaceholder("ألصق النص الدرامي هنا لبدء التحليل ...")
    ).toHaveValue("");
    await expect(page.getByRole("button", { name: /تصدير JSON/ })).toHaveCount(
      0
    );
  });

  test("shows controlled error text when upstream returns html", async ({
    page,
  }) => {
    await page.route(
      "**/api/public/analysis/seven-stations/start",
      async (route) => {
        await route.fulfill({
          status: 404,
          contentType: "text/html",
          body: "<!DOCTYPE html><html><body>Cannot POST</body></html>",
        });
      }
    );

    await page.goto(`${BASE_URL}/analysis`, { waitUntil: "domcontentloaded" });
    await page
      .getByPlaceholder("ألصق النص الدرامي هنا لبدء التحليل ...")
      .fill("نص عربي طويل لاختبار فشل الخادم");
    await page.getByRole("button", { name: /ابدأ التحليل/ }).click();

    await expect(
      page.getByText("خدمة التحليل غير متاحة الآن، حاول مرة أخرى بعد لحظات")
    ).toBeVisible();
    await expect(page.getByText(/<!DOCTYPE|Cannot POST/)).toHaveCount(0);
  });

  test("shows controlled error text when the network goes offline", async ({
    context,
    page,
  }) => {
    await page.goto(`${BASE_URL}/analysis`, { waitUntil: "domcontentloaded" });
    const input = page.getByPlaceholder(
      "ألصق النص الدرامي هنا لبدء التحليل ..."
    );
    await expect(input).toBeVisible();
    await context.setOffline(true);
    await input.fill("نص عربي طويل لاختبار انقطاع الشبكة");
    await page.getByRole("button", { name: /ابدأ التحليل/ }).click();

    await expect(page.getByText(/تعذر الاتصال بخدمة التحليل/)).toBeVisible();
    await expect(page.getByText(/Failed to fetch/)).toHaveCount(0);
    await context.setOffline(false);
  });
});
