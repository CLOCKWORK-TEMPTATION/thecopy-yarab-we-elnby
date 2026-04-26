import { runCodeMemoryVerify } from "./lib/code-memory/commands";

runCodeMemoryVerify(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Code memory verify failed: ${message}`);
  process.exit(1);
});
