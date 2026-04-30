import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const imageFixturePath = resolve(
  process.cwd(),
  "tests/fixtures/media/sample-shot.png"
);
const videoFixturePath = resolve(
  process.cwd(),
  "tests/fixtures/media/sample-footage.mp4"
);

async function openShotAnalyzer(page: import("@playwright/test").Page) {
  await page.goto("/cinematography-studio", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/VISION CINEAI/i)).toBeVisible({
    timeout: 60_000,
  });
  await page.getByText("محلل اللقطة", { exact: false }).first().click();
  await expect(page.getByText("محلل اللقطة الحي")).toBeVisible({
    timeout: 60_000,
  });
}

async function expectShotAnalysisResult(page: import("@playwright/test").Page) {
  await expect(page.getByText(/\d{1,3}\/100/).first()).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText("Shot Notes")).toBeVisible();
}

test.describe("cinematography studio end-to-end", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(300_000);

  test("ينفذ مسار رفع صورة كاملًا ويظهر نتيجة تحليل فعلية", async ({
    page,
  }, testInfo) => {
    // هذا الاختبار يغطي تدفق نجاح رئيسي من منظور مستخدم نهائي.
    await openShotAnalyzer(page);

    const imageInput = page
      .locator('input[type="file"][accept="image/*"]')
      .first();
    await imageInput.setInputFiles(imageFixturePath);

    await page.getByRole("button", { name: "تحليل الإدخال المحدد" }).click();
    await expectShotAnalysisResult(page);

    await page.screenshot({
      path: testInfo.outputPath("cinema-shot-analysis-success.png"),
      fullPage: true,
    });
  });

  test("ينفذ مسار فيديو فعلي داخل محلل المشاهد في ما بعد الإنتاج", async ({
    page,
  }, testInfo) => {
    // هذا الاختبار يثبت أن مسار الفيديو لم يعد واجهة شكلية فقط.
    await page.goto("/cinematography-studio", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("button", { name: "المراحل" })).toBeVisible({
      timeout: 60_000,
    });
    await page.getByRole("button", { name: "المراحل" }).click();
    await page
      .getByRole("button", { name: /Post-Production|ما بعد الإنتاج/ })
      .click();
    await expect(
      page.getByText("محلل المشاهد - Footage Analyzer")
    ).toBeVisible();

    await page.getByRole("button", { name: "فيديو" }).first().click();
    const videoInput = page
      .locator('input[type="file"][accept="video/*"]')
      .first();
    await videoInput.setInputFiles(videoFixturePath);

    await expect(
      page.getByText("جاري استخراج إطار مرجعي من الفيديو قبل بدء التحليل.")
    ).toBeVisible();

    await page.getByRole("button", { name: "تحليل الإدخال الحالي" }).click();
    await expect(page.getByText("خلاصة التحليل")).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("cinema-post-video-analysis-success.png"),
      fullPage: true,
    });
  });

  test("يتعامل مع حالات الكاميرا ثم يسمح بمسار بديل دون انهيار", async ({
    page,
  }, testInfo) => {
    // هذا الاختبار يغطي مسار الكاميرا في حالتي السماح والرفض حسب مشروع التشغيل.
    await openShotAnalyzer(page);

    await page.getByRole("button", { name: "كاميرا" }).first().click();
    await page.getByRole("button", { name: "تفعيل الكاميرا" }).first().click();

    if (testInfo.project.name.includes("granted")) {
      await expect(
        page.getByRole("button", { name: "التقاط وتحليل" }).first()
      ).toBeVisible();
      await page.getByRole("button", { name: "التقاط وتحليل" }).first().click();
      await expectShotAnalysisResult(page);
    } else {
      await expect(
        page
          .getByText(
            /تم رفض صلاحية الكاميرا|تعذر تفعيل الكاميرا|لا توجد كاميرا|لا يدعم الوصول للكاميرا/
          )
          .first()
      ).toBeVisible();

      // التأكد من بقاء الصفحة مستقرة وإمكانية التحول إلى البديل.
      await page.getByRole("button", { name: "صورة" }).first().click();
      const imageInput = page
        .locator('input[type="file"][accept="image/*"]')
        .first();
      await imageInput.setInputFiles(imageFixturePath);
      await page.getByRole("button", { name: "تحليل الإدخال المحدد" }).click();
      await expectShotAnalysisResult(page);
    }

    await page.screenshot({
      path: testInfo.outputPath(
        `cinema-camera-path-${testInfo.project.name}.png`
      ),
      fullPage: true,
    });
  });
});
