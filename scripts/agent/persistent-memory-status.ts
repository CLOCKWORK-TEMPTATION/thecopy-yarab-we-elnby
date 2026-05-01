import { isPersistentMemoryInfraRequired } from "./lib/persistent-memory";
import {
  createPersistentMemorySqlClient,
  PostgresPersistentMemoryStore,
} from "./lib/persistent-memory/postgres-store";

async function main(): Promise<void> {
  const required = isPersistentMemoryInfraRequired();
  if (!process.env.DATABASE_URL) {
    const payload = {
      status: required ? "failed" : "degraded",
      required,
      postgres: "not-configured",
    };
    console.log(JSON.stringify(payload, null, 2));
    if (required) {
      process.exit(1);
    }
    return;
  }

  const client = await createPersistentMemorySqlClient();
  const store = new PostgresPersistentMemoryStore(client);
  try {
    const memories = await store.listMemories();
    console.log(
      JSON.stringify(
        {
          status: "ready",
          required,
          postgres: "connected",
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

