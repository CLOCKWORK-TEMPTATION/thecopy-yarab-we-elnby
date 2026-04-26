import fs from "node:fs";
import path from "node:path";

import {
  CODE_MEMORY_PRIORITY_FILES,
  CODE_MEMORY_SOURCE_ROOTS,
} from "./lib/code-memory/config";
import { runAgentGuard } from "./lib/agent-guard";
import { fromRepoRoot, toPosixPath } from "./lib/utils";

const debounceMs = Number(process.env.AGENT_MEMORY_WATCH_DEBOUNCE_MS ?? 2500);
let timer: NodeJS.Timeout | null = null;
let indexing = false;
let pending = false;

function schedule(reason: string): void {
  if (timer) {
    clearTimeout(timer);
  }

  timer = setTimeout(() => {
    void refresh(reason);
  }, debounceMs);
}

async function refresh(reason: string): Promise<void> {
  if (indexing) {
    pending = true;
    return;
  }

  indexing = true;
  try {
    console.log(`code memory watch refresh=${reason}`);
    await runAgentGuard("step");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`code memory watch failed: ${message}`);
  } finally {
    indexing = false;
    if (pending) {
      pending = false;
      schedule("pending-change");
    }
  }
}

function watchPath(repoRelativePath: string): void {
  const absolutePath = fromRepoRoot(repoRelativePath);
  if (!fs.existsSync(absolutePath)) {
    return;
  }

  try {
    fs.watch(absolutePath, { recursive: true }, (_event, filename) => {
      const changed = filename
        ? toPosixPath(path.join(repoRelativePath, filename.toString()))
        : repoRelativePath;
      schedule(changed);
    });
    console.log(`watching ${repoRelativePath}`);
  } catch {
    fs.watch(absolutePath, () => schedule(repoRelativePath));
    console.log(`watching ${repoRelativePath}`);
  }
}

async function main(): Promise<void> {
  await runAgentGuard("start");

  for (const sourceRoot of CODE_MEMORY_SOURCE_ROOTS) {
    watchPath(sourceRoot.base);
  }

  for (const priorityFile of CODE_MEMORY_PRIORITY_FILES) {
    watchPath(priorityFile);
  }

  setInterval(() => {
    // Keeps the watcher process alive without writing state.
  }, 60_000);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Code memory watch failed: ${message}`);
  process.exit(1);
});
