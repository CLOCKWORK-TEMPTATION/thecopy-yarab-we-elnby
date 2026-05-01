import { isPersistentMemoryInfraRequired } from "./lib/persistent-memory";
import {
  buildPersistentMemoryInfraConfig,
  checkPersistentMemoryInfra,
} from "./lib/persistent-memory/infra";
import {
  createPersistentMemorySqlClient,
  PostgresPersistentMemoryStore,
} from "./lib/persistent-memory/postgres-store";

async function main(): Promise<void> {
  const required = isPersistentMemoryInfraRequired();
  const infra = await checkPersistentMemoryInfra();
  if (infra.status !== "ready") {
    console.log(
      JSON.stringify(
        {
          status: required ? "failed" : "degraded",
          required,
          components: infra.components,
        },
        null,
        2,
      ),
    );
    if (required) {
      process.exit(1);
    }
    return;
  }

  const config = buildPersistentMemoryInfraConfig();
  const client = await createPersistentMemorySqlClient(config.databaseUrl);
  const store = new PostgresPersistentMemoryStore(client);
  try {
    const memories = await store.listMemories();
    console.log(
      JSON.stringify(
        {
          status: "ready",
          required,
          components: infra.components,
          memories: memories.length,
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

