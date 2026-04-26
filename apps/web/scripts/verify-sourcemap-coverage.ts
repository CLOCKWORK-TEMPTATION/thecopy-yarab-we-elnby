import fs from "fs";
import path from "path";

const ignorePatterns = [
  /manifest.*\.js$/,
  /webpack-runtime.*\.js$/,
  /runtime-.*\.js$/,
  /polyfills-.*\.js$/,
];

function shouldIgnore(filePath: string): boolean {
  return ignorePatterns.some((pattern) => pattern.test(filePath));
}

function findJsFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (
        entry.isFile() &&
        entry.name.endsWith(".js") &&
        !entry.name.endsWith(".js.map")
      ) {
        if (!shouldIgnore(entry.name)) {
          files.push(fullPath);
        }
      }
    }
  }

  if (fs.existsSync(dir)) {
    walk(dir);
  }

  return files;
}

const searchDirs = [".next/static/chunks", ".next/server", ".next/standalone"];
const allJsFiles: string[] = [];

for (const dir of searchDirs) {
  allJsFiles.push(...findJsFiles(dir));
}

const missing = allJsFiles.filter((f) => !fs.existsSync(`${f}.map`));

if (missing.length > 0) {
  console.error(`❌ ${missing.length} JS files without source maps:`);
  missing.forEach((f) => console.error(`  ${f}`));
  process.exit(1);
}

console.log(
  `✅ All ${allJsFiles.length} JS files have corresponding source maps`
);
