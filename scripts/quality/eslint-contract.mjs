#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const args = process.argv.slice(2);
const projectArg = args.find((arg) => arg.startsWith("--project="));
const project = projectArg?.slice("--project=".length);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const reportLimit = limitArg ? Number(limitArg.slice("--limit=".length)) : 50;
const targetArgs = args
  .filter((arg) => arg.startsWith("--target="))
  .map((arg) => arg.slice("--target=".length))
  .filter(Boolean);

const projects = {
  web: {
    root: resolve(repoRoot, "apps/web"),
    discoverTargets() {
      return ["."];
    },
  },
  backend: {
    root: resolve(repoRoot, "apps/backend"),
    discoverTargets(root) {
      const targets = [];
      const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

      function collect(relativePath) {
        const full = resolve(root, relativePath);
        if (!existsSync(full)) {
          return;
        }

        const stats = statSync(full);
        if (stats.isDirectory()) {
          for (const entry of readdirSync(full)) {
            collect(`${relativePath}/${entry}`);
          }
          return;
        }

        const extension = relativePath.slice(relativePath.lastIndexOf("."));
        if (extensions.has(extension)) {
          targets.push(relativePath);
        }
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
        if (existsSync(full) && statSync(full).isDirectory()) {
          targets.push(entry);
        }
      }

      if (existsSync(resolve(root, "mcp-server.ts"))) {
        targets.push("mcp-server.ts");
      }

      return targets;
    },
  },
};

if (!project || !projects[project]) {
  console.error(
    "Usage: node scripts/quality/eslint-contract.mjs --project=web|backend [--limit=N] [--target=<path>]",
  );
  process.exit(2);
}

if (!Number.isFinite(reportLimit) || reportLimit < 1) {
  console.error("[lint] --limit must be a positive number.");
  process.exit(2);
}

const eslintBin = resolve(repoRoot, "node_modules/eslint/bin/eslint.js");
const config = projects[project];
const targets =
  targetArgs.length > 0
    ? targetArgs
    : (config.targets ?? config.discoverTargets(config.root));

function fingerprint(message, filePath) {
  const file = relative(repoRoot, filePath).replaceAll("\\", "/");
  const rule = message.ruleId ?? "parser";
  return `${file}|${rule}|${message.message}`;
}

function addCount(map, key, amount = 1) {
  map[key] = (map[key] ?? 0) + amount;
}

function createBackendLintProject(target) {
  if (project !== "backend") {
    return null;
  }

  const safeName = target.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120);
  const tempConfig = resolve(
    config.root,
    `.tsconfig.eslint-contract.${process.pid}.${safeName}.json`,
  );
  const isFile = /\.[cm]?[jt]sx?$/.test(target);
  const include = [
    "src/global.d.ts",
    "src/env.d.ts",
    "src/types/env.d.ts",
    "src/types/mcp-sdk-compat.d.ts",
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
    compilerOptions: {
      noEmit: true,
    },
    include,
    exclude: ["node_modules", "dist"],
  };

  writeFileSync(tempConfig, `${JSON.stringify(projectConfig, null, 2)}\n`);
  return tempConfig;
}

function runEslint(target) {
  const tempProject = createBackendLintProject(target);
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
      cwd: config.root,
      encoding: "utf8",
      env: tempProject
        ? { ...process.env, ESLINT_CONTRACT_TSCONFIG: tempProject }
        : process.env,
      maxBuffer: 1024 * 1024 * 200,
    },
  );
  if (tempProject) {
    rmSync(tempProject, { force: true });
  }

  if (!result.stdout.trim()) {
    return {
      fatal: true,
      status: result.status ?? 1,
      output: `${result.stderr ?? ""}${result.stdout ?? ""}`,
      messages: [],
    };
  }

  try {
    return {
      fatal: false,
      status: result.status ?? 0,
      output: result.stderr ?? "",
      messages: JSON.parse(result.stdout),
    };
  } catch (error) {
    return {
      fatal: true,
      status: result.status ?? 1,
      output: `${error.message}\n${result.stderr ?? ""}\n${result.stdout ?? ""}`,
      messages: [],
    };
  }
}

const current = {};
let errors = 0;
let warnings = 0;
let filesWithMessages = 0;
const fatalOutputs = [];

for (const target of targets) {
  const result = runEslint(target);
  if (result.fatal) {
    fatalOutputs.push(`[${target}] ${result.output}`);
    continue;
  }

  for (const fileResult of result.messages) {
    const count = (fileResult.messages ?? []).length;
    if (count > 0) {
      filesWithMessages += 1;
    }
    errors += fileResult.errorCount ?? 0;
    warnings += fileResult.warningCount ?? 0;

    for (const message of fileResult.messages ?? []) {
      addCount(current, fingerprint(message, fileResult.filePath));
    }
  }
}

if (fatalOutputs.length > 0) {
  console.error(fatalOutputs.join("\n"));
  process.exit(1);
}

console.log(
  `[lint] ${project}: ${errors} error(s), ${warnings} warning(s), ${filesWithMessages} file(s) with messages.`,
);

if (Object.keys(current).length > 0) {
  const sorted = Object.entries(current)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
  for (const item of sorted.slice(0, reportLimit)) {
    console.error(`  ${item.count}× ${item.key}`);
  }
  if (sorted.length > reportLimit) {
    console.error(`  ...and ${sorted.length - reportLimit} more unique violation(s).`);
  }
}

if (errors > 0 || warnings > 0) {
  console.error(`[lint] ${project}: lint violations detected.`);
  process.exit(1);
}
