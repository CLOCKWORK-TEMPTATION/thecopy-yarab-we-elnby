/**
 * @fileoverview E2E tests for the /development page tool execution fix
 *
 * These tests verify the complete user journey:
 *  1. User lands on /development — tool catalog is locked
 *  2. User types text (>= 100 chars) — tool catalog unlocks
 *  3. User selects a tool from the catalog — execution panel appears
 *  4. User clicks execute — loading state appears, then result is displayed
 *
 * All tests use route mocking (page.route) so they run without a live
 * Gemini API key. The /api/development/execute endpoint is stubbed to
 * return a deterministic payload.
 *
 * Relies on data-testid attributes added during the fix session:
 *  - data-testid="tool-catalog"
 *  - data-testid="execution-panel"
 *  - data-testid="execute-button"
 *  - data-testid="catalog-result-panel"
 */

import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEV_PAGE = "/development";
const LONG_TEXT = "هذا نص درامي عربي طويل بما يكفي لفتح الكتالوج. ".repeat(4); // ~200 chars
const MOCK_RESULT = "النتيجة المولدة من Gemini في بيئة الاختبار";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Stub /api/development/execute to return a predictable success response.
 * Must be called before page.goto().
 */
async function stubExecuteRoute(page: Page, result = MOCK_RESULT) {
  await page.route("**/api/development/execute", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        result: {
          finalDecision: result,
          proposals: [
            {
              agentId: "completion",
              agentName: "إكمال النص",
              text: result,
              confidence: 0.85,
            },
          ],
        },
      }),
    });
  });
}

/**
 * Stub /api/development/execute to return a 503 (simulate missing API key).
 * Then stub /api/brainstorm as fallback.
 */
async function stubExecuteFailWithFallback(page: Page, fallbackText: string) {
  await page.route("**/api/development/execute", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: "API key missing",
        fallback: true,
      }),
    });
  });

  await page.route("**/api/brainstorm", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        finalDecision: fallbackText,
        proposals: [
          { agentId: "completion", text: fallbackText, confidence: 0.8 },
        ],
      }),
    });
  });
}

/** Navigate to /development and wait for the page to be ready */
async function gotoDevPage(page: Page) {
  await page.goto(DEV_PAGE);
  // Wait for the main development container to be visible
  await page.waitForSelector("[data-testid='tool-catalog'], main, #__next", {
    timeout: 15_000,
  });
}

/** Type long text into the main textarea to unlock the tool catalog */
async function unlockCatalog(page: Page, text = LONG_TEXT) {
  // Find the primary textarea (original text input)
  const textarea = page.locator("textarea").first();
  await textarea.click();
  await textarea.fill(text);
  // Wait briefly for the React effect to fire and re-render
  await page.waitForTimeout(300);
}

/** Select the first available tool in the catalog */
async function selectFirstTool(page: Page) {
  const catalog = page.locator("[data-testid='tool-catalog']");
  await expect(catalog).toBeVisible({ timeout: 5_000 });
  // Click the first tool button in the catalog
  const firstTool = catalog.locator("button").first();
  await firstTool.click();
  await page.waitForTimeout(200);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe("Development page — tool execution", () => {
  test.beforeEach(({ page }) => {
    // Silence console errors from missing env vars in test environment
    page.on("console", () => {
      /* empty */
    });
  });

  // -------------------------------------------------------------------------
  // E2E-001: Page loads and tool catalog is visible
  // -------------------------------------------------------------------------
  test("E2E-001: /development page loads without crashing", async ({
    page,
  }) => {
    await stubExecuteRoute(page);
    await gotoDevPage(page);

    // Page should have a heading or main content — not a blank error page
    await expect(page.locator("body")).not.toBeEmpty();
  });

  // -------------------------------------------------------------------------
  // E2E-002: Tool catalog is visible on the page
  // -------------------------------------------------------------------------
  test("E2E-002: tool catalog is rendered on page load", async ({ page }) => {
    await stubExecuteRoute(page);
    await gotoDevPage(page);

    const catalog = page.locator("[data-testid='tool-catalog']");
    await expect(catalog).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // E2E-003: Tool catalog unlocks after entering sufficient text
  // -------------------------------------------------------------------------
  test("E2E-003: entering >= 100 chars unlocks the tool catalog for interaction", async ({
    page,
  }) => {
    await stubExecuteRoute(page);
    await gotoDevPage(page);
    await unlockCatalog(page);

    // After unlock, at least one tool button should be enabled (not disabled)
    const catalog = page.locator("[data-testid='tool-catalog']");
    await expect(catalog).toBeVisible({ timeout: 5_000 });
    const enabledTools = catalog.locator("button:not([disabled])");
    await expect(enabledTools.first()).toBeVisible({ timeout: 3_000 });
  });

  // -------------------------------------------------------------------------
  // E2E-004: Execution panel appears after tool selection
  // -------------------------------------------------------------------------
  test("E2E-004: execution panel appears when a tool is selected", async ({
    page,
  }) => {
    await stubExecuteRoute(page);
    await gotoDevPage(page);
    await unlockCatalog(page);
    await selectFirstTool(page);

    const executionPanel = page.locator("[data-testid='execution-panel']");
    await expect(executionPanel).toBeVisible({ timeout: 5_000 });
  });

  // -------------------------------------------------------------------------
  // E2E-005: Execute button is present in the execution panel
  // -------------------------------------------------------------------------
  test("E2E-005: execute button is present and enabled after tool selection", async ({
    page,
  }) => {
    await stubExecuteRoute(page);
    await gotoDevPage(page);
    await unlockCatalog(page);
    await selectFirstTool(page);

    const executeBtn = page.locator("[data-testid='execute-button']");
    await expect(executeBtn).toBeVisible({ timeout: 5_000 });
    await expect(executeBtn).toBeEnabled();
  });

  // -------------------------------------------------------------------------
  // E2E-006: Clicking execute calls /api/development/execute
  // -------------------------------------------------------------------------
  test("E2E-006: clicking execute button triggers API call to /api/development/execute", async ({
    page,
  }) => {
    let apiCallCount = 0;

    await page.route("**/api/development/execute", async (route) => {
      apiCallCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          result: {
            finalDecision: MOCK_RESULT,
            proposals: [
              { agentId: "completion", text: MOCK_RESULT, confidence: 0.85 },
            ],
          },
        }),
      });
    });

    await gotoDevPage(page);
    await unlockCatalog(page);
    await selectFirstTool(page);

    const executeBtn = page.locator("[data-testid='execute-button']");
    await executeBtn.click();

    // Wait for network idle to confirm the call was made
    await page
      .waitForLoadState("networkidle", { timeout: 10_000 })
      .catch(() => {
        /* empty */
      });

    expect(apiCallCount).toBeGreaterThanOrEqual(1);
  });

  // -------------------------------------------------------------------------
  // E2E-007: Result panel appears after successful execution
  // -------------------------------------------------------------------------
  test("E2E-007: result panel appears after successful tool execution", async ({
    page,
  }) => {
    await stubExecuteRoute(page);
    await gotoDevPage(page);
    await unlockCatalog(page);
    await selectFirstTool(page);

    const executeBtn = page.locator("[data-testid='execute-button']");
    await executeBtn.click();

    // Result panel should appear within a reasonable timeout
    const resultPanel = page.locator("[data-testid='catalog-result-panel']");
    await expect(resultPanel).toBeVisible({ timeout: 15_000 });
  });

  // -------------------------------------------------------------------------
  // E2E-008: Result panel contains the mocked AI response text
  // -------------------------------------------------------------------------
  test("E2E-008: result panel displays the AI response content", async ({
    page,
  }) => {
    await stubExecuteRoute(page, MOCK_RESULT);
    await gotoDevPage(page);
    await unlockCatalog(page);
    await selectFirstTool(page);

    const executeBtn = page.locator("[data-testid='execute-button']");
    await executeBtn.click();

    const resultPanel = page.locator("[data-testid='catalog-result-panel']");
    await expect(resultPanel).toBeVisible({ timeout: 15_000 });
    await expect(resultPanel).toContainText(MOCK_RESULT);
  });

  // -------------------------------------------------------------------------
  // E2E-009: Fallback path works when primary route returns 503
  // -------------------------------------------------------------------------
  test("E2E-009: fallback to /api/brainstorm when primary route fails", async ({
    page,
  }) => {
    const fallbackText = "نتيجة من المسار البديل brainstorm";
    await stubExecuteFailWithFallback(page, fallbackText);
    await gotoDevPage(page);
    await unlockCatalog(page);
    await selectFirstTool(page);

    const executeBtn = page.locator("[data-testid='execute-button']");
    await executeBtn.click();

    const resultPanel = page.locator("[data-testid='catalog-result-panel']");
    await expect(resultPanel).toBeVisible({ timeout: 20_000 });
    await expect(resultPanel).toContainText(fallbackText);
  });

  // -------------------------------------------------------------------------
  // E2E-010: Execute button is disabled during loading
  // -------------------------------------------------------------------------
  test("E2E-010: execute button shows loading state while waiting for API", async ({
    page,
  }) => {
    // Delay the response so we can observe the loading state
    await page.route("**/api/development/execute", async (route) => {
      await page.waitForTimeout(1_500); // artificial delay
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          result: {
            finalDecision: MOCK_RESULT,
            proposals: [
              { agentId: "completion", text: MOCK_RESULT, confidence: 0.85 },
            ],
          },
        }),
      });
    });

    await gotoDevPage(page);
    await unlockCatalog(page);
    await selectFirstTool(page);

    const executeBtn = page.locator("[data-testid='execute-button']");
    await executeBtn.click();

    // Button should be disabled immediately after click (loading state)
    await expect(executeBtn).toBeDisabled({ timeout: 500 });

    // Eventually it resolves and becomes enabled again
    await expect(executeBtn).toBeEnabled({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // E2E-011: Selecting a different tool clears previous result
  // -------------------------------------------------------------------------
  test("E2E-011: selecting a new tool clears the previous result", async ({
    page,
  }) => {
    await stubExecuteRoute(page, MOCK_RESULT);
    await gotoDevPage(page);
    await unlockCatalog(page);

    // Select and execute first tool
    const catalog = page.locator("[data-testid='tool-catalog']");
    const tools = catalog.locator("button:not([disabled])");
    await tools.first().click();

    const executeBtn = page.locator("[data-testid='execute-button']");
    await executeBtn.click();

    await expect(
      page.locator("[data-testid='catalog-result-panel']")
    ).toBeVisible({ timeout: 15_000 });

    // Now select a SECOND different tool
    await tools.nth(1).click();

    // Result panel should disappear (new tool selected, no result yet)
    await expect(
      page.locator("[data-testid='catalog-result-panel']")
    ).not.toBeVisible({ timeout: 3_000 });
  });
});
