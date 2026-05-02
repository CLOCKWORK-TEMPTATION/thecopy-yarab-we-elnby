import { mkdir } from "node:fs/promises";
import path from "node:path";

import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

async function ensureArtifactDir(): Promise<string> {
  const artifactDir = path.resolve(
    process.cwd(),
    "..",
    "..",
    "output",
    "playwright",
    "budget-runtime"
  );
  await mkdir(artifactDir, { recursive: true });
  return artifactDir;
}

async function clearBudgetState(
  baseURL: string,
  request: APIRequestContext
): Promise<void> {
  const readResponse = await request.get(`${baseURL}/api/app-state/BUDGET`);
  const setCookie = readResponse
    .headersArray()
    .find((header) => header.name.toLowerCase() === "set-cookie")?.value;

  if (!setCookie) {
    return;
  }

  const cookie = setCookie.split(";")[0] ?? "";
  const token = cookie.split("=")[1] ?? "";

  if (!token) {
    return;
  }

  await request.delete(`${baseURL}/api/app-state/BUDGET`, {
    headers: {
      Cookie: cookie,
      Origin: baseURL,
      "X-XSRF-TOKEN": token,
    },
  });
}

async function gotoReadyBudgetPage(page: Page, baseURL: string): Promise<void> {
  await page.goto(`${baseURL}/BUDGET`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByTestId("budget-title-input")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId("budget-scenario-input")).toBeVisible();
  await expect(page.getByTestId("budget-generate-button")).toBeVisible();
}

test.describe("budget runtime", () => {
  test.describe.configure({ mode: "serial" });
  // تعليق عربي: هذا المسار يشغّل توليدًا حيًا وتصديرًا فعليًا ثم يتحقق من الاستعادة،
  // وتحت الحمل الموازي للمجموعة الكاملة قد يتجاوز 180 ثانية رغم نجاحه السلوكي.
  test.setTimeout(300_000);

  test("ينشئ الميزانية ويصدرها ويستعيدها بعد التحديث", async ({
    page,
    request,
    context,
    baseURL,
    browserName,
  }, testInfo) => {
    const resolvedBaseURL = baseURL ?? "http://127.0.0.1:5000";
    const artifactDir = await ensureArtifactDir();
    const shouldCollectManualTrace =
      browserName === "chromium" && testInfo.retry === 0;
    let manualTraceStarted = false;

    await clearBudgetState(resolvedBaseURL, request);
    if (shouldCollectManualTrace) {
      await context.tracing.start({ screenshots: true, snapshots: true });
      manualTraceStarted = true;
    }

    try {
      await gotoReadyBudgetPage(page, resolvedBaseURL);

      await page.getByTestId("budget-title-input").fill("مطاردة الكورنيش");
      await page
        .getByTestId("budget-scenario-input")
        .fill(
          "مشهد مطاردة سيارات نهارية في شارعين مع بطليْن ومشهد انفجار واحد وثلاثة أيام تصوير."
        );

      const generateButton = page.getByTestId("budget-generate-button");
      const generationResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/budget/generate") &&
          response.request().method() === "POST"
      );

      await generateButton.click();
      await expect(generateButton).toBeDisabled();

      const generationResponse = await generationResponsePromise;
      expect(generationResponse.status()).toBe(200);
      const generationPayload = (await generationResponse.json()) as {
        success: boolean;
        data: {
          meta: { source: string };
          budget: { grandTotal: number };
        };
      };

      expect(generationPayload.success).toBe(true);
      expect(["ai", "fallback"]).toContain(generationPayload.data.meta.source);
      expect(generationPayload.data.budget.grandTotal).toBeGreaterThan(0);

      // تعليق عربي: لا نعتبر التغيير الشكلي نجاحًا إلا بعد ظهور ناتج ميزانية فعلي قابل للاستخدام.
      await expect(page.getByTestId("budget-grand-total")).not.toHaveText("—");
      await expect(page.getByText("مصدر التوليد")).toBeVisible();

      const fallbackBanner = page.getByTestId("budget-fallback-banner");
      if (generationPayload.data.meta.source === "fallback") {
        await expect(fallbackBanner).toBeVisible();
      } else {
        await expect(fallbackBanner).toHaveCount(0);
      }

      await page.screenshot({
        path: path.join(artifactDir, "budget-success.png"),
        fullPage: true,
      });

      const downloadPromise = page.waitForEvent("download");
      await page.getByTestId("budget-export-button").click();
      const download = await downloadPromise;
      await download.saveAs(path.join(artifactDir, "budget-export.xlsx"));

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("budget-title-input")).toBeVisible({
        timeout: 60_000,
      });
      await expect(page.getByTestId("budget-title-input")).toHaveValue(
        "مطاردة الكورنيش"
      );
      await expect(page.getByTestId("budget-grand-total")).not.toHaveText("—");
      await expect(page.getByTestId("budget-persisted-at")).toContainText(
        "آخر حفظ"
      );
    } finally {
      if (manualTraceStarted) {
        try {
          await context.tracing.stop({
            path: path.join(artifactDir, "budget-success-trace.zip"),
          });
        } catch (error) {
          if (!String(error).includes("has been closed")) {
            console.warn("budget trace stop failed", error);
          }
        }
      }
    }
  });

  test("يعرض خطأ واضحاً عند محاولة الإنشاء بدون سيناريو", async ({
    page,
    request,
    baseURL,
  }) => {
    const resolvedBaseURL = baseURL ?? "http://127.0.0.1:5000";
    const artifactDir = await ensureArtifactDir();

    await clearBudgetState(resolvedBaseURL, request);

    await gotoReadyBudgetPage(page, resolvedBaseURL);

    await page.getByTestId("budget-title-input").fill("اختبار بلا سيناريو");
    await page.getByTestId("budget-generate-button").click();

    await expect(page.getByTestId("budget-error-alert")).toContainText(
      "أدخل السيناريو أولاً لإنشاء الميزانية."
    );
    await expect(page.getByTestId("budget-summary-empty")).toContainText(
      "لم تُنشأ الميزانية بعد."
    );

    await page.screenshot({
      path: path.join(artifactDir, "budget-validation-error.png"),
      fullPage: true,
    });
  });
});
