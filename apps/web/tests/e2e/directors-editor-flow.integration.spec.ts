import { expect, test } from "@playwright/test";
import {
  createProjectViaDirectorsStudio,
  createUniqueCredentials,
  openLibrarySection,
  signupThroughApi,
} from "./helpers/directors-editor";

test.describe("directors-editor real integration", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(240_000);

  test("bridges project state from directors-studio into editor session contract", async ({
    page,
  }, testInfo) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => {
      consoleMessages.push(`[${message.type()}] ${message.text()}`);
    });

    const credentials = createUniqueCredentials();
    const projectTitle = `مشروع تكامل ${Date.now()}`;

    await signupThroughApi(page, credentials);
    await page.goto("/directors-studio", { waitUntil: "domcontentloaded" });

    await createProjectViaDirectorsStudio(page, projectTitle, true);

    await expect(page).toHaveURL(/\/editor\?/);
    await expect(page.getByTestId("editor-active-project")).toContainText(
      projectTitle
    );

    const currentUrl = new URL(page.url());
    const projectId = currentUrl.searchParams.get("projectId");
    const source = currentUrl.searchParams.get("source");

    expect(projectId).toBeTruthy();
    expect(source).toBe("directors-studio");

    const storedProject = await page.evaluate(() => {
      const raw = sessionStorage.getItem("currentProject");
      return raw ? JSON.parse(raw) : null;
    });

    expect(storedProject?.id).toBe(projectId);
    expect(storedProject?.title).toBe(projectTitle);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("editor-active-project")).toContainText(
      projectTitle
    );

    const structuredLogs = consoleMessages.filter((line) =>
      line.includes('"scope":"directors-editor-flow"')
    );
    expect(structuredLogs.length).toBeGreaterThan(0);

    await testInfo.attach("integration-structured-logs", {
      body: structuredLogs.join("\n"),
      contentType: "text/plain",
    });
  });

  test("executes mapped library action without unknown-action fallback", async ({
    page,
  }) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => {
      consoleMessages.push(`[${message.type()}] ${message.text()}`);
    });

    const credentials = createUniqueCredentials();
    const projectTitle = `مشروع مكتبة ${Date.now()}`;

    await signupThroughApi(page, credentials);
    await page.goto("/directors-studio", { waitUntil: "domcontentloaded" });
    await createProjectViaDirectorsStudio(page, projectTitle, true);

    await expect(page.getByTestId("editor-active-project")).toContainText(
      projectTitle
    );

    await openLibrarySection(page);
    await page.getByRole("button", { name: "القوالب" }).click();

    const editorSurface = page.locator(".ProseMirror").first();
    await expect(editorSurface).toContainText("مشهد 1");
    await expect(page.getByText("إجراء غير معرف")).toHaveCount(0);

    const hasUnknownActionSignal = consoleMessages.some((entry) =>
      /Unknown Action|UNKNOWN_ACTION|إجراء غير معرف/u.test(entry)
    );
    expect(hasUnknownActionSignal).toBe(false);
  });

  test("reports invalid project context with controlled actionable error", async ({
    page,
  }) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => {
      consoleMessages.push(`[${message.type()}] ${message.text()}`);
    });

    const credentials = createUniqueCredentials();
    await signupThroughApi(page, credentials);

    const invalidProjectId = `missing-${Date.now()}`;
    await page.goto(
      `/editor?projectId=${encodeURIComponent(invalidProjectId)}&source=directors-studio`,
      { waitUntil: "domcontentloaded" }
    );

    await expect(page.getByTestId("editor-project-sync-error")).toBeVisible();
    await expect(page.locator(".ProseMirror").first()).toHaveAttribute(
      "contenteditable",
      "true"
    );

    expect(
      consoleMessages.some((line) =>
        line.includes('"event":"editor-project-sync-failed"')
      )
    ).toBe(true);
  });
});
