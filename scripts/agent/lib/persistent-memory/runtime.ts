import {
  createPersistentMemorySqlClient,
  PostgresPersistentMemoryStore,
} from "./postgres-store";
import {
  createPersistentMemorySystem,
  isPersistentMemoryInfraRequired,
  type PersistentMemorySystem,
} from "./index";
import { probePersistentMemoryInfra } from "./infra";
import { buildLocalPersistentMemoryDatabaseUrl } from "./database-url";

export interface PersistentMemoryRuntime {
  status: "ready" | "degraded";
  reason?: string;
  system?: PersistentMemorySystem;
  store?: PostgresPersistentMemoryStore;
  close(): Promise<void>;
}

export function getPersistentMemoryDatabaseUrl(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  return (
    env.PERSISTENT_MEMORY_DATABASE_URL ||
    env.DATABASE_URL ||
    buildLocalPersistentMemoryDatabaseUrl(env, { defaultHost: "127.0.0.1" })
  );
}

export async function openPersistentMemoryRuntime(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Promise<PersistentMemoryRuntime> {
  const infra = await probePersistentMemoryInfra(env);
  if (infra.missingRequired.length > 0) {
    throw new Error(
      `Persistent memory infrastructure is required but unavailable: ${infra.missingRequired.join(", ")}`,
    );
  }

  try {
    const client = await createPersistentMemorySqlClient(
      getPersistentMemoryDatabaseUrl(env),
    );
    const store = new PostgresPersistentMemoryStore(client);
    return {
      status: "ready",
      system: createPersistentMemorySystem({ store }),
      store,
      async close() {
        await store.close();
      },
    };
  } catch (error) {
    if (isPersistentMemoryInfraRequired(env)) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "degraded",
      reason: `persistent memory database unavailable: ${message}`,
      async close() {},
    };
  }
}
