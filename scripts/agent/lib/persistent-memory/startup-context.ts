import { promises as fsp } from "node:fs";

import { ROUND_NOTES_PATH, SESSION_STATE_PATH } from "../constants";
import { fromRepoRoot, writeTextIfChanged } from "../utils";
import { MemoryInjectionEnvelope, type InjectionEnvelopePayload } from "./injection";
import { createPersistentMemorySystem, isPersistentMemoryInfraRequired, type PersistentMemorySystem } from "./index";
import { openPersistentMemoryRuntime } from "./runtime";
import type { QueryIntent } from "./types";

const STARTUP_QUERIES: Array<{ query: string; intent: QueryIntent }> = [
  {
    query: "previous decisions persistent memory source of truth",
    intent: "prior_decision_lookup",
  },
  {
    query: "continue from last session current state constraints",
    intent: "continue_from_last_session",
  },
  {
    query: "avoid repetition follow constraints do not repeat",
    intent: "avoid_repetition_or_follow_constraints",
  },
  {
    query: "current state persistent-agent-memory",
    intent: "current_state_lookup",
  },
];

export interface StartupMemoryContext {
  status: "ready" | "degraded";
  reason?: string;
  retrievalEventId: string | null;
  auditEventId: string | null;
  envelope: InjectionEnvelopePayload;
}

export interface BuildStartupMemoryContextOptions {
  system?: PersistentMemorySystem;
  query?: string;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}

async function readStartupSources(): Promise<Array<{ path: string; eventType: "state_snapshot" | "round"; content: string }>> {
  return [
    {
      path: SESSION_STATE_PATH,
      eventType: "state_snapshot",
      content: await fsp.readFile(fromRepoRoot(SESSION_STATE_PATH), "utf8"),
    },
    {
      path: ROUND_NOTES_PATH,
      eventType: "round",
      content: await fsp.readFile(fromRepoRoot(ROUND_NOTES_PATH), "utf8"),
    },
  ];
}

async function ingestStartupSources(system: PersistentMemorySystem): Promise<void> {
  for (const source of await readStartupSources()) {
    await system.ingestRawEvent({
      sourceRef: source.path,
      eventType: source.eventType,
      content: source.content,
      tags: ["agent-startup", "persistent-memory"],
    });
  }
}

export async function buildStartupMemoryContext(
  options: BuildStartupMemoryContextOptions = {},
): Promise<StartupMemoryContext> {
  const envelope = new MemoryInjectionEnvelope();
  let runtime: Awaited<ReturnType<typeof openPersistentMemoryRuntime>> | null = null;
  const env = options.env ?? process.env;

  try {
    const system =
      options.system ??
      (runtime = await openPersistentMemoryRuntime(env)).system ??
      createPersistentMemorySystem();

    if (!options.system && runtime?.status === "degraded") {
      return {
        status: "degraded",
        reason: runtime.reason ?? "persistent memory runtime is degraded",
        retrievalEventId: null,
        auditEventId: null,
        envelope: envelope.build({
          zone: "memory_context",
          memories: [],
        }),
      };
    }

    if (!options.system) {
      await ingestStartupSources(system);
    }

    const query = options.query ?? STARTUP_QUERIES.map((entry) => entry.query).join(" ");
    const primary = await system.retrieve({
      query,
      intent: "continue_from_last_session",
      topK: 8,
    });
    const seen = new Set<string>();
    const memories = primary.hits.filter((hit) => {
      if (seen.has(hit.id)) {
        return false;
      }
      seen.add(hit.id);
      return true;
    });

    return {
      status: "ready",
      retrievalEventId: primary.retrievalEventId,
      auditEventId: primary.auditEventId,
      envelope: envelope.fromPersistentMemories("memory_context", memories),
    };
  } catch (error) {
    if (isPersistentMemoryInfraRequired(env)) {
      throw error;
    }

    return {
      status: "degraded",
      reason: error instanceof Error ? error.message : String(error),
      retrievalEventId: null,
      auditEventId: null,
      envelope: envelope.build({
        zone: "memory_context",
        memories: [],
      }),
    };
  } finally {
    await runtime?.close();
  }
}

export function renderStartupMemoryContext(context: StartupMemoryContext): string {
  const lines = [
    "# Persistent Memory Startup Context",
    "",
    `status: ${context.status}`,
  ];

  if (context.reason) {
    lines.push(`reason: ${context.reason}`);
  }

  lines.push(
    `zone: ${context.envelope.zone}`,
    `retrieval_event_id: ${context.retrievalEventId ?? "none"}`,
    `audit_event_id: ${context.auditEventId ?? "none"}`,
    "",
    "## Injected Memories",
    "",
  );

  if (context.envelope.items.length === 0) {
    lines.push("- none");
  } else {
    for (const item of context.envelope.items) {
      lines.push(
        `- id: ${item.id}`,
        `  source_ref: ${item.sourceRef}`,
        `  trust_level: ${item.trustLevel}`,
        `  model_version: ${item.modelVersionId}`,
        `  text: ${formatInjectedMemoryText(item.content)}`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

function formatInjectedMemoryText(content: string): string {
  return content.replace(/\s+/g, " ").trim().slice(0, 500).trimEnd();
}

export async function writeStartupMemoryContext(
  outputPath: string,
  context: StartupMemoryContext,
): Promise<boolean> {
  return writeTextIfChanged(outputPath, renderStartupMemoryContext(context));
}

