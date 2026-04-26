#!/usr/bin/env node
// Read ESLint JSON outputs and produce a deterministic ordered slice.
// Usage: node eslint-sort-select.mjs --in=<json> [--in=<json>...] --from=N --to=M --out=<json>

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const inputs = args.filter((a) => a.startsWith("--in=")).map((a) => a.slice(5));
const fromArg = args.find((a) => a.startsWith("--from="));
const toArg = args.find((a) => a.startsWith("--to="));
const outArg = args.find((a) => a.startsWith("--out="));
const errorsOnly = !args.includes("--include-warnings");
const fromIndex = fromArg ? Number(fromArg.slice(7)) : 1;
const toIndex = toArg ? Number(toArg.slice(5)) : Infinity;

const all = [];
for (const file of inputs) {
  const data = JSON.parse(readFileSync(resolve(repoRoot, file), "utf8"));
  for (const fileResult of data) {
    const filePath = relative(repoRoot, fileResult.filePath).replaceAll("\\", "/");
    for (const message of fileResult.messages ?? []) {
      if (errorsOnly && message.severity !== 2) continue;
      all.push({
        file: filePath,
        line: message.line ?? 0,
        column: message.column ?? 0,
        endLine: message.endLine ?? null,
        endColumn: message.endColumn ?? null,
        ruleId: message.ruleId ?? "parser",
        severity: message.severity,
        message: message.message ?? "",
      });
    }
  }
}

all.sort((a, b) => {
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  if (a.line !== b.line) return a.line - b.line;
  if (a.column !== b.column) return a.column - b.column;
  if (a.ruleId !== b.ruleId) return a.ruleId < b.ruleId ? -1 : 1;
  if (a.message !== b.message) return a.message < b.message ? -1 : 1;
  return 0;
});

const indexed = all.map((entry, i) => ({ index: i + 1, ...entry }));
const slice = indexed.filter((e) => e.index >= fromIndex && e.index <= toIndex);

const output = {
  summary: { totalErrors: all.length, fromIndex, toIndex: Number.isFinite(toIndex) ? toIndex : null, selected: slice.length },
  entries: slice,
};

const outPath = outArg ? resolve(repoRoot, outArg.slice(6)) : null;
if (outPath) writeFileSync(outPath, JSON.stringify(output, null, 2));
else process.stdout.write(JSON.stringify(output, null, 2));
console.error(`[sort-select] total=${all.length} selected=${slice.length}`);
