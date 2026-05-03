import { writeTextIfChanged } from "../utils";
import { MemoryInjectionEnvelope, type InjectionEnvelopePayload } from "./injection";
import { createPersistentMemorySystem, isPersistentMemoryInfraRequired, type PersistentMemorySystem } from "./index";
import { openPersistentMemoryRuntime } from "./runtime";
import type {
  MemoryRetrievalHit,
  PersistentMemoryEventType,
  QueryIntent,
} from "./types";

const STARTUP_QUERIES: Array<{ query: string; intent: QueryIntent }> = [
  {
    query: "live turn memory context before executive response",
    intent: "avoid_repetition_or_follow_constraints",
  },
];

const STARTUP_REQUIREMENT_QUERY =
  "قبل أول عمل أو رد تنفيذي سياق الذاكرة الدائمة محقون memory_context";

const STARTUP_MEMORY_REQUIREMENTS: Array<{
  path: string;
  eventType: PersistentMemoryEventType;
  content: string;
}> = [
  {
    path: "AGENTS.md",
    eventType: "decision",
    content:
      "قرار حاكم عالي الثقة: يجب أن يبدأ الوكيل من سياق الذاكرة الدائمة المولد قبل أول عمل أو رد تنفيذي، ولا يكفي وجود ملف الذاكرة بلا قراءة وحقن، ويجب بناء سياق سؤال حي قبل أي حكم تنفيذي.",
  },
  {
    path: ".repo-agent/STARTUP-PROTOCOL.md",
    eventType: "memory",
    content:
      "قيد بداية: يجب قراءة .repo-agent/PERSISTENT-MEMORY-CONTEXT.generated.md كسياق حاكم صغير فقط داخل memory_context، وسياق السؤال الحي الرسمي يجب أن يولد .repo-agent/PERSISTENT-MEMORY-TURN-CONTEXT.generated.md قبل الرد التنفيذي.",
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

export async function readStartupSources(): Promise<
  Array<{ path: string; eventType: PersistentMemoryEventType; content: string }>
> {
  return [...STARTUP_MEMORY_REQUIREMENTS];
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

function isFirstResponseStartupRequirement(hit: MemoryRetrievalHit): boolean {
  return (
    hit.sourceRef === "AGENTS.md" &&
    hit.content.includes("قبل أول عمل أو رد تنفيذي")
  );
}

function dedupeStartupMemories(hits: MemoryRetrievalHit[]): MemoryRetrievalHit[] {
  const hasHighTrustFirstResponseRequirement = hits.some(
    (hit) => isFirstResponseStartupRequirement(hit) && hit.trustLevel === "high",
  );
  const seen = new Set<string>();
  let keptFirstResponseRequirement = false;

  return hits.filter((hit) => {
    if (isFirstResponseStartupRequirement(hit)) {
      if (keptFirstResponseRequirement) {
        return false;
      }

      if (hasHighTrustFirstResponseRequirement && hit.trustLevel !== "high") {
        return false;
      }

      keptFirstResponseRequirement = true;
    }

    if (seen.has(hit.id)) {
      return false;
    }

    seen.add(hit.id);
    return true;
  });
}

function selectStartupRequirementMemories(
  hits: MemoryRetrievalHit[],
): MemoryRetrievalHit[] {
  return dedupeStartupMemories(
    hits.filter(
      (hit) =>
        hit.sourceRef === "AGENTS.md" ||
        hit.sourceRef === ".repo-agent/STARTUP-PROTOCOL.md",
    ),
  );
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

    if (!options.system) {
      await ingestStartupSources(system);
    }

    const query =
      options.query ?? STARTUP_QUERIES.map((entry) => entry.query).join(" ");
    const [requirements, primary] = await Promise.all([
      system.retrieve({
        query: STARTUP_REQUIREMENT_QUERY,
        intent: "avoid_repetition_or_follow_constraints",
        topK: 3,
      }),
      system.retrieve({
        query,
        intent: "continue_from_last_session",
        topK: 8,
      }),
    ]);
    const memories = selectStartupRequirementMemories([
      ...requirements.hits,
      ...primary.hits,
    ]).slice(0, 3);
    const degraded = !options.system && runtime?.status === "degraded";

    return {
      status: degraded ? "degraded" : "ready",
      reason: degraded ? runtime?.reason : undefined,
      retrievalEventId: requirements.retrievalEventId,
      auditEventId: requirements.auditEventId,
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

