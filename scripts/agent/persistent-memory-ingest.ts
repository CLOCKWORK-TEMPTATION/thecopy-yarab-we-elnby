import { promises as fsp } from "node:fs";

import { openPersistentMemoryRuntime } from "./lib/persistent-memory/runtime";
import { fromRepoRoot } from "./lib/utils";

const DEFAULT_INPUTS = [
  { path: "output/session-state.md", eventType: "state_snapshot" as const },
  { path: "output/round-notes.md", eventType: "round" as const },
];

async function main(): Promise<void> {
  const runtime = await openPersistentMemoryRuntime();
  if (!runtime.system) {
    console.log(
      JSON.stringify(
        {
          status: runtime.status,
          reason: runtime.reason,
        },
        null,
        2,
      ),
    );
    return;
  }

  try {
    const results = [];
    for (const input of DEFAULT_INPUTS) {
      const content = await fsp.readFile(fromRepoRoot(input.path), "utf8");
      const result = await runtime.system.ingestRawEvent({
        sourceRef: input.path,
        eventType: input.eventType,
        content,
        tags: ["agent-state"],
      });
      results.push({ sourceRef: input.path, ...result });
    }

    console.log(JSON.stringify({ status: runtime.status, results }, null, 2));
  } finally {
    await runtime.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
