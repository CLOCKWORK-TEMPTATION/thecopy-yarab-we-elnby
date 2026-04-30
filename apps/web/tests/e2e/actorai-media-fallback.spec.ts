import { expect, test } from "@playwright/test";

test.describe("ActorAI Arabic media fallbacks", () => {
  test("يعرض بديل الميكروفون ويحلل عينة صوتية داخل الصفحة الحية", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(globalThis, "AudioContext", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(globalThis, "webkitAudioContext", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: undefined,
      });
    });

    await page.goto("/actorai-arabic?view=voicecoach", {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByRole("button", { name: /استخدام عينة صوتية/ })
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByLabel(/رفع ملف صوتي بديل/)).toBeVisible({
      timeout: 60_000,
    });

    await page.getByRole("button", { name: /استخدام عينة صوتية/ }).click();
    await expect(page.getByText(/تم تحميل عينة صوتية تدريبية/)).toBeVisible();
  });

  test("يعرض بديل الكاميرا ويولد نتيجة تدريب بصرية داخل الصفحة الحية", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: undefined,
      });
    });

    await page.goto("/actorai-arabic?view=webcam", {
      waitUntil: "domcontentloaded",
    });

    await page.getByRole("button", { name: /تفعيل الكاميرا/ }).click();

    await expect(
      page.getByRole("button", { name: /استخدام عينة تدريب/ })
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByLabel(/رفع ملف مرجعي/)).toBeVisible({
      timeout: 60_000,
    });

    await page.getByRole("button", { name: /استخدام عينة تدريب/ }).click();
    await expect(page.getByText("74")).toBeVisible();
    await expect(page.getByText(/عينة تدريب بصرية جاهزة/)).toBeVisible();
  });
});
