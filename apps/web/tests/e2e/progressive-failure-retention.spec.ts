import { expect, test, type Page } from "@playwright/test";

import {
  dispatchPaste,
  fixturePaths,
  getEditorSurface,
  installEditorRuntimeRouteMocks,
  openFile,
} from "./helpers/progressive";

test.describe("progressive failure retention", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(240_000);

  const expectFailedSurfaceRetention = async (
    page: Page,
    expectedText: string
  ) => {
    const failureButton = page.locator(
      '[data-testid="dismiss-progressive-failure"]'
    );
    await failureButton.waitFor({ state: "visible", timeout: 180_000 });

    const failedText = (await getEditorSurface(page).textContent()) ?? "";
    expect(failedText.trim().length).toBeGreaterThan(0);

    await expect(page.getByTestId("app-header")).toContainText(
      "فشل بعد الظهور"
    );
    await expect(getEditorSurface(page)).toHaveAttribute(
      "contenteditable",
      "true"
    );
    await expect(getEditorSurface(page)).toContainText(expectedText);

    await getEditorSurface(page).click();
    await page.keyboard.press("End");
    await page.keyboard.insertText(" تعديل بعد الفشل");
    await expect(getEditorSurface(page)).toContainText("تعديل بعد الفشل");
  };

  test("keeps pasted text editable when text-extract fails after first render", async ({
    page,
  }) => {
    await installEditorRuntimeRouteMocks(page, {
      textExtractFailure: "forced-text-extract-failure",
    });

    await page.goto("/editor", { waitUntil: "domcontentloaded" });
    await dispatchPaste(page, "محمد:\nمساء الخير\nنادية:\nأهلا وسهلا");
    await expect(getEditorSurface(page)).toContainText("محمد");

    await expectFailedSurfaceRetention(page, "محمد");
  });

  test("keeps existing text editable when DOC import fails before first render", async ({
    page,
  }) => {
    await installEditorRuntimeRouteMocks(page, {
      fileExtractFailure: "forced-file-extract-failure",
    });

    await page.goto("/editor", { waitUntil: "domcontentloaded" });
    await getEditorSurface(page).click();
    await page.keyboard.insertText("نص سابق قبل فشل الاستيراد");
    await openFile(page, fixturePaths.doc);

    await expect(getEditorSurface(page)).toHaveAttribute(
      "contenteditable",
      "true"
    );
    await expect(page.getByTestId("editor-diagnostics-log")).toContainText(
      "forced-file-extract-failure"
    );
    await expect(getEditorSurface(page)).toContainText(
      "نص سابق قبل فشل الاستيراد"
    );
  });

  test("keeps DOCX visible text editable when text-extract fails after extraction", async ({
    page,
  }) => {
    await installEditorRuntimeRouteMocks(page, {
      includeSchemaElementsInFileExtract: false,
      textExtractFailure: "forced-docx-karank-failure",
    });

    await page.goto("/editor", { waitUntil: "domcontentloaded" });
    await openFile(page, fixturePaths.docx);

    await expectFailedSurfaceRetention(page, "الملخص التنفيذي");
  });

  test("keeps PDF visible text editable when text-extract fails after OCR output", async ({
    page,
  }) => {
    await installEditorRuntimeRouteMocks(page, {
      includeSchemaElementsInFileExtract: false,
      textExtractFailure: "forced-pdf-karank-failure",
    });

    await page.goto("/editor", { waitUntil: "domcontentloaded" });
    await openFile(page, fixturePaths.pdf);

    await expectFailedSurfaceRetention(page, "الملخص التنفيذي");
  });
});
