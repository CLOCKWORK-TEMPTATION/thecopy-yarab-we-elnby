import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const candidateServerPaths = [
  join(appRoot, ".next", "standalone", "apps", "web", "server.js"),
  join(appRoot, ".next", "standalone", "server.js"),
];

const serverPath = candidateServerPaths.find((candidate) =>
  existsSync(candidate),
);

if (!serverPath) {
  throw new Error(
    `Standalone server entry not found. Checked: ${candidateServerPaths.join(", ")}`,
  );
}

await import(pathToFileURL(serverPath).href);
