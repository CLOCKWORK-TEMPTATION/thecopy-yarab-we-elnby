/**
 * @fileoverview إعداد Playwright مخصص لسيناريو M3 على خادم dev الحي.
 *
 * مختلف عن `playwright.cinematography.config.ts` (الذي يستخدم build+start) —
 * هذا الإعداد يشغّل `pnpm dev` مباشرة على المنفذ 5000 ليتفادى أي اعتماد على
 * البناء الكامل (الذي يفشل حاليًا على ملف خارج النطاق `analysis/lib/state-machine.ts`).
 *
 * يستهدف ملف اختبار وحيد: `apps/web/e2e/cinematography-studio.spec.ts`
 * بمتصفح واحد فقط (chromium) مع كاميرا مزيفة لتفادي صلاحيات حقيقية.
 */

import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:5000";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /cinematography-studio\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ["list"],
    [
      "html",
      { outputFolder: "./reports/e2e/cinematography-dev", open: "never" },
    ],
    ["json", { outputFile: "./reports/e2e/cinematography-dev-results.json" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: [
            "--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream",
          ],
        },
      },
    },
  ],
  webServer: {
    command: "pnpm dev --port 5000",
    url: baseURL,
    reuseExistingServer: !process.env["CI"],
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
