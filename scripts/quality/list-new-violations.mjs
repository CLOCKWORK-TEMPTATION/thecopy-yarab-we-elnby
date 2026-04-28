#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);

function readOption(name, fallback) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : fallback;
}

function parseProjects(value) {
  if (value === "all") {
    return ["web", "backend"];
  }

  const projects = value
    .split(",")
    .map((project) => project.trim())
    .filter(Boolean);
  if (
    projects.length === 0 ||
    projects.some((project) => !["web", "backend"].includes(project))
  ) {
    console.error(
      "Usage: node scripts/quality/list-new-violations.mjs [--project=web|backend|all] [--kind=eslint|typecheck|all]",
    );
    process.exit(2);
  }

  return projects;
}

function parseKinds(value) {
  if (value === "all") {
    return ["eslint", "typecheck"];
  }

  const kinds = value
    .split(",")
    .map((kind) => kind.trim())
    .filter(Boolean);
  if (
    kinds.length === 0 ||
    kinds.some((kind) => !["eslint", "typecheck"].includes(kind))
  ) {
    console.error(
      "Usage: node scripts/quality/list-new-violations.mjs [--project=web|backend|all] [--kind=eslint|typecheck|all]",
    );
    process.exit(2);
  }

  return kinds;
}

const projects = parseProjects(
  readOption("--project", readOption("--projects", "all")),
);
const kinds = parseKinds(readOption("--kind", "all"));
const limit = readOption("--limit", "50");
const targetArgs = args.filter((arg) => arg.startsWith("--target="));

const scripts = {
  eslint: resolve(repoRoot, "scripts/quality/eslint-contract.mjs"),
  typecheck: resolve(repoRoot, "scripts/quality/typecheck-contract.mjs"),
};

let exitCode = 0;

for (const project of projects) {
  for (const kind of kinds) {
    const label = `${kind}:${project}`;
    console.log(`[list-new-violations] ${label}`);

    const contractArgs = [
      scripts[kind],
      `--project=${project}`,
      `--limit=${limit}`,
    ];
    if (kind === "eslint") {
      contractArgs.push(...targetArgs);
    }
    if (kind === "typecheck" && project === "backend") {
      contractArgs.push("--full");
    }

    const result = spawnSync(process.execPath, contractArgs, {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 400,
    });

    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }

    const status = result.status ?? 1;
    if (status !== 0) {
      exitCode = status === 2 ? 2 : 1;
    }
  }
}

process.exit(exitCode);
