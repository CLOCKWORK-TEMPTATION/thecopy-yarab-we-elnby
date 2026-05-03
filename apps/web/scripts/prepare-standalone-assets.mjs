import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneRoot = join(appRoot, ".next", "standalone", "apps", "web");

function ensureInsideStandalone(target) {
  const resolvedTarget = resolve(target);
  const resolvedStandaloneRoot = resolve(standaloneRoot);

  if (
    resolvedTarget !== resolvedStandaloneRoot &&
    !resolvedTarget.startsWith(`${resolvedStandaloneRoot}\\`) &&
    !resolvedTarget.startsWith(`${resolvedStandaloneRoot}/`)
  ) {
    throw new Error(`Refusing to copy outside standalone output: ${target}`);
  }
}

function copyDirectory(source, target, { required = true } = {}) {
  if (!existsSync(source)) {
    if (!required) return;
    throw new Error(`Required standalone source does not exist: ${source}`);
  }

  if (!existsSync(standaloneRoot)) {
    throw new Error(`Standalone output does not exist: ${standaloneRoot}`);
  }

  ensureInsideStandalone(target);
  mkdirSync(dirname(target), { recursive: true });
  rmSync(target, { force: true, recursive: true });
  cpSync(source, target, { recursive: true });
}

copyDirectory(
  join(appRoot, ".next", "static"),
  join(standaloneRoot, ".next", "static")
);
copyDirectory(join(appRoot, "public"), join(standaloneRoot, "public"), {
  required: false,
});

console.log("Standalone static assets prepared.");
