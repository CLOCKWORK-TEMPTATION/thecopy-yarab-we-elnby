import { defineConfig, devices } from "@playwright/test";

const backendUrl = "http://127.0.0.1:3901";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /cinematography-studio\.e2e\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  reporter: [
    ["html", { outputFolder: "./reports/e2e/cinematography" }],
    ["json", { outputFile: "./reports/e2e/cinematography-results.json" }],
    ["junit", { outputFile: "./reports/e2e/cinematography-results.xml" }],
  ],
  use: {
    baseURL: "http://localhost:5000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-granted",
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
    {
      name: "chromium-denied",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: [
    {
      command:
        "cross-env CINE_FIXTURE_PORT=3901 CINE_FIXTURE_MODE=success node tests/e2e/helpers/cinematography-backend-fixture.mjs",
      url: `${backendUrl}/health`,
      reuseExistingServer: !process.env["CI"],
      timeout: 60_000,
    },
    {
      command: `cross-env BACKEND_URL=${backendUrl} NEXT_PUBLIC_BACKEND_URL=${backendUrl} NEXT_PUBLIC_API_URL=${backendUrl} pnpm run build && cross-env BACKEND_URL=${backendUrl} NEXT_PUBLIC_BACKEND_URL=${backendUrl} NEXT_PUBLIC_API_URL=${backendUrl} pnpm run start`,
      url: "http://localhost:5000",
      reuseExistingServer: !process.env["CI"],
      timeout: 240_000,
    },
  ],
});
