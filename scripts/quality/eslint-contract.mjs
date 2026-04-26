#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const baselinePath = resolve(repoRoot, "scripts/quality/baselines/eslint.json");

const args = process.argv.slice(2);
const updateBaseline = args.includes("--update-baseline");
const projectArg = args.find((arg) => arg.startsWith("--project="));
const project = projectArg?.slice("--project=".length);
const targetArgs = args
  .filter((arg) => arg.startsWith("--target="))
  .map((arg) => arg.slice("--target=".length))
  .filter(Boolean);

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
  console.error("Usage: node scripts/quality/eslint-contract.mjs --project=web|backend [--update-baseline]");
  process.exit(2);
}

const eslintBin = resolve(repoRoot, "node_modules/eslint/bin/eslint.js");
const config = projects[project];
const targets = targetArgs.length > 0 ? targetArgs : (config.targets ?? config.discoverTargets(config.root));

function readBaseline() {
  if (!existsSync(baselinePath)) {
    return {};
  }
  return JSON.parse(readFileSync(baselinePath, "utf8"));
}

function writeBaseline(baseline) {
  mkdirSync(dirname(baselinePath), { recursive: true });
  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
}

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
  const tempConfig = resolve(config.root, `.tsconfig.eslint-contract.${process.pid}.${safeName}.json`);
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

const baseline = readBaseline();
baseline[project] ??= {};

if (updateBaseline) {
  baseline[project] = current;
  writeBaseline(baseline);
  console.log(`[eslint-contract] ${project}: baseline updated with ${Object.keys(current).length} fingerprints.`);
  process.exit(0);
}

const projectBaseline = baseline[project];
const newViolations = [];
for (const [key, count] of Object.entries(current)) {
  const allowed = projectBaseline[key] ?? 0;
  if (count > allowed) {
    newViolations.push({ key, count, allowed });
  }
}

console.log(
  `[eslint-contract] ${project}: ${errors} errors, ${warnings} warnings, ${filesWithMessages} files with messages.`,
);

if (newViolations.length > 0) {
  console.error(`[eslint-contract] ${project}: new lint violations detected.`);
  for (const item of newViolations.slice(0, 50)) {
    console.error(`  ${item.count - item.allowed} new: ${item.key}`);
  }
  if (newViolations.length > 50) {
    console.error(`  ...and ${newViolations.length - 50} more.`);
  }
  process.exit(1);
}

console.log(`[eslint-contract] ${project}: no new lint violations above baseline.`);
