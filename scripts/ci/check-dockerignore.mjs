import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const dockerignorePath = resolve(process.cwd(), ".dockerignore");

function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    ...options,
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
  };
}

function fail(message) {
  console.error(`dockerignore-check: ${message}`);
  process.exit(1);
}

if (!existsSync(dockerignorePath)) {
  fail(`missing ${dockerignorePath}`);
}

const sha = runGit(["rev-parse", "HEAD"]);
if (sha.status !== 0 || !sha.stdout) {
  fail(`unable to resolve git SHA: ${sha.stderr || "unknown git error"}`);
}

const tracked = runGit(["ls-files", "--error-unmatch", ".dockerignore"]);
if (tracked.status !== 0) {
  fail(".dockerignore is not tracked by git");
}

const ignored = runGit(["check-ignore", "-v", ".dockerignore"]);
if (ignored.status === 0) {
  fail(`.dockerignore is still ignored: ${ignored.stdout || ignored.stderr}`);
}

console.log(`dockerignore-check: sha=${sha.stdout}`);
console.log(`dockerignore-check: tracked=${tracked.stdout}`);
console.log(`dockerignore-check: present=${dockerignorePath}`);
