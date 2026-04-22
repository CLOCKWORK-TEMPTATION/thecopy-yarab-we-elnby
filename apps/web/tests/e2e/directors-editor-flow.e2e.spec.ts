import { expect, test } from "@playwright/test";
import {
  createProjectViaDirectorsStudio,
  createUniqueCredentials,
  openLibrarySection,
  signupThroughApi,
} from "./helpers/directors-editor";

test.describe("directors-editor end-to-end flow", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(300_000);

  test("completes directors-studio to editor journey with stable project context", async ({
    page,
  }, testInfo) => {
    const consoleLogs: string[] = [];
    page.on("console", (message) => {
      consoleLogs.push(`[${message.type()}] ${message.text()}`);
    });

    const credentials = createUniqueCredentials();
    const projectTitle = `رحلة إخراج ${Date.now()}`;

    await page.context().tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });

    try {
      await signupThroughApi(page, credentials);

      await page.goto("/directors-studio", { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("input-new-project-title")).toBeVisible();
      await expect(page.getByTestId("button-create-project")).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath("01-directors-studio-entry.png"),
        fullPage: true,
      });

      await createProjectViaDirectorsStudio(page, projectTitle, true);
      await expect(page).toHaveURL(/\/editor\?/);
      await expect(page.getByTestId("editor-active-project")).toContainText(
        projectTitle
      );
      await expect(page.locator(".ProseMirror").first()).toHaveAttribute(
        "contenteditable",
        "true"
      );

      await page.screenshot({
        path: testInfo.outputPath("02-editor-opened-with-project.png"),
        fullPage: true,
      });

      await openLibrarySection(page);
      await page.getByRole("button", { name: "القوالب" }).click();
      await expect(page.locator(".ProseMirror").first()).toContainText(
        "مشهد 1"
      );
      await expect(page.getByText("إجراء غير معرف")).toHaveCount(0);

      await page.screenshot({
        path: testInfo.outputPath("03-library-action-success.png"),
        fullPage: true,
      });

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("editor-active-project")).toContainText(
        projectTitle
      );

      await page.screenshot({
        path: testInfo.outputPath("04-editor-after-reload.png"),
        fullPage: true,
      });
    } finally {
      await page.context().tracing.stop({
        path: testInfo.outputPath("directors-editor-flow.trace.zip"),
      });
    }

    await testInfo.attach("e2e-console-logs", {
      body: consoleLogs.join("\n"),
      contentType: "text/plain",
    });
  });

  test("keeps editor responsive on intentional invalid project failure", async ({
    page,
  }, testInfo) => {
    const consoleLogs: string[] = [];
    page.on("console", (message) => {
      consoleLogs.push(`[${message.type()}] ${message.text()}`);
    });

    const credentials = createUniqueCredentials();
    await signupThroughApi(page, credentials);

    await page.context().tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });

    try {
      const invalidProjectId = `invalid-project-${Date.now()}`;
      await page.goto(
        `/editor?projectId=${encodeURIComponent(invalidProjectId)}&source=directors-studio`,
        { waitUntil: "domcontentloaded" }
      );

      await expect(page.getByTestId("editor-project-sync-error")).toBeVisible();
      await expect(page.locator(".ProseMirror").first()).toHaveAttribute(
        "contenteditable",
        "true"
      );

      await page.screenshot({
        path: testInfo.outputPath("05-intentional-failure-handled.png"),
        fullPage: true,
      });
    } finally {
      await page.context().tracing.stop({
        path: testInfo.outputPath("directors-editor-flow-failure.trace.zip"),
      });
    }

    await testInfo.attach("e2e-failure-console-logs", {
      body: consoleLogs.join("\n"),
      contentType: "text/plain",
    });
  });
});
