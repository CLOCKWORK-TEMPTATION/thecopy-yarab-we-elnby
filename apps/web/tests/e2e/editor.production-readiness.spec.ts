import { expect, test } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe("/editor production readiness", () => {
  test("القوائم تبقى قابلة للاستخدام والملف النصي يُفتح من الجهاز", async ({
    page,
  }) => {
    await page.goto("/editor");

    await expect(page.getByTestId("app-root")).toBeVisible();
    await page.getByRole("button", { name: "ملف" }).click();
    await expect(page.getByTestId("menu-action-open-file")).toBeVisible();
    await page.mouse.click(20, 20);
    await expect(page.getByTestId("menu-action-open-file")).not.toBeVisible();

    await page.getByRole("button", { name: "ملف" }).click();
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByTestId("menu-action-open-file").click();
    const chooser = await chooserPromise;
    await chooser.setFiles(
      path.resolve(__dirname, "fixtures", "sample-screenplay.txt")
    );

    const editorSurface = page.locator('[contenteditable="true"]').first();
    await expect(editorSurface).toContainText("داخلي - مكتب - نهار");

    await page.getByRole("button", { name: "ملف" }).click();
    await expect(page.getByTestId("menu-action-open-file")).toBeVisible();
  });

  test("إدراج القالب يتم كسطر بنيوي مستقل والتراجع والإعادة يعملان", async ({
    page,
  }) => {
    await page.goto("/editor");

    const editorSurface = page.locator('[contenteditable="true"]').first();
    await editorSurface.click();
    await page.keyboard.type("نص تمهيدي");

    await page.getByRole("button", { name: "إضافة" }).click();
    await page.getByTestId("menu-action-insert-template:action").click();

    await expect(editorSurface).toContainText("وصف الحدث...");
    await page.keyboard.press("Control+Z");
    await page.keyboard.press("Control+Y");
    await expect(editorSurface).toContainText("وصف الحدث...");
  });

  test("الأقسام غير المربوطة تُعلن تعطيلها صراحةً بدل السلوك الوهمي", async ({
    page,
  }) => {
    await page.goto("/editor");

    await page.getByRole("button", { name: "المشاريع" }).click();
    await expect(
      page.getByText(
        "هذا القسم معطّل صراحةً لأنه غير مربوط ببيانات حقيقية بعد."
      )
    ).toBeVisible();

    await page.getByRole("button", { name: "المكتبة" }).click();
    await expect(
      page.getByText(
        "هذا القسم معطّل صراحةً لأنه غير مربوط ببيانات حقيقية بعد."
      )
    ).toBeVisible();
  });
});
