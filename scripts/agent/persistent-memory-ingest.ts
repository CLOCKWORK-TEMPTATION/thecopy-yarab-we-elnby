import { promises as fsp } from "node:fs";

import {
  createPersistentMemorySystem,
  isPersistentMemoryInfraRequired,
} from "./lib/persistent-memory";
import {
  createPersistentMemorySqlClient,
  PostgresPersistentMemoryStore,
} from "./lib/persistent-memory/postgres-store";
import { fromRepoRoot } from "./lib/utils";

const DEFAULT_INPUTS = [
  { path: "output/session-state.md", eventType: "state_snapshot" as const },
  { path: "output/round-notes.md", eventType: "round" as const },
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    const message =
      "Persistent memory ingest is degraded because DATABASE_URL is not configured.";
    if (isPersistentMemoryInfraRequired()) {
      throw new Error(message);
    }
    console.log(message);
    return;
  }

  const client = await createPersistentMemorySqlClient();
  const store = new PostgresPersistentMemoryStore(client);
  const system = createPersistentMemorySystem({ store });

  try {
    const results = [];
    for (const input of DEFAULT_INPUTS) {
      const content = await fsp.readFile(fromRepoRoot(input.path), "utf8");
      const result = await system.ingestRawEvent({
        sourceRef: input.path,
        eventType: input.eventType,
        content,
        tags: ["agent-state"],
      });
      results.push({ sourceRef: input.path, ...result });
    }

    console.log(JSON.stringify({ results }, null, 2));
  } finally {
    await store.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

