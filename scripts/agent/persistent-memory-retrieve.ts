import {
  createPersistentMemorySystem,
  isPersistentMemoryInfraRequired,
} from "./lib/persistent-memory";
import { buildPersistentMemoryInfraConfig } from "./lib/persistent-memory/infra";
import {
  createPersistentMemorySqlClient,
  PostgresPersistentMemoryStore,
} from "./lib/persistent-memory/postgres-store";

function readQuery(): string {
  const queryFlagIndex = process.argv.indexOf("--query");
  if (queryFlagIndex >= 0) {
    return process.argv.slice(queryFlagIndex + 1).join(" ").trim();
  }
  return process.argv.slice(2).join(" ").trim();
}

async function main(): Promise<void> {
  const query = readQuery();
  if (!query) {
    throw new Error("A retrieval query is required.");
  }

  const required = isPersistentMemoryInfraRequired();
  const config = buildPersistentMemoryInfraConfig();
  let client;

  try {
    client = await createPersistentMemorySqlClient(config.databaseUrl);
  } catch {
    const message =
      "Persistent memory retrieval is degraded because local infrastructure is not available.";
    if (required) {
      throw new Error(message);
    }
    console.log(message);
    return;
  }

  const store = new PostgresPersistentMemoryStore(client);
  const system = createPersistentMemorySystem({ store });

  try {
    const result = await system.retrieve({ query, topK: 5 });
    console.log(
      JSON.stringify(
        {
          count: result.hits.length,
          hits: result.hits.map((hit) => ({
            id: hit.id,
            sourceRef: hit.sourceRef,
            score: hit.score,
            rank: hit.rank,
            trustLevel: hit.trustLevel,
          })),
          retrievalEventId: result.retrievalEventId,
          auditEventId: result.auditEventId,
          metrics: result.metrics,
        },
        null,
        2,
      ),
    );
  } finally {
    await store.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

