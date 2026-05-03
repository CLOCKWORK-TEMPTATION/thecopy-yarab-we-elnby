import { randomUUID } from "node:crypto";

import { PERSISTENT_MEMORY_SESSION_CLOSE_REPORT_PATH } from "./lib/constants";
import {
  FileRepairJournal,
  PostgresAgentSessionStore,
  PostgresRepairJournal,
  SessionCloseGate,
  isPersistentMemoryInfraRequired,
  renderSessionCloseReport,
} from "./lib/persistent-memory";
import { resolvePersistentMemoryDatabaseUrl } from "./lib/persistent-memory/database-url";
import { createPersistentMemorySqlClient } from "./lib/persistent-memory/postgres-store";
import { FileAgentSessionStore } from "./lib/persistent-memory/session-store";
import { fromRepoRoot, writeTextIfChanged } from "./lib/utils";

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) {
    return undefined;
  }

  return process.argv[index + 1];
}

function sessionId(): string {
  return readArg("--session") || process.env["PERSISTENT_MEMORY_SESSION_ID"] || "local-agent-session";
}

async function openStores(): Promise<{
  store: FileAgentSessionStore | PostgresAgentSessionStore;
  repairJournal: FileRepairJournal | PostgresRepairJournal;
  close(): Promise<void>;
}> {
  try {
    const client = await createPersistentMemorySqlClient(
      resolvePersistentMemoryDatabaseUrl(process.env, { defaultHost: "127.0.0.1" }),
    );
    return {
      store: new PostgresAgentSessionStore(client),
      repairJournal: new PostgresRepairJournal(client),
      async close() {
        await client.end?.();
      },
    };
  } catch (error) {
    if (isPersistentMemoryInfraRequired(process.env)) {
      throw error;
    }

    const store = new FileAgentSessionStore();
    const repairJournal = new FileRepairJournal();
    await store.hydrate();
    await repairJournal.hydrate();
    return {
      store,
      repairJournal,
      async close() {},
    };
  }
}

async function persistStores(
  store: FileAgentSessionStore | PostgresAgentSessionStore,
  repairJournal: FileRepairJournal | PostgresRepairJournal,
): Promise<void> {
  if (store instanceof FileAgentSessionStore) {
    await store.persist();
  }
  if (repairJournal instanceof FileRepairJournal) {
    await repairJournal.persist();
  }
}

async function main(): Promise<void> {
  const currentSessionId = sessionId();
  const { store, repairJournal, close } = await openStores();

  try {
    if (process.argv.includes("--start")) {
      await persistStores(store, repairJournal);
      console.log(JSON.stringify({ status: "started", sessionId: currentSessionId }, null, 2));
      return;
    }

    if (process.argv.includes("--append")) {
      const content = readArg("--content");
      const role = readArg("--role") || "user";
      if (!content) {
        throw new Error("--content is required for session append.");
      }
      await store.appendSessionItems(currentSessionId, [
        {
          id: randomUUID(),
          sessionId: currentSessionId,
          role: role === "assistant" ? "assistant" : "user",
          contentRef: readArg("--content-ref") || randomUUID(),
          content,
        },
      ]);
      await persistStores(store, repairJournal);
      console.log(JSON.stringify({ status: "appended", sessionId: currentSessionId }, null, 2));
      return;
    }

    if (process.argv.includes("--resume")) {
      console.log(
        JSON.stringify(
          {
            sessionId: currentSessionId,
            items: await store.getSessionItems(currentSessionId),
            turns: await store.listTurnRecords(currentSessionId),
          },
          null,
          2,
        ),
      );
      return;
    }

    if (process.argv.includes("--compact")) {
      await store.compactSession(currentSessionId);
      await persistStores(store, repairJournal);
      console.log(JSON.stringify({ status: "compacted", sessionId: currentSessionId }, null, 2));
      return;
    }

    const gate = new SessionCloseGate({ store, repairJournal });

    if (process.argv.includes("--repair")) {
      const report = await gate.repairMissingTurns(currentSessionId);
      await persistStores(store, repairJournal);
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    if (process.argv.includes("--close")) {
      await gate.repairMissingTurns(currentSessionId);
      const report = await gate.assertSessionClosable(currentSessionId);
      const rendered = renderSessionCloseReport(report);
      await writeTextIfChanged(
        fromRepoRoot(PERSISTENT_MEMORY_SESSION_CLOSE_REPORT_PATH),
        rendered,
      );
      await persistStores(store, repairJournal);
      console.log(rendered);
      return;
    }

    throw new Error("A session command flag is required.");
  } finally {
    await close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
