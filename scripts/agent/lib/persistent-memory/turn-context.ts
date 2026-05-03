import { PERSISTENT_MEMORY_TURN_CONTEXT_PATH } from "../constants";
import { sha256, writeTextIfChanged } from "../utils";
import { MemoryInjectionEnvelope, type InjectionEnvelopePayload } from "./injection";
import { createPersistentMemorySystem } from "./index";
import { elapsedMs, nowMs } from "./metrics";
import { openPersistentMemoryRuntime } from "./runtime";
import { MemorySecretScanner } from "./secrets";
import type { PersistentMemorySystem } from "./index";
import type { MemoryRetrievalHit, QueryIntent, SecretScanStatus } from "./types";

export interface TurnMemoryContext {
  turnContextStatus: "ready" | "degraded";
  status: "ready" | "degraded";
  reason?: string;
  queryHash: string;
  redactedQueryPreview: string;
  secretScanStatus: SecretScanStatus;
  selectedIntent: QueryIntent;
  selectedProfile: QueryIntent;
  retrievalEventId: string | null;
  auditEventId: string | null;
  latencyMs: number;
  degradationReason?: string;
  repairJobId?: string;
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

  if (/كود|نفذ|صلح|عدل|اختبار|بناء/.test(normalized)) {
    return "execution_or_code_change";
  }
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
  if (/قيّم|راجع|خطة|تقييم/.test(normalized)) {
    return "plan_review_or_evaluation";
  }

  return "default";
}

function buildQueryPreview(query: string, clean: boolean): string {
  if (!clean) {
    return `redacted:${sha256(query).slice(0, 16)}`;
  }

  return query.replace(/\s+/g, " ").trim().slice(0, 160).trimEnd();
}

async function buildFallbackSystem(): Promise<PersistentMemorySystem> {
  const system = createPersistentMemorySystem();
  await system.ingestRawEvent({
    sourceRef: "AGENTS.md",
    eventType: "decision",
    content:
      "قرار حاكم عالي الثقة: عند تدهور بنية الذاكرة الدائمة يستخدم الوكيل أسرع سياق آمن متاح ولا يحقن خارج memory_context.",
    tags: ["startup", "fallback", "governing"],
  });
  await system.ingestRawEvent({
    sourceRef: ".repo-agent/STARTUP-PROTOCOL.md",
    eventType: "memory",
    content:
      "قيد تشغيل: يجب بناء سياق سؤال حي يتضمن query_hash وretrieval_event_id وaudit_event_id قبل الحكم التنفيذي.",
    tags: ["turn", "context", "governing"],
  });
  return system;
}

function isBroadOperationalSnapshot(hit: MemoryRetrievalHit): boolean {
  return (
    (hit.sourceRef === "output/round-notes.md" ||
      hit.sourceRef === "output/session-state.md") &&
    hit.content.length > 800
  );
}

function isAllowedForIntent(hit: MemoryRetrievalHit, intent: QueryIntent): boolean {
  if (hit.quarantined || hit.injectionProbability >= 0.7) {
    return false;
  }

  if (
    isBroadOperationalSnapshot(hit) &&
    intent !== "current_state_lookup" &&
    intent !== "continue_from_last_session"
  ) {
    return false;
  }

  if (intent === "prior_decision_lookup") {
    return hit.memoryType === "decision" || hit.memoryType === "memory";
  }

  if (intent === "avoid_repetition_or_follow_constraints") {
    return (
      hit.memoryType === "memory" ||
      hit.memoryType === "decision" ||
      hit.memoryType === "fact"
    );
  }

  return true;
}

export async function buildTurnMemoryContext(
  options: BuildTurnMemoryContextOptions,
): Promise<TurnMemoryContext> {
  const startedAt = nowMs();
  const query = options.query.trim();
  if (!query) {
    throw new Error("A current user question is required for live memory injection.");
  }

  const envelope = new MemoryInjectionEnvelope();
  const scanner = new MemorySecretScanner();
  const scan = scanner.scan(query);
  const queryHash = sha256(query);
  const redactedQueryPreview = buildQueryPreview(query, scan.clean);
  const retrievalQuery = scan.clean ? query : redactedQueryPreview;
  const env = options.env ?? process.env;
  const intent = options.intent ?? classifyTurnMemoryIntent(query);
  const topK = options.topK ?? 5;
  const runtime = options.system ? null : await openPersistentMemoryRuntime(env);

  try {
    const system = options.system ?? runtime?.system ?? (await buildFallbackSystem());

    let result = await system.retrieve({ query: retrievalQuery, intent, topK });
    let hits = result.hits.filter((hit) => isAllowedForIntent(hit, intent));
    if (hits.length === 0 && !options.system) {
      const fallback = await buildFallbackSystem();
      result = await fallback.retrieve({ query: retrievalQuery, intent, topK });
      hits = result.hits.filter((hit) => isAllowedForIntent(hit, intent));
    }
    const degraded = !options.system && runtime?.status === "degraded";

    return {
      turnContextStatus: degraded ? "degraded" : "ready",
      status: degraded ? "degraded" : "ready",
      reason: degraded ? runtime?.reason : undefined,
      queryHash,
      redactedQueryPreview,
      secretScanStatus: scan.clean ? "clean" : "rejected",
      selectedIntent: intent,
      selectedProfile: result.selectedProfile,
      retrievalEventId: result.retrievalEventId,
      auditEventId: result.auditEventId,
      latencyMs: result.latencyMs || elapsedMs(startedAt),
      degradationReason: degraded ? runtime?.reason : undefined,
      envelope: envelope.fromPersistentMemories("memory_context", hits),
    };
  } finally {
    await runtime?.close();
  }
}

export function renderTurnMemoryContext(context: TurnMemoryContext): string {
  const lines = [
    "# Persistent Memory Live Turn Context",
    "",
    `turn_context_status: ${context.turnContextStatus}`,
    `status: ${context.status}`,
    `zone: ${context.envelope.zone}`,
    `query_hash: ${context.queryHash}`,
    `redacted_query_preview: ${context.redactedQueryPreview}`,
    `secret_scan_status: ${context.secretScanStatus}`,
    `selected_intent: ${context.selectedIntent}`,
    `selected_profile: ${context.selectedProfile}`,
    `retrieval_event_id: ${context.retrievalEventId ?? "none"}`,
    `audit_event_id: ${context.auditEventId ?? "none"}`,
    `latency_ms: ${context.latencyMs}`,
  ];

  lines.push(
    `degradation_reason: ${context.degradationReason ?? context.reason ?? "none"}`,
    `repair_job_id: ${context.repairJobId ?? "none"}`,
  );

  lines.push("", "memory_context:", "");

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
