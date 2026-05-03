import { PERSISTENT_MEMORY_TURN_CONTEXT_PATH } from "../constants";
import { writeTextIfChanged } from "../utils";
import { MemoryInjectionEnvelope, type InjectionEnvelopePayload } from "./injection";
import { openPersistentMemoryRuntime } from "./runtime";
import type { PersistentMemorySystem } from "./index";
import type { QueryIntent } from "./types";

export interface TurnMemoryContext {
  status: "ready" | "degraded";
  reason?: string;
  query: string;
  selectedIntent: QueryIntent;
  retrievalEventId: string | null;
  auditEventId: string | null;
  envelope: InjectionEnvelopePayload;
}

export interface BuildTurnMemoryContextOptions {
  query: string;
  system?: PersistentMemorySystem;
  intent?: QueryIntent;
  topK?: number;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}

export function classifyTurnMemoryIntent(query: string): QueryIntent {
  const normalized = query.toLowerCase();

  if (/قرار|اتفق|اعتمد|نفذت|اكتمل|تم/.test(normalized)) {
    return "prior_decision_lookup";
  }
  if (/كرر|تكرار|نفس|قيد|ممنوع|لازم|احذر/.test(normalized)) {
    return "avoid_repetition_or_follow_constraints";
  }
  if (/فين|وصلت|حالة|دلوقتي|الآن|current/.test(normalized)) {
    return "current_state_lookup";
  }
  if (/كمل|استكمل|تابع|الجلسة|السابق/.test(normalized)) {
    return "continue_from_last_session";
  }
  if (/كود|نفذ|صلح|عدل|اختبار|بناء/.test(normalized)) {
    return "execution_or_code_change";
  }
  if (/قيّم|راجع|خطة|تقييم/.test(normalized)) {
    return "plan_review_or_evaluation";
  }

  return "default";
}

export async function buildTurnMemoryContext(
  options: BuildTurnMemoryContextOptions,
): Promise<TurnMemoryContext> {
  const query = options.query.trim();
  if (!query) {
    throw new Error("A current user question is required for live memory injection.");
  }

  const envelope = new MemoryInjectionEnvelope();
  const env = options.env ?? process.env;
  const intent = options.intent ?? classifyTurnMemoryIntent(query);
  const topK = options.topK ?? 5;
  const runtime = options.system ? null : await openPersistentMemoryRuntime(env);

  try {
    const system = options.system ?? runtime?.system;
    if (!system) {
      return {
        status: runtime?.status ?? "degraded",
        reason: runtime?.reason ?? "persistent memory runtime is unavailable",
        query,
        selectedIntent: intent,
        retrievalEventId: null,
        auditEventId: null,
        envelope: envelope.build({
          zone: "memory_context",
          memories: [],
        }),
      };
    }

    const result = await system.retrieve({ query, intent, topK });

    return {
      status: "ready",
      query,
      selectedIntent: result.selectedProfile,
      retrievalEventId: result.retrievalEventId,
      auditEventId: result.auditEventId,
      envelope: envelope.fromPersistentMemories("memory_context", result.hits),
    };
  } finally {
    await runtime?.close();
  }
}

export function renderTurnMemoryContext(context: TurnMemoryContext): string {
  const lines = [
    "# Persistent Memory Live Turn Context",
    "",
    `status: ${context.status}`,
    `zone: ${context.envelope.zone}`,
    `query: ${context.query}`,
    `selected_intent: ${context.selectedIntent}`,
    `retrieval_event_id: ${context.retrievalEventId ?? "none"}`,
    `audit_event_id: ${context.auditEventId ?? "none"}`,
  ];

  if (context.reason) {
    lines.push(`reason: ${context.reason}`);
  }

  lines.push("", "## Injected Memories", "");

  if (context.envelope.items.length === 0) {
    lines.push("- none");
  } else {
    for (const item of context.envelope.items) {
      lines.push(
        `- id: ${item.id}`,
        `  source_ref: ${item.sourceRef}`,
        `  trust_level: ${item.trustLevel}`,
        `  model_version: ${item.modelVersionId}`,
        `  text: ${formatTurnMemoryText(item.content)}`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

function formatTurnMemoryText(content: string): string {
  return content.replace(/\s+/g, " ").trim().slice(0, 500).trimEnd();
}

export async function writeTurnMemoryContext(
  context: TurnMemoryContext,
  outputPath = PERSISTENT_MEMORY_TURN_CONTEXT_PATH,
): Promise<boolean> {
  return writeTextIfChanged(outputPath, renderTurnMemoryContext(context));
}
