#!/usr/bin/env node
// Deterministic ESLint error enumerator (read-only helper).
// Runs ESLint over web + backend projects using the same target/tsconfig
// strategy as eslint-contract.mjs, then emits one JSON line per error/warning
// sorted by file -> line -> column -> ruleId -> message. Intended to support
// targeted batch fixes (e.g. "errors 1501..2000"). Does NOT mutate any
// configuration or baseline.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const args = process.argv.slice(2);
const fromArg = args.find((a) => a.startsWith("--from="));
const toArg = args.find((a) => a.startsWith("--to="));
const outArg = args.find((a) => a.startsWith("--out="));
const errorsOnly = !args.includes("--include-warnings");
const projectsArg = args.find((a) => a.startsWith("--projects="));
const requestedProjects = projectsArg
  ? projectsArg.slice("--projects=".length).split(",").filter(Boolean)
  : ["web", "backend"];

const fromIndex = fromArg ? Number(fromArg.slice("--from=".length)) : 1;
const toIndex = toArg ? Number(toArg.slice("--to=".length)) : Infinity;

const projectDefs = {
  web: {
    root: resolve(repoRoot, "apps/web"),
    discoverTargets(root) {
      const targets = [];
      const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
      function hasLintableFiles(dir) {
        for (const entry of readdirSync(dir)) {
          const full = resolve(dir, entry);
          const stats = statSync(full);
          if (stats.isDirectory()) {
            if (hasLintableFiles(full)) return true;
            continue;
          }
          if (extensions.has(entry.slice(entry.lastIndexOf(".")))) return true;
        }
        return false;
      }
      function pushIfExists(rel) {
        if (existsSync(resolve(root, rel))) targets.push(rel);
      }
      // Split src/* so ESLint type-checker runs in smaller chunks.
      const src = resolve(root, "src");
      for (const entry of readdirSync(src)) {
        const full = resolve(src, entry);
        if (statSync(full).isDirectory()) {
          if (hasLintableFiles(full)) {
            targets.push(`src/${entry}`);
          }
        } else if (extensions.has(entry.slice(entry.lastIndexOf(".")))) {
          targets.push(`src/${entry}`);
        }
      }
      for (const rel of ["scripts", "tests", "e2e", "convex", "__mocks__"]) {
        pushIfExists(rel);
      }
      // Top-level config/test files that ESLint normally lints.
      for (const entry of readdirSync(root)) {
        if (entry === "node_modules" || entry === ".next" || entry === "dist") continue;
        const full = resolve(root, entry);
        if (statSync(full).isFile() && extensions.has(entry.slice(entry.lastIndexOf(".")))) {
          targets.push(entry);
        }
      }
      return targets;
    },
  },
  backend: {
    root: resolve(repoRoot, "apps/backend"),
    discoverTargets(root) {
      const targets = [];
      const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

      function collect(relativePath) {
        const full = resolve(root, relativePath);
        if (!existsSync(full)) return;
        const stats = statSync(full);
        if (stats.isDirectory()) {
          for (const entry of readdirSync(full)) {
            collect(`${relativePath}/${entry}`);
          }
          return;
        }
        const extension = relativePath.slice(relativePath.lastIndexOf("."));
        if (extensions.has(extension)) targets.push(relativePath);
      }

      const src = resolve(root, "src");
      for (const entry of readdirSync(src)) {
        const full = resolve(src, entry);
        if (statSync(full).isDirectory()) {
          if (entry === "ocr-arabic-pdf-to-txt-pipeline") {
            collect(`src/${entry}`);
          } else {
            targets.push(`src/${entry}`);
          }
        } else if (extensions.has(entry.slice(entry.lastIndexOf(".")))) {
          targets.push(`src/${entry}`);
        }
      }
      for (const entry of ["scripts", "agents", "examples"]) {
        const full = resolve(root, entry);
        if (existsSync(full) && statSync(full).isDirectory()) targets.push(entry);
      }
      if (existsSync(resolve(root, "mcp-server.ts"))) targets.push("mcp-server.ts");
      return targets;
    },
  },
};

const eslintBin = resolve(repoRoot, "node_modules/eslint/bin/eslint.js");

function createBackendLintProject(root, target) {
  const safeName = target.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120);
  const tempConfig = resolve(root, `.tsconfig.eslint-contract.${process.pid}.${safeName}.json`);
  const isFile = /\.[cm]?[jt]sx?$/.test(target);
  const include = [
    "src/global.d.ts",
    "src/env.d.ts",
    "src/types/env.d.ts",
    "src/types/module-alias.d.ts",
    ...(isFile
      ? [target]
      : [
          `${target}/**/*.ts`,
          `${target}/**/*.tsx`,
          `${target}/**/*.js`,
          `${target}/**/*.mjs`,
          `${target}/**/*.cjs`,
        ]),
  ];
  const projectConfig = {
    extends: "./tsconfig.check.json",
    compilerOptions: { noEmit: true },
    include,
    exclude: ["node_modules", "dist"],
  };
  writeFileSync(tempConfig, `${JSON.stringify(projectConfig, null, 2)}\n`);
  return tempConfig;
}

function runEslint(projectName, root, target) {
  const tempProject = projectName === "backend" ? createBackendLintProject(root, target) : null;
  const result = spawnSync(
    process.execPath,
    [
      "--max-old-space-size=16384",
      eslintBin,
      target,
      "--format",
      "json",
      "--no-warn-ignored",
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: tempProject
        ? { ...process.env, ESLINT_CONTRACT_TSCONFIG: tempProject }
        : process.env,
      maxBuffer: 1024 * 1024 * 400,
    },
  );
  if (tempProject) rmSync(tempProject, { force: true });

  if (!result.stdout.trim()) {
    return { fatal: true, output: result.stderr ?? "", messages: [] };
  }
  try {
    return { fatal: false, messages: JSON.parse(result.stdout) };
  } catch (error) {
    return { fatal: true, output: `${error.message}\n${result.stderr ?? ""}\n${result.stdout ?? ""}`, messages: [] };
  }
}

const all = [];
const fatalOutputs = [];

for (const projectName of requestedProjects) {
  const def = projectDefs[projectName];
  if (!def) {
    console.error(`Unknown project: ${projectName}`);
    process.exit(2);
  }
  const targets = def.targets ?? def.discoverTargets(def.root);
  for (const target of targets) {
    const result = runEslint(projectName, def.root, target);
    if (result.fatal) {
      fatalOutputs.push(`[${projectName}:${target}] ${result.output}`);
      continue;
    }
    for (const fileResult of result.messages) {
      const filePath = relative(repoRoot, fileResult.filePath).replaceAll("\\", "/");
      for (const message of fileResult.messages ?? []) {
        if (errorsOnly && message.severity !== 2) continue;
        all.push({
          project: projectName,
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
}

if (fatalOutputs.length > 0) {
  console.error(fatalOutputs.join("\n"));
  process.exit(1);
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

const summary = {
  totalErrors: all.length,
  fromIndex,
  toIndex: Number.isFinite(toIndex) ? toIndex : null,
  selected: slice.length,
};

const output = { summary, entries: slice };

if (outArg) {
  writeFileSync(resolve(repoRoot, outArg.slice("--out=".length)), JSON.stringify(output, null, 2));
} else {
  process.stdout.write(JSON.stringify(output, null, 2));
}

console.error(`[deterministic] errors=${all.length} selected=${slice.length} (range ${fromIndex}..${Number.isFinite(toIndex) ? toIndex : "end"})`);
