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
const tscPath = resolve(repoRoot, "node_modules/typescript/lib/tsc.js");

const args = process.argv.slice(2);
const fullMode = args.includes("--full");
const projectArg = args.find((arg) => arg.startsWith("--project="));
const project = projectArg?.slice("--project=".length);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const reportLimit = limitArg ? Number(limitArg.slice("--limit=".length)) : 50;

const projects = {
  web: {
    root: resolve(repoRoot, "apps/web"),
    command(root) {
      return {
        cwd: root,
        args: [
          "--max-old-space-size=8192",
          tscPath,
          "-p",
          "tsconfig.check.json",
          "--noEmit",
          "--pretty",
          "false",
        ],
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
          chunks.push({
            name: `src-${entry}`,
            include: [`src/${entry}/**/*.ts`, `src/${entry}/**/*.tsx`],
          });
        } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
          chunks.push({
            name: entry.replace(/[^a-zA-Z0-9_-]/g, "-"),
            files: [`src/${entry}`],
          });
        }
      }

      for (const entry of ["scripts", "agents", "examples"]) {
        const full = resolve(root, entry);
        if (existsSync(full) && statSync(full).isDirectory()) {
          chunks.push({
            name: entry,
            include: [`${entry}/**/*.ts`, `${entry}/**/*.tsx`],
          });
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
  console.error(
    "Usage: node scripts/quality/typecheck-contract.mjs --project=web|backend [--full] [--limit=N]",
  );
  process.exit(2);
}

if (fullMode && project !== "backend") {
  console.error("[typecheck] --full is only supported for backend.");
  process.exit(2);
}

if (!Number.isFinite(reportLimit) || reportLimit < 1) {
  console.error("[typecheck] --limit must be a positive number.");
  process.exit(2);
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
    const file = relative(
      repoRoot,
      resolve(projects[project].root, rawFile),
    ).replaceAll("\\", "/");
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
  if (fullMode) {
    return [
      runCommand(root, [
        "--max-old-space-size=8192",
        tscPath,
        "-p",
        "tsconfig.check.json",
        "--noEmit",
        "--pretty",
        "false",
      ]),
    ];
  }

  const results = [];

  for (const chunk of projects.backend.chunks(root)) {
    const tempConfig = resolve(
      root,
      `.tsconfig.contract.${process.pid}.${chunk.name}.json`,
    );
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

    const tempBuildInfo = resolve(
      root,
      `.tsbuildinfo.contract.${process.pid}.${chunk.name}`,
    );
    let result;
    try {
      writeFileSync(tempConfig, `${JSON.stringify(config, null, 2)}\n`);
      result = runCommand(root, [
        "--max-old-space-size=8192",
        tscPath,
        "-p",
        tempConfig,
        "--pretty",
        "false",
      ]);
    } finally {
      rmSync(tempConfig, { force: true });
      rmSync(tempBuildInfo, { force: true });
    }
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

console.log(`[typecheck] ${project}: ${parsedErrors} TypeScript error(s).`);

if (parsedErrors > 0) {
  const sorted = Object.entries(current)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
  for (const item of sorted.slice(0, reportLimit)) {
    console.error(`  ${item.count}× ${item.key}`);
  }
  if (sorted.length > reportLimit) {
    console.error(`  ...and ${sorted.length - reportLimit} more unique error(s).`);
  }
  process.exit(0);
}
