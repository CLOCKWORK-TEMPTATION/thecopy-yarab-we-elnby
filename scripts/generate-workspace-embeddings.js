#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const args = process.argv.slice(2);
const mappedArgs = args.includes("--search")
  || args.some((arg) => arg.startsWith("--search="))
  ? ["agent:memory:search", "--", ...args.map((arg) => arg.replace(/^--search=/, "--query="))]
  : ["agent:memory:index", "--", ...args];

const result = spawnSync("pnpm", mappedArgs, {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
