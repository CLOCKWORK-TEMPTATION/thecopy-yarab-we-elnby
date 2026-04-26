#!/usr/bin/env node
// One-shot, read-only ESLint capture across the same scope used by the lint flow.
// Mirrors scripts/quality/eslint-contract.mjs target discovery for web + backend.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const projects = {
  web: {
    root: resolve(repoRoot, "apps/web"),
    targets: ["."],
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
          for (const entry of readdirSync(full)) collect(`${relativePath}/${entry}`);
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

function createBackendLintProject(target, root) {
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

function runEslint(projectKey, target) {
  const cfg = projects[projectKey];
  const tempProject = projectKey === "backend" ? createBackendLintProject(target, cfg.root) : null;
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
      cwd: cfg.root,
      encoding: "utf8",
      env: tempProject
        ? { ...process.env, ESLINT_CONTRACT_TSCONFIG: tempProject }
        : process.env,
      maxBuffer: 1024 * 1024 * 200,
    },
  );
  if (tempProject) rmSync(tempProject, { force: true });

  if (!result.stdout.trim()) {
    return { fatal: true, status: result.status ?? 1, output: `${result.stderr ?? ""}${result.stdout ?? ""}`, files: [] };
  }
  try {
    return { fatal: false, status: result.status ?? 0, output: result.stderr ?? "", files: JSON.parse(result.stdout) };
  } catch (err) {
    return { fatal: true, status: result.status ?? 1, output: `${err.message}\n${result.stderr ?? ""}\n${result.stdout ?? ""}`, files: [] };
  }
}

const allMessages = [];
const fatalOutputs = [];

for (const projectKey of Object.keys(projects)) {
  const cfg = projects[projectKey];
  const targets = cfg.targets ?? cfg.discoverTargets(cfg.root);
  for (const target of targets) {
    process.stderr.write(`[capture] ${projectKey} :: ${target}\n`);
    const result = runEslint(projectKey, target);
    if (result.fatal) {
      fatalOutputs.push(`[${projectKey}/${target}] ${result.output}`);
      continue;
    }
    for (const fileResult of result.files) {
      const filePath = relative(repoRoot, fileResult.filePath).replaceAll("\\", "/");
      for (const m of fileResult.messages ?? []) {
        allMessages.push({
          project: projectKey,
          file: filePath,
          line: m.line ?? 0,
          column: m.column ?? 0,
          endLine: m.endLine ?? 0,
          endColumn: m.endColumn ?? 0,
          ruleId: m.ruleId ?? "parser",
          severity: m.severity ?? 0,
          message: m.message ?? "",
          fix: !!m.fix,
        });
      }
    }
  }
}

if (fatalOutputs.length > 0) {
  process.stderr.write("=== FATAL OUTPUTS ===\n");
  for (const out of fatalOutputs) process.stderr.write(`${out}\n`);
}

const errors = allMessages
  .filter((m) => m.severity === 2)
  .sort((a, b) => {
    if (a.file !== b.file) return a.file < b.file ? -1 : 1;
    if (a.line !== b.line) return a.line - b.line;
    if (a.column !== b.column) return a.column - b.column;
    if (a.ruleId !== b.ruleId) return a.ruleId < b.ruleId ? -1 : 1;
    if (a.message !== b.message) return a.message < b.message ? -1 : 1;
    return 0;
  })
  .map((m, idx) => ({ index: idx + 1, ...m }));

const warnings = allMessages.filter((m) => m.severity === 1).length;
const outDir = resolve(repoRoot, ".eslint-capture");
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "all-errors.json"), `${JSON.stringify(errors, null, 2)}\n`);

const summary = {
  totalMessages: allMessages.length,
  totalErrors: errors.length,
  totalWarnings: warnings,
  fatalTargets: fatalOutputs.length,
};
writeFileSync(resolve(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

const slice = errors.filter((e) => e.index >= 501 && e.index <= 1000);
writeFileSync(resolve(outDir, "slice-501-1000.json"), `${JSON.stringify(slice, null, 2)}\n`);

process.stderr.write(`[capture] errors=${errors.length} warnings=${warnings} fatalTargets=${fatalOutputs.length}\n`);
process.stderr.write(`[capture] slice 501..1000 size=${slice.length}\n`);
