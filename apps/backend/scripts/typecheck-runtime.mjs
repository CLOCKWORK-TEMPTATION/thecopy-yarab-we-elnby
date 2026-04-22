import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const backendRoot = process.cwd();
const tscPath = path.resolve(
  backendRoot,
  "../../node_modules/typescript/lib/tsc.js"
);

const groups = [
  {
    name: "core-config",
    files: [
      "src/config/env.ts",
      "src/config/sentry.ts",
      "src/config/tracing.ts",
      "src/utils/logger.ts"
    ],
  },
  {
    name: "core-db",
    files: [
      "src/db/index.ts",
    ],
  },
  {
    name: "core-middleware",
    files: [
      "src/middleware/index.ts",
      "src/middleware/auth.middleware.ts",
      "src/middleware/csrf.middleware.ts",
    ],
  },
  {
    name: "core-waf",
    files: ["src/middleware/waf.middleware.ts"],
  },
  {
    name: "health-metrics-queue",
    files: [
      "src/controllers/health.controller.ts",
      "src/controllers/metrics.controller.ts",
      "src/controllers/queue.controller.ts",
      "src/services/websocket.service.ts",
      "src/services/sse.service.ts",
      "src/queues/index.ts",
    ],
  },
  {
    name: "auth-projects",
    files: [
      "src/controllers/auth.controller.ts",
      "src/controllers/projects.controller.ts",
      "src/controllers/scenes.controller.ts",
      "src/controllers/characters.controller.ts",
      "src/controllers/shots.controller.ts",
    ],
  },
  {
    name: "ai-runtime",
    files: [
      "src/controllers/ai.controller.ts",
      "src/controllers/actorai.controller.ts",
      "src/controllers/critique.controller.ts",
      "src/controllers/appState.controller.ts",
    ],
  },
  {
    name: "creative-analysis",
    files: [
      "src/controllers/analysis.controller.ts",
      "src/controllers/breakdown.controller.ts",
    ],
  },
  {
    name: "creative-generation",
    files: [
      "src/controllers/budget.controller.ts",
      "src/controllers/brainstorm.controller.ts",
      "src/controllers/styleist.controller.ts",
      "src/controllers/cineai.controller.ts",
    ],
  },
  {
    name: "breakapp-module",
    files: ["src/modules/breakapp/routes.ts"],
  },
  {
    name: "art-director-module",
    files: ["src/modules/art-director/routes.ts"],
  },
  {
    name: "memory-editor",
    files: [
      "src/memory/index.ts",
      "src/editor/runtime.ts",
    ],
  },
];

function runGroup(group) {
  const tempConfigPath = path.join(
    backendRoot,
    `.tsconfig.typecheck.${group.name}.json`
  );

  const config = {
    extends: "./tsconfig.json",
    compilerOptions: {
      noEmit: true,
      declaration: false,
      declarationMap: false,
      sourceMap: false,
    },
    include: [],
    files: ["src/global.d.ts", ...group.files],
    exclude: ["node_modules", "dist"],
  };

  fs.writeFileSync(tempConfigPath, `${JSON.stringify(config, null, 2)}${os.EOL}`);

  console.log(`\n[type-check] ${group.name}`);
  const result = spawnSync(
    process.execPath,
    ["--max-old-space-size=12288", tscPath, "-p", tempConfigPath, "--pretty", "false"],
    {
      cwd: backendRoot,
      stdio: "inherit",
      env: process.env,
    }
  );

  fs.rmSync(tempConfigPath, { force: true });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

for (const group of groups) {
  runGroup(group);
}
