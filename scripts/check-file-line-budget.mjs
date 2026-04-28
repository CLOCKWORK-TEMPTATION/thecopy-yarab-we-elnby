import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const MAX_LINES = 600;
const ROOTS = ["apps", "packages"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const IGNORED_DIRS = new Set([
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
]);

function collectFiles(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        collectFiles(path.join(dir, entry.name), files);
      }
      continue;
    }

    if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function countLines(filePath) {
  const text = readFileSync(filePath, "utf8");
  return text.length === 0 ? 0 : text.split(/\r\n|\n|\r/).length;
}

function formatPath(filePath) {
  return path.relative(process.cwd(), filePath).replaceAll(path.sep, "/");
}

const files = ROOTS.flatMap((root) =>
  existsSync(root) ? collectFiles(root) : []
);

const violations = files
  .map((file) => ({ file: formatPath(file), lines: countLines(file) }))
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
