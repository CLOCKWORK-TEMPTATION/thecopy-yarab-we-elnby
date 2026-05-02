import {
  buildLatencyBudgetList,
  getPersistentMemoryVectorCapabilities,
} from "./lib/persistent-memory";
import { probePersistentMemoryInfra } from "./lib/persistent-memory/infra";
import { openPersistentMemoryRuntime } from "./lib/persistent-memory/runtime";

async function main(): Promise<void> {
  const infra = await probePersistentMemoryInfra();

  if (infra.missingRequired.length > 0) {
    console.log(
      JSON.stringify(
        {
          status: "failed",
          required: infra.required,
          missingRequired: infra.missingRequired,
          postgres: infra.postgres,
          redis: infra.redis,
          weaviate: infra.weaviate,
          qdrant: infra.qdrant,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const runtime = await openPersistentMemoryRuntime();
  try {
    const memories = runtime.store ? await runtime.store.listMemories() : [];
    console.log(
      JSON.stringify(
        {
          status: runtime.status,
          reason: runtime.reason,
          required: infra.required,
          postgres: infra.postgres,
          redis: infra.redis,
          weaviate: infra.weaviate,
          qdrant: infra.qdrant,
          memories: memories.length,
          vectorCapabilities: {
            weaviatePrimary:
              getPersistentMemoryVectorCapabilities("weaviate-primary"),
            qdrantShadow:
              getPersistentMemoryVectorCapabilities("qdrant-shadow"),
          },
          latencyBudgets: buildLatencyBudgetList(),
        },
        null,
        2,
      ),
    );
    if (infra.required && runtime.status !== "ready") {
      process.exit(1);
    }
  } finally {
    await runtime.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
