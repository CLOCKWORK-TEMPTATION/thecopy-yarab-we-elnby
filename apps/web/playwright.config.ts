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
const shouldUseCiChromiumProjectSet =
  !!process.env["CI"] &&
  !hasExplicitProjectSelection &&
  process.env["PLAYWRIGHT_ALL_PROJECTS"] !== "1";
const e2eBuildCommand = process.env["CI"]
  ? [
      "cross-env NEXT_PUBLIC_E2E_DIAGNOSTICS=1 NEXT_OUTPUT_MODE=standalone pnpm run build",
      "node scripts/prepare-standalone-assets.mjs",
    ].join(" && ")
  : "cross-env NEXT_PUBLIC_E2E_DIAGNOSTICS=1 pnpm run build";
const e2eRuntimeEnv = `cross-env NEXT_PUBLIC_E2E_DIAGNOSTICS=1 PORT=${webServerPort} HOSTNAME=0.0.0.0`;
const webServerCommand = process.env["CI"]
  ? [
      e2eBuildCommand,
      `${e2eRuntimeEnv} node scripts/start-standalone-server.mjs`,
    ].join(" && ")
  : [
      e2eBuildCommand,
      `cross-env NEXT_PUBLIC_E2E_DIAGNOSTICS=1 pnpm exec next start -p ${webServerPort} -H 0.0.0.0`,
    ].join(" && ");

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
  projects: shouldUseEditorCriticalProjectSet || shouldUseCiChromiumProjectSet
    ? allProjects.filter((project) => project.name === "chromium")
    : allProjects,
  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: !process.env["CI"],
    timeout: 180 * 1000,
  },
});
