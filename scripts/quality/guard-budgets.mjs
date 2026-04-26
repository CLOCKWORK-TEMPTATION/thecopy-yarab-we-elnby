#!/usr/bin/env node

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const webRoot = resolve("apps/web");
const buildDir = resolve(webRoot, ".next");

if (!existsSync(buildDir)) {
  console.error("[guard-budgets] apps/web/.next is missing. Run the production build before budget checks.");
  process.exit(1);
}

const result = spawnSync("pnpm", ["--filter", "@the-copy/web", "run", "budget:check"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
