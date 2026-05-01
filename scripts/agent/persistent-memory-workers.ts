import { isPersistentMemoryInfraRequired } from "./lib/persistent-memory";
import { buildPersistentMemoryInfraConfig } from "./lib/persistent-memory/infra";
import {
  createPersistentMemorySqlClient,
  PostgresPersistentMemoryStore,
} from "./lib/persistent-memory/postgres-store";

async function main(): Promise<void> {
  const required = isPersistentMemoryInfraRequired();
  const config = buildPersistentMemoryInfraConfig();
  let client;

  try {
    client = await createPersistentMemorySqlClient(config.databaseUrl);
  } catch {
    const message =
      "Persistent memory workers are degraded because local infrastructure is not available.";
    if (required) {
      throw new Error(message);
    }
    console.log(message);
    return;
  }

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

