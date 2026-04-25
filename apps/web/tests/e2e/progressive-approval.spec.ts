import { expect, test } from "@playwright/test";

import {
  fixturePaths,
  getEditorSurface,
  installEditorRuntimeRouteMocks,
  openFile,
  waitForApproval,
} from "./helpers/progressive";

test.describe("progressive approval", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(240_000);

  test("marks every visible element after approval", async ({ page }) => {
    await installEditorRuntimeRouteMocks(page);
    await page.goto("/editor", { waitUntil: "domcontentloaded" });
    await openFile(page, fixturePaths.docx);
    await waitForApproval(page);

    const beforeApproval = await getEditorSurface(page)
      .locator(":scope > [data-element-id]")
      .count();
    expect(beforeApproval).toBeGreaterThan(0);

    await page.getByTestId("approve-visible-version").click();
    await expect(page.getByTestId("app-header")).toContainText("معتمد");

    const approvedVersionIds = await page
      .locator(".ProseMirror > [data-approved-version-id]")
      .evaluateAll((elements) =>
        elements
          .map((element) => element.getAttribute("data-approved-version-id"))
          .filter((value): value is string => Boolean(value))
      );

    expect(approvedVersionIds).toHaveLength(beforeApproval);
    expect(new Set(approvedVersionIds).size).toBe(1);
  });
});
