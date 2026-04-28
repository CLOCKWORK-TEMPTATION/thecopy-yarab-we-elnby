import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const backendRoot = process.cwd();
const require = createRequire(import.meta.url);

const resolveEslintBinary = () => {
  try {
    const packageJsonPath = require.resolve("eslint/package.json");
    const packageDir = path.dirname(packageJsonPath);
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const binRelativePath =
      typeof packageJson?.bin === "string"
        ? packageJson.bin
        : packageJson?.bin?.eslint;

    if (typeof binRelativePath === "string" && binRelativePath.trim()) {
      const resolvedBinPath = path.resolve(packageDir, binRelativePath);
      if (fs.existsSync(resolvedBinPath)) {
        return resolvedBinPath;
      }
    }
  } catch {
    // fallback below
  }

  return path.resolve(backendRoot, "../../node_modules/eslint/bin/eslint.js");
};

const eslintPath = resolveEslintBinary();

const sharedArgs = [
  "--quiet",
  "--ignore-pattern",
  "src/**/*.test.ts",
  "--ignore-pattern",
  "src/**/*.spec.ts",
  "--ignore-pattern",
  "src/__tests__/**",
  "--ignore-pattern",
  "src/examples/**",
  "--ignore-pattern",
  "src/mcp-server.ts",
  "--ignore-pattern",
  "src/scripts/**",
  "--ignore-pattern",
  "src/test/**",
];

const groups = [
  [
    "src/config",
    "src/db",
    "src/middleware",
    "src/types",
    "src/utils",
    "src/bootstrap",
    "src/routes",
  ],
  ["src/controllers"],
  ["src/modules/breakapp"],
  ["src/modules/art-director"],
  ["src/services/agents", "src/services/breakdown", "src/services/rag"],
  [
    "src/services/actorai.service.ts",
    "src/services/app-state.service.ts",
    "src/services/budget.service.ts",
    "src/services/brainstorm.service.ts",
    "src/services/cache.service.ts",
    "src/services/cineai.service.ts",
    "src/services/final-review.service.ts",
    "src/services/gemini.service.ts",
    "src/services/platform-genai.service.ts",
    "src/services/realtime.service.ts",
    "src/services/styleist.service.ts",
    "src/services/sse.service.ts",
    "src/services/websocket.service.ts",
  ],
  ["src/memory"],
  ["src/queues"],
  ["src/editor"],
];

for (const group of groups) {
  console.log(`\n[lint] ${group.join(", ")}`);
  const resolvedTargets = group.filter((target) =>
    fs.existsSync(path.resolve(backendRoot, target)),
  );
  if (resolvedTargets.length === 0) {
    continue;
  }

  const result = spawnSync(
    process.execPath,
    [
      "--max-old-space-size=6144",
      eslintPath,
      ...sharedArgs,
      ...resolvedTargets,
    ],
    {
      cwd: backendRoot,
      stdio: "inherit",
      env: process.env,
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
