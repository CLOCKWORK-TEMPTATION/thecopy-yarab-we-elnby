#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const result = spawnSync(
  "git",
  ["diff", "--cached", "--unified=0", "--", "*.ts", "*.tsx", "*.js", "*.jsx", "*.mjs", "*.cjs"],
  { encoding: "utf8", maxBuffer: 1024 * 1024 * 50 },
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

const blocked = [];
let currentFile = "";
let currentLine = 0;

for (const line of result.stdout.split(/\r?\n/)) {
  const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
  if (fileMatch) {
    currentFile = fileMatch[1];
    continue;
  }

  const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  if (hunkMatch) {
    currentLine = Number(hunkMatch[1]) - 1;
    continue;
  }

  if (!line.startsWith("+") || line.startsWith("+++")) {
    continue;
  }

  currentLine += 1;
  const added = line.slice(1);
  const checks = [
    { name: "console.log", pattern: /\bconsole\.log\s*\(/ },
    { name: "explicit any", pattern: /(^|[^\w])(:\s*any\b|as\s+any\b|<any>|Array<any>|Promise<any>|Record<[^>]*any)/ },
    { name: "broad eslint disable", pattern: /eslint-disable(?!-next-line\s+[\w@/-])/ },
  ];

  for (const check of checks) {
    if (check.pattern.test(added)) {
      blocked.push(`${currentFile}:${currentLine} ${check.name}`);
    }
  }
}

if (blocked.length > 0) {
  console.error("[guard-staged] blocked staged changes:");
  for (const item of blocked) {
    console.error(`  ${item}`);
  }
  process.exit(1);
}

console.log("[guard-staged] staged changes satisfy mechanical quality rules.");
