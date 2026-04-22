import { expect, test, type Page } from "@playwright/test";
import {
  dispatchPaste,
  fixturePaths,
  getEditorSurface,
  openFile,
} from "./helpers/progressive";

test.describe("progressive failure retention", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(240_000);

  const expectFailedSurfaceRetention = async (page: Page) => {
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
      "false"
    );

    await failureButton.click();
    await expect(page.getByTestId("app-header")).toContainText("جاهز");
    await expect(getEditorSurface(page)).toHaveAttribute(
      "contenteditable",
      "true"
    );
    await expect(getEditorSurface(page)).toContainText(failedText.trim());
  };

  test("keeps pasted text visible when text-extract fails after first render", async ({
    page,
  }) => {
    await page.route("**/api/text-extract", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "forced-text-extract-failure" }),
      });
    });

    await page.goto("/editor", { waitUntil: "domcontentloaded" });
    await dispatchPaste(page, "محمد:\nمساء الخير\nنادية:\nأهلا وسهلا");
    await expect(getEditorSurface(page)).toContainText("محمد");

    await expectFailedSurfaceRetention(page);
  });

  test("keeps DOC visible text when suspicion-review fails after the Karank version", async ({
    page,
  }) => {
    await page.route("**/api/suspicion-review", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "forced-suspicion-review-failure" }),
      });
    });

    await page.goto("/editor", { waitUntil: "domcontentloaded" });
    await openFile(page, fixturePaths.doc);

    await expectFailedSurfaceRetention(page);
  });

  test("keeps the last visible text on final-review failure until explicit recovery", async ({
    page,
  }) => {
    await page.route("**/api/final-review", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "forced-final-review-failure" }),
      });
    });

    await page.goto("/editor", { waitUntil: "domcontentloaded" });
    await openFile(page, fixturePaths.docx);

    await expectFailedSurfaceRetention(page);
  });

  test("keeps PDF visible text when suspicion-review fails after downstream updates", async ({
    page,
  }) => {
    await page.route("**/api/suspicion-review", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "forced-suspicion-review-failure-pdf" }),
      });
    });

    await page.goto("/editor", { waitUntil: "domcontentloaded" });
    await openFile(page, fixturePaths.pdf);

    await expectFailedSurfaceRetention(page);
  });
});
