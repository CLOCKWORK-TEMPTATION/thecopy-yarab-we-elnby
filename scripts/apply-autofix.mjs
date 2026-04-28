#!/usr/bin/env node
// Applies safe auto-fixes for format:check and lint:strict stages only.
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const stageArg = args.find((a) => a.startsWith("--stage="));
if (!stageArg) {
  console.error("Usage: apply-autofix.mjs --stage=<format:check|lint:strict>");
  process.exit(1);
}
const stage = stageArg.replace("--stage=", "");

const repoRoot = process.cwd();

function run(cmd, cmdArgs, opts = {}) {
  console.log(`[autofix] Running: ${cmd} ${cmdArgs.join(" ")}`);
  const r = spawnSync(cmd, cmdArgs, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, FORCE_COLOR: "0" },
    ...opts,
  });
  return r.status ?? 1;
}

if (stage === "format:check") {
  const code = run("pnpm", ["prettier", "--write", "."]);
  process.exit(code === 0 ? 0 : 1);
} else if (stage === "lint:strict") {
  // Only fix non-generated, non-test TS/TSX/JS/JSX files
  const code = run("pnpm", [
    "eslint",
    "--fix",
    "--ext",
    ".ts,.tsx,.js,.jsx",
    "--ignore-pattern",
    "**/*.generated.*",
    "--ignore-pattern",
    "**/*.test.*",
    "--ignore-pattern",
    "**/*.spec.*",
    "--ignore-pattern",
    "**/dist/**",
    "--ignore-pattern",
    "**/.next/**",
    ".",
  ]);
  process.exit(code === 0 ? 0 : 1);
} else {
  console.error(`[autofix] Stage '${stage}' is not auto-fixable.`);
  process.exit(1);
}
