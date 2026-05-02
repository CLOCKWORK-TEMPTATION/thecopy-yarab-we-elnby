import { openPersistentMemoryRuntime } from "./lib/persistent-memory/runtime";

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
    throw new Error("A search query is required.");
  }

  const runtime = await openPersistentMemoryRuntime();
  if (!runtime.system) {
    console.log(
      JSON.stringify(
        {
          status: runtime.status,
          reason: runtime.reason,
          count: 0,
          hits: [],
        },
        null,
        2,
      ),
    );
    return;
  }

  try {
    const result = await runtime.system.retrieve({ query, topK: 5 });
    console.log(
      JSON.stringify(
        {
          status: runtime.status,
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
          selectedProfile: result.selectedProfile,
          latencyMs: result.latencyMs,
          rerankerUsed: result.rerankerUsed,
        },
        null,
        2,
      ),
    );
  } finally {
    await runtime.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

