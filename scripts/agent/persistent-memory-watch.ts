import { watch } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

import { openPersistentMemoryRuntime } from "./lib/persistent-memory/runtime";
import { fromRepoRoot } from "./lib/utils";

const WATCHED_FILES = ["output/session-state.md", "output/round-notes.md"];

async function ingestOnce(): Promise<void> {
  const runtime = await openPersistentMemoryRuntime();
  if (!runtime.system) {
    console.log(
      JSON.stringify(
        {
          status: runtime.status,
          reason: runtime.reason,
          watchedFiles: WATCHED_FILES,
        },
        null,
        2,
      ),
    );
    return;
  }

  try {
    const { promises: fsp } = await import("node:fs");
    const results = [];
    for (const filePath of WATCHED_FILES) {
      const content = await fsp.readFile(fromRepoRoot(filePath), "utf8");
      results.push(
        await runtime.system.ingestRawEvent({
          sourceRef: filePath,
          eventType: filePath.includes("session-state") ? "state_snapshot" : "round",
          content,
          tags: ["agent-watch", "persistent-memory"],
        }),
      );
    }
    console.log(JSON.stringify({ status: runtime.status, results }, null, 2));
  } finally {
    await runtime.close();
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--once")) {
    await ingestOnce();
    return;
  }

  await ingestOnce();
  for (const filePath of WATCHED_FILES) {
    watch(fromRepoRoot(filePath), { persistent: true }, () => {
      void ingestOnce();
    });
  }
  console.log(JSON.stringify({ status: "watching", watchedFiles: WATCHED_FILES }, null, 2));

  while (true) {
    await delay(60_000);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

