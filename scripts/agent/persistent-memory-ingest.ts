import { promises as fsp } from "node:fs";

import {
  createPersistentMemorySystem,
  isPersistentMemoryInfraRequired,
} from "./lib/persistent-memory";
import { buildPersistentMemoryInfraConfig } from "./lib/persistent-memory/infra";
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
  const required = isPersistentMemoryInfraRequired();
  const config = buildPersistentMemoryInfraConfig();
  let client;

  try {
    client = await createPersistentMemorySqlClient(config.databaseUrl);
  } catch {
    const message =
      "Persistent memory ingest is degraded because local infrastructure is not available.";
    if (required) {
      throw new Error(message);
    }
    console.log(message);
    return;
  }

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

