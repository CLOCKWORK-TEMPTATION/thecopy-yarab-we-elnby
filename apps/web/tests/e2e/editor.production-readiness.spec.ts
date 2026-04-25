import { expect, test, type Page } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const installClipboardStub = async (page: Page) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          window.localStorage.setItem("__editor_test_clipboard__", value);
        },
        readText: async () =>
          window.localStorage.getItem("__editor_test_clipboard__") ?? "",
      },
    });
  });
};

const openEditorWithCleanStorage = async (page: Page) => {
  await page.goto("/editor");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
  await expect(page.getByTestId("app-root")).toBeVisible();
};

const openMenu = async (page: Page, sectionLabel: string) => {
  await page.getByTestId(`menu-section-${sectionLabel}`).click();
};

const pressControlShortcut = async (page: Page, key: string) => {
  await page.keyboard.down("Control");
  await page.keyboard.press(key);
  await page.keyboard.up("Control");
};

test.describe("/editor production readiness", () => {
  test("القوائم تبقى قابلة للاستخدام والملف النصي يُفتح من الجهاز", async ({
    page,
  }) => {
    await openEditorWithCleanStorage(page);

    await openMenu(page, "ملف");
    await expect(page.getByTestId("menu-action-open-file")).toBeVisible();
    await page.locator('[contenteditable="true"]').first().click();
    await expect(page.getByTestId("menu-action-open-file")).not.toBeVisible();

    await openMenu(page, "ملف");
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByTestId("menu-action-open-file").click();
    const chooser = await chooserPromise;
    await chooser.setFiles(
      path.resolve(__dirname, "fixtures", "sample-screenplay.txt")
    );

    const editorSurface = page.locator('[contenteditable="true"]').first();
    await expect(editorSurface).toContainText("داخلي - مكتب - نهار");

    await openMenu(page, "ملف");
    await expect(page.getByTestId("menu-action-open-file")).toBeVisible();
  });

  test("فتح ملف لا يترك سطح التحرير مقفلاً ويمكن تعديل النص بعد الاستقرار", async ({
    page,
  }) => {
    await openEditorWithCleanStorage(page);

    await openMenu(page, "ملف");
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByTestId("menu-action-open-file").click();
    const chooser = await chooserPromise;
    await chooser.setFiles(
      path.resolve(__dirname, "fixtures", "sample-screenplay.txt")
    );

    const editorSurface = page.locator('[contenteditable="true"]').first();
    await expect(editorSurface).toContainText("داخلي - مكتب - نهار");
    await expect(editorSurface).toHaveAttribute("contenteditable", "true");

    await editorSurface.click();
    await page.keyboard.press("End");
    await page.keyboard.insertText(" تعديل حي");
    await expect(editorSurface).toContainText("تعديل حي");
  });

  test("إدراج القالب يتم كسطر بنيوي مستقل والتراجع والإعادة يعملان", async ({
    page,
  }) => {
    await openEditorWithCleanStorage(page);

    const editorSurface = page.locator('[contenteditable="true"]').first();
    await editorSurface.click();
    await page.keyboard.type("نص تمهيدي");

    await openMenu(page, "إضافة");
    await page.getByTestId("menu-action-insert-template:action").click();

    await expect(editorSurface).toContainText("وصف الحدث...");
    await page.keyboard.press("Control+Z");
    await page.keyboard.press("Control+Y");
    await expect(editorSurface).toContainText("وصف الحدث...");
  });

  test("قالب الوصف يكون محدداً بعد الإدراج وقابلاً للاستبدال الفوري", async ({
    page,
  }) => {
    await openEditorWithCleanStorage(page);

    const editorSurface = page.locator('[contenteditable="true"]').first();
    await editorSurface.click();

    await openMenu(page, "إضافة");
    await page.getByTestId("menu-action-insert-template:action").click();
    await page.keyboard.insertText("حدث بديل مباشر");

    await expect(editorSurface).toContainText("حدث بديل مباشر");
    await expect(editorSurface).not.toContainText("وصف الحدث...");
  });

  test("القص والنسخ واللصق يعملون من القائمة والاختصارات", async ({
    page,
  }) => {
    await installClipboardStub(page);
    await openEditorWithCleanStorage(page);

    const editorSurface = page.locator('[contenteditable="true"]').first();
    await editorSurface.click();
    await page.keyboard.insertText("نص قابل للنقل");
    await pressControlShortcut(page, "KeyA");

    await openMenu(page, "تعديل");
    await page.getByTestId("menu-action-copy").click();
    await expect(page.getByText("تم نسخ النص إلى الحافظة.")).toBeVisible();

    await openMenu(page, "تعديل");
    await page.getByTestId("menu-action-cut").click();
    await expect(editorSurface).not.toContainText("نص قابل للنقل");

    await openMenu(page, "تعديل");
    await page.getByTestId("menu-action-paste").click();
    await expect(editorSurface).toContainText("نص قابل للنقل");
    await expect(editorSurface).toHaveAttribute("contenteditable", "true");

    await editorSurface.click();
    await pressControlShortcut(page, "KeyA");
    await pressControlShortcut(page, "KeyC");
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe("نص قابل للنقل");
    await page.keyboard.press("Backspace");
    await editorSurface.click();
    await pressControlShortcut(page, "KeyV");
    await expect(editorSurface).toContainText("نص قابل للنقل");
  });

  test("الحفظ المحلي يستعيد النص والهيكل بعد إعادة التحميل", async ({
    page,
  }) => {
    await openEditorWithCleanStorage(page);

    const editorSurface = page.locator('[contenteditable="true"]').first();
    await editorSurface.click();
    await page.keyboard.insertText("نص محفوظ بعد إعادة التحميل");
    await page.keyboard.press("Control+S");
    await expect(
      page.getByText("تم حفظ المسودة الحالية في متصفحك")
    ).toBeVisible();

    await page.reload();
    await expect(page.locator('[contenteditable="true"]').first()).toContainText(
      "نص محفوظ بعد إعادة التحميل"
    );
  });

  test("التصدير ينتج ملفاً قابلاً للتنزيل برسالة واضحة", async ({ page }) => {
    await openEditorWithCleanStorage(page);

    const editorSurface = page.locator('[contenteditable="true"]').first();
    await editorSurface.click();
    await page.keyboard.insertText("نص جاهز للتصدير");

    await openMenu(page, "ملف");
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("menu-action-export-fountain").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain("screenplay-export");
    await expect(page.getByText("تم تصدير الملف بصيغة Fountain.")).toBeVisible();
  });

  test("التنقل بزر التبويب لا يسبب انزياحاً أفقياً للمحرر", async ({
    page,
  }) => {
    await openEditorWithCleanStorage(page);

    const editorSurface = page.locator('[contenteditable="true"]').first();
    const scrollSurface = page.locator(".app-editor-scroll").first();
    await editorSurface.click();

    await page.keyboard.press("Tab");

    const scrollLeft = await scrollSurface.evaluate((node) => node.scrollLeft);
    const documentScrollLeft = await page.evaluate(
      () => document.scrollingElement?.scrollLeft ?? 0
    );

    expect(scrollLeft).toBe(0);
    expect(documentScrollLeft).toBe(0);
  });

  test("عنصر المكتبة ينفذ إجراءً فعلياً داخل المحرر", async ({
    page,
  }) => {
    await openEditorWithCleanStorage(page);

    await page.getByRole("button", { name: /المكتبة/ }).click();
    await page.getByRole("button", { name: /المفضلة/ }).click();
    await expect(page.locator('[contenteditable="true"]').first()).toContainText(
      "اسم الشخصية:"
    );
  });
});
