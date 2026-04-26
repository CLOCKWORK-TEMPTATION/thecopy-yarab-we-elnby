import { readdirSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = resolve(appRoot, "../..");
const chunkSize = Number.parseInt(process.env.VITEST_CHUNK_SIZE ?? "24", 10);
const testFilePattern =
  /\.(?:test|spec)\.(?:js|mjs|cjs|ts|mts|cts|jsx|tsx)$/u;
const excludedSegments = new Set([
  "node_modules",
  "dist",
  ".next",
  "build",
  "e2e",
]);

function normalizePath(filePath) {
  return filePath.split(sep).join("/");
}

function isExcluded(filePath) {
  const normalized = normalizePath(filePath);
  if (normalized.includes("/tests/e2e/")) {
    return true;
  }
  return normalized
    .split("/")
    .some((segment) => excludedSegments.has(segment));
}

function collectTestFiles(root) {
  const results = [];

  function visit(directory) {
    for (const entry of readdirSync(directory)) {
      const absolutePath = resolve(directory, entry);
      if (isExcluded(absolutePath)) {
        continue;
      }

      const stats = statSync(absolutePath);
      if (stats.isDirectory()) {
        visit(absolutePath);
        continue;
      }

      if (stats.isFile() && testFilePattern.test(entry)) {
        results.push(absolutePath);
      }
    }
  }

  visit(root);
  return results;
}

const testFiles = [
  ...collectTestFiles(resolve(appRoot, "src")),
  ...collectTestFiles(resolve(repoRoot, "qa")),
].sort((a, b) => a.localeCompare(b));

if (testFiles.length === 0) {
  console.error("No Vitest test files were discovered.");
  process.exit(1);
}

const vitestBin = resolve(appRoot, "node_modules/vitest/vitest.mjs");
const chunks = [];
for (let index = 0; index < testFiles.length; index += chunkSize) {
  chunks.push(testFiles.slice(index, index + chunkSize));
}

console.log(`Discovered ${testFiles.length} Vitest test files.`);
console.log(`Running ${chunks.length} chunks with ${chunkSize} files each.`);

for (const [index, chunk] of chunks.entries()) {
  const relativeFiles = chunk.map((file) =>
    normalizePath(relative(appRoot, file))
  );
  console.log(`\nVitest chunk ${index + 1}/${chunks.length}`);

  const result = spawnSync(
    process.execPath,
    [
      "--max-old-space-size=4096",
      vitestBin,
      "run",
      "--maxWorkers=2",
      ...relativeFiles,
    ],
    {
      cwd: appRoot,
      env: {
        ...process.env,
        NODE_OPTIONS: "",
      },
      shell: false,
      stdio: "inherit",
    }
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nAll Vitest chunks passed.");
