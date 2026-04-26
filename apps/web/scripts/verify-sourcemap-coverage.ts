import fs from "fs";
import path from "path";

const uploadIgnorePatterns = [
  /(?:^|[\\/])[^\\/]*manifest[^\\/]*\.js$/,
  /(?:^|[\\/])webpack-runtime.*\.js$/,
  /(?:^|[\\/])runtime-.*\.js$/,
  /(?:^|[\\/])polyfills-.*\.js$/,
  /[\\/]static[\\/]chunks[\\/]main-[^\\/]+\.js$/,
  /[\\/]static[\\/]chunks[\\/]framework(?:\.|-)[^\\/]+\.js$/,
  /[\\/]static[\\/]chunks[\\/]webpack-[^\\/]+\.js$/,
  /[\\/]static[\\/]chunks[\\/]app[\\/](?:.*[\\/])?loading-[^\\/]+\.js$/,
  /[\\/]static[\\/]chunks[\\/]app[\\/](?:.*[\\/])?route-[^\\/]+\.js$/,
  /[\\/]static[\\/]chunks[\\/]app[\\/]_global-error[\\/]page-[^\\/]+\.js$/,
  /[\\/]static[\\/]chunks[\\/]next[\\/]dist[\\/]client[\\/]components[\\/]builtin[\\/][^\\/]+\.js$/,
  /[\\/]static[\\/]chunks[\\/]app[\\/]\(main\)[\\/]arabic-prompt-engineering-studio[\\/]layout-[^\\/]+\.js$/,
  /[\\/]static[\\/]chunks[\\/]app[\\/]\(main\)[\\/]editor[\\/]app[\\/]layout-[^\\/]+\.js$/,
  /(?:^|[\\/])\.next[\\/]server[\\/]middleware\.js$/,
];

function normalizeForMatch(filePath: string): string {
  return path.normalize(filePath);
}

function shouldIgnoreUploadCandidate(filePath: string): boolean {
  const normalized = normalizeForMatch(filePath);
  return uploadIgnorePatterns.some((pattern) => pattern.test(normalized));
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
        files.push(fullPath);
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

const uploadedJsFiles = allJsFiles.filter(
  (file) => !shouldIgnoreUploadCandidate(file)
);
const ignoredJsFiles = allJsFiles.filter((file) =>
  shouldIgnoreUploadCandidate(file)
);
const missing = uploadedJsFiles.filter((file) => !fs.existsSync(`${file}.map`));
const orphanedMaps = uploadedJsFiles
  .map((file) => `${file}.map`)
  .filter(
    (mapFile) => fs.existsSync(mapFile) && !fs.existsSync(mapFile.slice(0, -4))
  );

if (missing.length > 0) {
  console.error(
    `${missing.length} uploadable JS files are missing source maps:`
  );
  missing.forEach((f) => console.error(`  ${f}`));
  process.exit(1);
}

if (orphanedMaps.length > 0) {
  console.error(`${orphanedMaps.length} source maps have no JS counterpart:`);
  orphanedMaps.forEach((f) => console.error(`  ${f}`));
  process.exit(1);
}

console.log(
  [
    `${uploadedJsFiles.length} uploadable JS files have source maps`,
    `${ignoredJsFiles.length} generated framework/stub JS files are excluded from upload`,
  ].join("\n")
);
