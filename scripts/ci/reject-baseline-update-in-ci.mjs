#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const workflowsDir = resolve(repoRoot, ".github/workflows");
const forbidden = /--update-baseline\b/;
const violations = [];

if (existsSync(workflowsDir)) {
  for (const entry of readdirSync(workflowsDir)) {
    if (!entry.endsWith(".yml") && !entry.endsWith(".yaml")) {
      continue;
    }

    const file = resolve(workflowsDir, entry);
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (forbidden.test(line)) {
        violations.push(
          `${relative(repoRoot, file).replaceAll("\\", "/")}:${index + 1}`,
        );
      }
    });
  }
}

if (violations.length > 0) {
  console.error(
    "[baseline-policy] CI workflows must not run --update-baseline.",
  );
  for (const violation of violations) {
    console.error(`  ${violation}`);
  }
  process.exit(1);
}

console.log("[baseline-policy] CI workflows do not contain --update-baseline.");
