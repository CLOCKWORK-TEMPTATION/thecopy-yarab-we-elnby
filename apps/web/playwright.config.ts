import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env["PLAYWRIGHT_BASE_URL"] || "http://127.0.0.1:5000";
const parsedBaseURL = new URL(baseURL);
const webServerPort = Number(
  parsedBaseURL.port || (parsedBaseURL.protocol === "https:" ? 443 : 80)
);

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.mjs",
  // تعليق عربي: هذه الحزمة تعتمد على مسارات حية مشتركة ومخازن حالة وخدمة خلفية ذات حدود طلبات،
  // لذا نوقف التوازي الكامل داخل الملفات لتفادي الانكسارات الوهمية الناتجة عن الحمل الاصطناعي.
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: (process.env["CI"] ? 1 : 2) as any,
  reporter: [
    ["html", { outputFolder: "./reports/e2e" }],
    ["json", { outputFile: "./reports/e2e/results.json" }],
    ["junit", { outputFile: "./reports/e2e/results.xml" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],
  webServer: {
    command: `pnpm run build && pnpm exec next start -p ${webServerPort} -H 0.0.0.0`,
    url: baseURL,
    reuseExistingServer: !process.env["CI"],
    timeout: 180 * 1000,
  },
});
