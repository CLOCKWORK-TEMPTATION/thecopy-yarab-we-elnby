#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const baselinePath = resolve(repoRoot, "scripts/quality/baselines/typecheck.json");
const tscPath = resolve(repoRoot, "node_modules/typescript/lib/tsc.js");

const args = process.argv.slice(2);
const updateBaseline = args.includes("--update-baseline");
const projectArg = args.find((arg) => arg.startsWith("--project="));
const project = projectArg?.slice("--project=".length);

const projects = {
  web: {
    root: resolve(repoRoot, "apps/web"),
    command(root) {
      return {
        cwd: root,
        args: ["--max-old-space-size=8192", tscPath, "-p", "tsconfig.check.json", "--noEmit", "--pretty", "false"],
      };
    },
  },
  backend: {
    root: resolve(repoRoot, "apps/backend"),
    chunks(root) {
      const chunks = [];
      const src = resolve(root, "src");
      for (const entry of readdirSync(src)) {
        const full = resolve(src, entry);
        if (statSync(full).isDirectory()) {
          chunks.push({ name: `src-${entry}`, include: [`src/${entry}/**/*.ts`, `src/${entry}/**/*.tsx`] });
        } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
          chunks.push({ name: entry.replace(/[^a-zA-Z0-9_-]/g, "-"), files: [`src/${entry}`] });
        }
      }

      for (const entry of ["scripts", "agents", "examples"]) {
        const full = resolve(root, entry);
        if (existsSync(full) && statSync(full).isDirectory()) {
          chunks.push({ name: entry, include: [`${entry}/**/*.ts`, `${entry}/**/*.tsx`] });
        }
      }

      if (existsSync(resolve(root, "mcp-server.ts"))) {
        chunks.push({ name: "mcp-server", files: ["mcp-server.ts"] });
      }

      return chunks;
    },
  },
};

if (!project || !projects[project]) {
  console.error("Usage: node scripts/quality/typecheck-contract.mjs --project=web|backend [--update-baseline]");
  process.exit(2);
}

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

function addCount(map, key, amount = 1) {
  map[key] = (map[key] ?? 0) + amount;
}

function parseTypeScriptErrors(output) {
  const counts = {};
  let parsed = 0;
  const regex = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/;

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(regex);
    if (!match) {
      continue;
    }

    const [, rawFile, , , code, message] = match;
    const file = relative(repoRoot, resolve(projects[project].root, rawFile)).replaceAll("\\", "/");
    const key = `${file}|${code}|${message}`;
    addCount(counts, key);
    parsed += 1;
  }

  return { counts, parsed };
}

function runCommand(cwd, args) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 200,
  });
  return {
    status: result.status ?? 0,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

function runWeb() {
  const { cwd, args: commandArgs } = projects.web.command(projects.web.root);
  return [runCommand(cwd, commandArgs)];
}

function runBackend() {
  const root = projects.backend.root;
  const results = [];

  for (const chunk of projects.backend.chunks(root)) {
    const tempConfig = resolve(root, `.tsconfig.contract.${process.pid}.${chunk.name}.json`);
    const include = [
      "src/global.d.ts",
      "src/env.d.ts",
      "src/types/env.d.ts",
      "src/types/mcp-sdk-compat.d.ts",
      "src/types/module-alias.d.ts",
      ...(chunk.include ?? []),
      ...(chunk.files ?? []),
    ];
    const config = {
      extends: "./tsconfig.check.json",
      compilerOptions: {
        noEmit: true,
        declaration: false,
        declarationMap: false,
        sourceMap: false,
        tsBuildInfoFile: `./.tsbuildinfo.contract.${process.pid}.${chunk.name}`,
      },
      include,
      exclude: ["node_modules", "dist"],
    };

    writeFileSync(tempConfig, `${JSON.stringify(config, null, 2)}\n`);
    const result = runCommand(root, [
      "--max-old-space-size=8192",
      tscPath,
      "-p",
      tempConfig,
      "--pretty",
      "false",
    ]);
    rmSync(tempConfig, { force: true });
    rmSync(resolve(root, `.tsbuildinfo.contract.${process.pid}.${chunk.name}`), { force: true });
    results.push(result);
  }

  return results;
}

const results = project === "web" ? runWeb() : runBackend();
const current = {};
let parsedErrors = 0;
let fatal = false;

for (const result of results) {
  const parsed = parseTypeScriptErrors(result.output);
  parsedErrors += parsed.parsed;
  for (const [key, count] of Object.entries(parsed.counts)) {
    addCount(current, key, count);
  }

  if (result.status !== 0 && parsed.parsed === 0) {
    fatal = true;
    console.error(result.output);
  }
}

if (fatal) {
  process.exit(1);
}

const baseline = readBaseline();
baseline[project] ??= {};

if (updateBaseline) {
  baseline[project] = current;
  writeBaseline(baseline);
  console.log(`[typecheck-contract] ${project}: baseline updated with ${Object.keys(current).length} fingerprints.`);
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

console.log(`[typecheck-contract] ${project}: ${parsedErrors} TypeScript errors detected.`);

if (newViolations.length > 0) {
  console.error(`[typecheck-contract] ${project}: new TypeScript errors detected.`);
  for (const item of newViolations.slice(0, 50)) {
    console.error(`  ${item.count - item.allowed} new: ${item.key}`);
  }
  if (newViolations.length > 50) {
    console.error(`  ...and ${newViolations.length - 50} more.`);
  }
  process.exit(1);
}

console.log(`[typecheck-contract] ${project}: no new TypeScript errors above baseline.`);
