#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const MAX_LINES = 600;
const ROOTS = ["apps", "packages"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const IGNORED_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
]);

function collectFiles(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        collectFiles(path.join(directory, entry.name), files);
      }
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!EXTENSIONS.has(path.extname(entry.name))) {
      continue;
    }

    files.push(path.join(directory, entry.name));
  }

  return files;
}

function countLines(filePath) {
  const text = readFileSync(filePath, "utf8");
  if (text.length === 0) {
    return 0;
  }
  return text.split(/\r\n|\n|\r/).length;
}

function toRelative(filePath) {
  return path.relative(process.cwd(), filePath).split(path.sep).join("/");
}

const files = ROOTS.flatMap((root) => (existsSync(root) ? collectFiles(root) : []));
const violations = files
  .map((filePath) => ({
    file: toRelative(filePath),
    lines: countLines(filePath),
  }))
  .filter((entry) => entry.lines > MAX_LINES)
  .sort((a, b) => b.lines - a.lines || a.file.localeCompare(b.file));

if (violations.length === 0) {
  console.log(`All scanned files are within ${MAX_LINES} lines.`);
  process.exit(0);
}

console.log(`Files exceeding ${MAX_LINES} lines: ${violations.length}`);
console.log("| lines | file |");
console.log("|---:|---|");
for (const violation of violations) {
  console.log(`| ${violation.lines} | ${violation.file} |`);
}

process.exit(1);
