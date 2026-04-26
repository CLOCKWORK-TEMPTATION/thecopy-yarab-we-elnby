import { runCodeMemoryStatus } from "./lib/code-memory/commands";

runCodeMemoryStatus(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Code memory status failed: ${message}`);
  process.exit(1);
});
