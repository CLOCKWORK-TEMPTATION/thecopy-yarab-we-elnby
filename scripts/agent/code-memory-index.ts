import { runCodeMemoryIndex } from "./lib/code-memory/commands";

runCodeMemoryIndex(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Code memory index failed: ${message}`);
  process.exit(1);
});
