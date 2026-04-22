import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: [
    "**/directors-editor-flow.integration.spec.ts",
    "**/directors-editor-flow.e2e.spec.ts",
  ],
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  reporter: [
    ["html", { outputFolder: "./reports/directors-editor/html" }],
    ["json", { outputFile: "./reports/directors-editor/results.json" }],
    ["junit", { outputFile: "./reports/directors-editor/results.xml" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:5000",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // تعليق عربي: dev في web يشغّل Next + backend معًا عبر concurrently.
  webServer: {
    command: "pnpm run dev",
    url: "http://127.0.0.1:5000",
    reuseExistingServer: !process.env["CI"],
    timeout: 300 * 1000,
  },
});
