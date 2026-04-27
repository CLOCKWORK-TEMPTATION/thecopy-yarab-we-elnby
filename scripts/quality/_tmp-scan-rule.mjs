#!/usr/bin/env node
// Temporary scanner: live ESLint count for a single rule on a project.
// Usage: node scripts/quality/_tmp-scan-rule.mjs --project=web --rule=@typescript-eslint/no-unsafe-assignment
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const project = (args.find((a) => a.startsWith("--project=")) || "--project=web").split("=")[1];
const rule = (args.find((a) => a.startsWith("--rule=")) || "--rule=@typescript-eslint/no-unsafe-assignment").split("=")[1];

const root = resolve(repoRoot, project === "web" ? "apps/web" : "apps/backend");
const eslintBin = resolve(repoRoot, "node_modules/eslint/bin/eslint.js");

const res = spawnSync(
  process.execPath,
  ["--max-old-space-size=16384", eslintBin, ".", "--format", "json", "--no-warn-ignored"],
  { cwd: root, encoding: "utf8", maxBuffer: 1024 * 1024 * 400 },
);

if (!res.stdout.trim()) {
  console.error("ESLint produced no stdout. stderr:");
  console.error(res.stderr);
  process.exit(2);
}
let arr;
try {
  arr = JSON.parse(res.stdout);
} catch (e) {
  console.error("JSON parse failed:", e.message);
  console.error(res.stdout.slice(0, 1000));
  process.exit(2);
}
const out = {};
const detail = {};
let total = 0;
for (const f of arr) {
  const msgs = (f.messages || []).filter((m) => m.ruleId === rule);
  if (!msgs.length) continue;
  const rel = relative(repoRoot, f.filePath).replaceAll("\\", "/");
  out[rel] = msgs.length;
  detail[rel] = msgs.map((m) => ({
    line: m.line,
    column: m.column,
    endLine: m.endLine,
    endColumn: m.endColumn,
    message: m.message,
  }));
  total += msgs.length;
}
const sorted = Object.entries(out).sort((a, b) => b[1] - a[1]);
console.log(`LIVE_TOTAL=${total} FILES=${sorted.length}`);
for (const [f, n] of sorted) console.log(`${String(n).padStart(3, " ")} ${f}`);
const dumpPath = resolve(repoRoot, "scripts/quality/_tmp-rule-detail.json");
writeFileSync(dumpPath, `${JSON.stringify(detail, null, 2)}\n`);
console.log(`DETAIL_DUMP=${relative(repoRoot, dumpPath).replaceAll("\\", "/")}`);
