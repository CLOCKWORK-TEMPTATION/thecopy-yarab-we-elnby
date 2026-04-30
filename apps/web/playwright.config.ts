import { defineConfig, devices } from "@playwright/test";

const resolveBaseURL = (): string => {
  const explicitBaseURL = process.env["PLAYWRIGHT_BASE_URL"]?.trim();
  if (explicitBaseURL) return explicitBaseURL;

  const port =
    process.env["PLAYWRIGHT_PORT"]?.trim() ||
    process.env["WEB_PORT"]?.trim() ||
    process.env["PORT"]?.trim() ||
    "5010";

  return `http://127.0.0.1:${port}`;
};

const baseURL = resolveBaseURL();
const parsedBaseURL = new URL(baseURL);
const webServerPort = Number(
  parsedBaseURL.port || (parsedBaseURL.protocol === "https:" ? 443 : 80)
);

const isEditorGrepRun = process.argv.some((arg) => {
  if (arg === "editor") return true;
  return /^--grep(?:=.*)?editor/i.test(arg);
});
const hasExplicitProjectSelection = process.argv.some(
  (arg) => arg === "--project" || arg.startsWith("--project=")
);
const shouldUseEditorCriticalProjectSet =
  isEditorGrepRun &&
  !hasExplicitProjectSelection &&
  process.env["PLAYWRIGHT_ALL_PROJECTS"] !== "1";

const allProjects = [
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
];

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.mjs",
  // تعليق عربي: هذه الحزمة تعتمد على مسارات حية مشتركة ومخازن حالة وخدمة خلفية ذات حدود طلبات،
  // لذا نوقف التوازي الكامل داخل الملفات لتفادي الانكسارات الوهمية الناتجة عن الحمل الاصطناعي.
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : 2,
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
  projects: shouldUseEditorCriticalProjectSet
    ? allProjects.filter((project) => project.name === "chromium")
    : allProjects,
  webServer: {
    command: `cross-env NEXT_PUBLIC_E2E_DIAGNOSTICS=1 pnpm run build && cross-env NEXT_PUBLIC_E2E_DIAGNOSTICS=1 pnpm exec next start -p ${webServerPort} -H 0.0.0.0`,
    url: baseURL,
    reuseExistingServer: !process.env["CI"],
    timeout: 180 * 1000,
  },
});
