import { isPersistentMemoryInfraRequired } from "./lib/persistent-memory";
import {
  createPersistentMemorySqlClient,
  PostgresPersistentMemoryStore,
} from "./lib/persistent-memory/postgres-store";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    const message =
      "Persistent memory workers are degraded because DATABASE_URL is not configured.";
    if (isPersistentMemoryInfraRequired()) {
      throw new Error(message);
    }
    console.log(message);
    return;
  }

  const client = await createPersistentMemorySqlClient();
  const store = new PostgresPersistentMemoryStore(client);
  try {
    console.log(
      JSON.stringify(
        {
          status: "ready",
          jobTypes: ["embedding"],
          durablePayloadPolicy: "ids-only",
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

