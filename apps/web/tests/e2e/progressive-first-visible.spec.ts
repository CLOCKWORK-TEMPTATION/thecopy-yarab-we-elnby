import { expect, test } from "@playwright/test";

import {
  dispatchPaste,
  fixturePaths,
  getEditorSurface,
  installEditorRuntimeRouteMocks,
  openFile,
  waitForApproval,
} from "./helpers/progressive";

test.describe("progressive first visible", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(240_000);

  test("reaches settled approval state for paste", async ({ page }) => {
    await installEditorRuntimeRouteMocks(page);
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/editor", { waitUntil: "domcontentloaded" });
    await dispatchPaste(page, "محمد:\nمساء الخير\nنادية:\nأهلا وسهلا");
    await waitForApproval(page);

    await expect(page.getByTestId("app-header")).toContainText("الحالة");
    await expect(page.getByTestId("app-header")).toContainText("مستقر");
    await expect(getEditorSurface(page)).toHaveAttribute(
      "contenteditable",
      "true"
    );
    expect(
      consoleErrors.some(
        (message) =>
          message.includes("Position") ||
          message.includes("paste-pipeline-silent-fallback")
      )
    ).toBe(false);
  });

  for (const [name, filePath] of Object.entries(fixturePaths)) {
    test(`reaches settled approval state for ${name}`, async ({ page }) => {
      await installEditorRuntimeRouteMocks(page);
      await page.goto("/editor", { waitUntil: "domcontentloaded" });
      await openFile(page, filePath);
      await waitForApproval(page);

      await expect(page.getByTestId("app-header")).toContainText("مستقر");
      await expect(getEditorSurface(page)).toHaveAttribute(
        "contenteditable",
        "true"
      );
      await expect(getEditorSurface(page)).not.toHaveText(/^1\.$/);
    });
  }
});
