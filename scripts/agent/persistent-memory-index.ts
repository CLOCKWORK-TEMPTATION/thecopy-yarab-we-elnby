import { openPersistentMemoryRuntime } from "./lib/persistent-memory/runtime";

async function main(): Promise<void> {
  const runtime = await openPersistentMemoryRuntime();
  if (!runtime.system) {
    console.log(
      JSON.stringify(
        {
          status: runtime.status,
          reason: runtime.reason,
          upserted: 0,
        },
        null,
        2,
      ),
    );
    return;
  }

  try {
    const result = await runtime.system.rebuildVectorIndex();
    console.log(JSON.stringify({ status: runtime.status, ...result }, null, 2));
  } finally {
    await runtime.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

