import { expect, test } from "@playwright/test";
import {
  fixturePaths,
  getEditorSurface,
  openFile,
  waitForApproval,
} from "./helpers/progressive";

test.describe("progressive silent updates", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(240_000);

  test("locks the surface before first visible file render and prevents a second file run", async ({
    page,
  }) => {
    const fileImportStarts: string[] = [];
    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("[file-import] File import pipeline started")) {
        fileImportStarts.push(text);
      }
    });

    await page.goto("/editor", { waitUntil: "domcontentloaded" });
    await openFile(page, fixturePaths.pdf);

    await page.waitForTimeout(700);
    await expect(page.getByTestId("app-header")).toContainText("قيد المعالجة");
    await expect(getEditorSurface(page)).toHaveAttribute(
      "contenteditable",
      "false"
    );

    await page.getByTestId("menu-section-ملف").click();
    let chooserOpened = true;
    try {
      await Promise.all([
        page.waitForEvent("filechooser", { timeout: 1_000 }),
        page.getByTestId("menu-action-open-file").click({ force: true }),
      ]);
    } catch {
      chooserOpened = false;
    }
    await page.waitForTimeout(1200);

    expect(fileImportStarts).toHaveLength(1);
    expect(chooserOpened).toBe(false);

    await waitForApproval(page);
    await expect(page.getByTestId("app-header")).toContainText("مستقر");
  });
});
