import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { PERSISTENT_MEMORY_TURN_CONTEXT_PATH } from "./lib/constants";
import { FileAgentSessionStore } from "./lib/persistent-memory/session-store";
import {
  buildTurnMemoryContext,
  renderTurnMemoryContext,
  writeTurnMemoryContext,
} from "./lib/persistent-memory/turn-context";
import { MemorySecretScanner } from "./lib/persistent-memory/secrets";
import { fromRepoRoot } from "./lib/utils";

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) {
    return undefined;
  }

  return process.argv[index + 1];
}

function assertTurnContextFile(): void {
  const content = readFileSync(fromRepoRoot(PERSISTENT_MEMORY_TURN_CONTEXT_PATH), "utf8");
  const required = [
    "turn_context_status:",
    "query_hash:",
    "selected_intent:",
    "retrieval_event_id:",
    "audit_event_id:",
    "memory_context:",
  ];
  const missing = required.filter((field) => !content.includes(field));
  if (missing.length > 0) {
    throw new Error(`Live turn context is missing fields: ${missing.join(", ")}`);
  }
}

async function runBuild(): Promise<void> {
  const query = readArg("--query");
  if (!query?.trim()) {
    throw new Error("--query is required for live turn memory context.");
  }

  const context = await buildTurnMemoryContext({ query });
  await writeTurnMemoryContext(context);

  const scanner = new MemorySecretScanner();
  const scan = scanner.scan(query);
  const sessionId =
    readArg("--session") || process.env["PERSISTENT_MEMORY_SESSION_ID"] || "local-agent-session";
  const turnId = readArg("--turn") || randomUUID();
  const store = new FileAgentSessionStore();
  await store.hydrate();
  await store.markTurnStarted(turnId, {
    sessionId,
    rawQueryForRepair: scan.clean ? query : undefined,
    queryHash: context.queryHash,
    redactedQueryPreview: context.redactedQueryPreview,
  });
  await store.markTurnContextBuilt(turnId, context);
  await store.persist();

  console.log(renderTurnMemoryContext(context));
}

async function main(): Promise<void> {
  if (process.argv.includes("--verify")) {
    assertTurnContextFile();
    console.log("live turn context verification passed");
    return;
  }

  if (process.argv.includes("--repair") && !readArg("--query")) {
    assertTurnContextFile();
    console.log("live turn context repair found an existing valid context");
    return;
  }

  await runBuild();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
