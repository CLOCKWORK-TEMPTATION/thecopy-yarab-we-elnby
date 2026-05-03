import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

import { fromRepoRoot } from "../utils";
import type {
  AgentSessionItem,
  AgentSessionStore,
  AgentTurnRecord,
  CompactSessionOptions,
  MarkTurnStartedInput,
} from "./session-store";
import type {
  RepairJob,
  RepairJobInput,
  RepairJournal,
} from "./repair-journal";
import type {
  AuditLogEntry,
  ConsolidationLogEntry,
  EmbeddingModelVersion,
  InjectionQuarantineRecord,
  JobRun,
  MemoryCandidate,
  PersistentMemoryRecord,
  PersistentMemoryStore,
  PersistentRawEvent,
  RetrievalEvent,
  SecretScanEvent,
} from "./types";
import type { TurnMemoryContext } from "./turn-context";

interface QueryResult<T> {
  rows: T[];
}

interface SqlClient {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: unknown[],
  ): Promise<QueryResult<T>>;
  end?(): Promise<void>;
}

interface PgPoolConstructor {
  new (options: {
    connectionString: string;
    connectionTimeoutMillis?: number;
  }): SqlClient;
}

interface PgModule {
  Pool: PgPoolConstructor;
}

type MemoryRow = {
  id: string;
  candidate_id: string;
  source_ref: string;
  content_hash: string;
  content: string;
  memory_type: string;
  tags: string[];
  trust_level: "low" | "medium" | "high";
  model_version_id: string;
  injection_probability: number;
  updated_at: string | Date;
  created_at: string | Date;
};

type SessionItemRow = {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content_ref: string;
  content: string;
  tags: string[] | null;
  created_at: string | Date;
};

type TurnContextRow = {
  turn_id: string;
  session_id: string;
  query_hash: string | null;
  redacted_query_preview: string | null;
  turn_context_status: "ready" | "degraded" | null;
  selected_intent: string | null;
  selected_profile: string | null;
  retrieval_event_id: string | null;
  audit_event_id: string | null;
  memory_context: string | null;
  latency_ms: number | null;
  answer_ref: string | null;
  closed: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type RepairJobRow = {
  id: string;
  session_id: string;
  turn_id: string | null;
  kind: RepairJob["kind"];
  status: RepairJob["status"];
  reason: string;
  metadata: Record<string, unknown> | null;
  created_at: string | Date;
  updated_at: string | Date;
};

function now(): string {
  return new Date().toISOString();
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function jsonArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  return {};
}

function rowToSessionItem(row: SessionItemRow): AgentSessionItem {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    contentRef: row.content_ref,
    content: row.content,
    tags: jsonArray(row.tags),
    createdAt: toIso(row.created_at),
  };
}

function rowToTurnRecord(row: TurnContextRow): AgentTurnRecord {
  const metadata = jsonObject(row.metadata);
  return {
    turnId: row.turn_id,
    sessionId: row.session_id,
    rawQueryForRepair:
      typeof metadata["rawQueryForRepair"] === "string"
        ? metadata["rawQueryForRepair"]
        : undefined,
    queryHash: row.query_hash ?? undefined,
    redactedQueryPreview: row.redacted_query_preview ?? undefined,
    turnContextStatus: row.turn_context_status ?? undefined,
    selectedIntent: row.selected_intent ?? undefined,
    selectedProfile: row.selected_profile ?? undefined,
    retrievalEventId: row.retrieval_event_id,
    auditEventId: row.audit_event_id,
    memoryContext: row.memory_context ?? undefined,
    latencyMs: row.latency_ms ?? undefined,
    answerRef: row.answer_ref ?? undefined,
    closed: row.closed,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function turnContextMemoryRef(context: TurnMemoryContext): string {
  return (
    context.envelope.items
      .map((item) => `${item.sourceRef}:${item.id}`)
      .join("\n") || "none"
  );
}

function rowToRepairJob(row: RepairJobRow): RepairJob {
  return {
    id: row.id,
    sessionId: row.session_id,
    turnId: row.turn_id ?? undefined,
    kind: row.kind,
    status: row.status,
    reason: row.reason,
    metadata: jsonObject(row.metadata),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function loadPgModule(): PgModule {
  const requireFromBackend = createRequire(
    fromRepoRoot("apps/backend/package.json"),
  );
  return requireFromBackend("pg") as PgModule;
}

export async function createPersistentMemorySqlClient(
  databaseUrl = process.env.DATABASE_URL,
): Promise<SqlClient> {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for persistent memory storage.");
  }

  const pg = loadPgModule();
  const client = new pg.Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 1000,
  });
  await ensurePersistentMemorySchema(client);
  return client;
}

export async function ensurePersistentMemorySchema(
  client: SqlClient,
): Promise<void> {
  await client.query(`CREATE SCHEMA IF NOT EXISTS persistent_agent_memory`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.model_versions (
      id text PRIMARY KEY,
      provider text NOT NULL,
      model text NOT NULL,
      version text NOT NULL,
      dimensions integer,
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'persistent_agent_memory'
          AND table_name = 'model_versions'
          AND column_name = 'id'
          AND udt_name = 'uuid'
      ) THEN
        ALTER TABLE persistent_agent_memory.model_versions
          ALTER COLUMN id TYPE text USING id::text;
      END IF;
    END $$;
  `);
  await client.query(`
    ALTER TABLE persistent_agent_memory.model_versions
      ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'unknown',
      ADD COLUMN IF NOT EXISTS model text NOT NULL DEFAULT 'unknown',
      ADD COLUMN IF NOT EXISTS version text NOT NULL DEFAULT 'unknown',
      ADD COLUMN IF NOT EXISTS dimensions integer,
      ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS model_versions_provider_model_version_unique
      ON persistent_agent_memory.model_versions (provider, model, version)
  `);
  await client.query(`
    DROP INDEX IF EXISTS persistent_agent_memory.model_versions_role_name_version_unique
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.sessions (
      id uuid PRIMARY KEY,
      thread_id text NOT NULL,
      status text NOT NULL DEFAULT 'active',
      metadata jsonb NOT NULL DEFAULT '{}',
      started_at timestamptz NOT NULL DEFAULT now(),
      ended_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.rounds (
      id uuid PRIMARY KEY,
      session_id uuid,
      round_index integer NOT NULL,
      summary text,
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.references (
      id uuid PRIMARY KEY,
      source_ref text NOT NULL,
      source_type text NOT NULL,
      content_hash text NOT NULL,
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.raw_events (
      id uuid PRIMARY KEY,
      source_ref text NOT NULL,
      event_type text NOT NULL,
      content_hash text NOT NULL,
      sanitized_content text,
      secret_scan_status text NOT NULL,
      rejected_reason text,
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    ALTER TABLE persistent_agent_memory.raw_events
      ADD COLUMN IF NOT EXISTS sanitized_content text,
      ADD COLUMN IF NOT EXISTS secret_scan_status text NOT NULL DEFAULT 'clean',
      ADD COLUMN IF NOT EXISTS rejected_reason text,
      DROP COLUMN IF EXISTS raw_text
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.secret_scan_events (
      id uuid PRIMARY KEY,
      source_ref text NOT NULL,
      event_type text NOT NULL,
      content_hash text NOT NULL,
      scanner_name text NOT NULL,
      scanner_version text NOT NULL,
      status text NOT NULL,
      matched_rule_ids jsonb NOT NULL DEFAULT '[]',
      redacted_preview text NOT NULL,
      action_taken text NOT NULL,
      redacted_metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    ALTER TABLE persistent_agent_memory.secret_scan_events
      ADD COLUMN IF NOT EXISTS scanner_name text NOT NULL DEFAULT 'memory-secret-scanner',
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'clean',
      ADD COLUMN IF NOT EXISTS matched_rule_ids jsonb NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS redacted_preview text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS action_taken text NOT NULL DEFAULT 'stored',
      ADD COLUMN IF NOT EXISTS redacted_metadata jsonb NOT NULL DEFAULT '{}'
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.memory_candidates (
      id uuid PRIMARY KEY,
      raw_event_id uuid NOT NULL,
      source_ref text NOT NULL,
      content_hash text NOT NULL,
      content text NOT NULL,
      candidate_type text NOT NULL,
      tags jsonb NOT NULL DEFAULT '[]',
      model_version_id text NOT NULL,
      injection_probability real NOT NULL DEFAULT 0,
      trust_level text NOT NULL DEFAULT 'medium',
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.memories (
      id uuid PRIMARY KEY,
      candidate_id uuid,
      source_ref text NOT NULL,
      content_hash text NOT NULL,
      content text NOT NULL,
      memory_type text NOT NULL,
      tags jsonb NOT NULL DEFAULT '[]',
      trust_level text NOT NULL DEFAULT 'medium',
      model_version_id text NOT NULL,
      injection_probability real NOT NULL DEFAULT 0,
      archived boolean NOT NULL DEFAULT false,
      quarantined boolean NOT NULL DEFAULT false,
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    ALTER TABLE persistent_agent_memory.memories
      ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS quarantined boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.decisions (
      id uuid PRIMARY KEY,
      memory_id uuid,
      title text NOT NULL,
      status text NOT NULL DEFAULT 'accepted',
      rationale text,
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.state_snapshots (
      id uuid PRIMARY KEY,
      round_id uuid,
      content_hash text NOT NULL,
      payload jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.state_deltas (
      id uuid PRIMARY KEY,
      snapshot_id uuid,
      delta jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.fact_versions (
      id uuid PRIMARY KEY,
      memory_id uuid,
      fact_key text NOT NULL,
      fact_value text NOT NULL,
      valid_from timestamptz NOT NULL DEFAULT now(),
      valid_to timestamptz,
      superseded_by uuid,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.retrieval_events (
      id uuid PRIMARY KEY,
      query text NOT NULL,
      intent text NOT NULL,
      selected_profile text,
      result_memory_ids jsonb NOT NULL DEFAULT '[]',
      scores jsonb NOT NULL DEFAULT '{}',
      reranker_used boolean NOT NULL DEFAULT false,
      latency_ms integer NOT NULL DEFAULT 0,
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    ALTER TABLE persistent_agent_memory.retrieval_events
      ADD COLUMN IF NOT EXISTS selected_profile text,
      ADD COLUMN IF NOT EXISTS scores jsonb NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS reranker_used boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS latency_ms integer NOT NULL DEFAULT 0
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.injection_events (
      id uuid PRIMARY KEY,
      retrieval_event_id uuid,
      zone text NOT NULL,
      memory_ids jsonb NOT NULL DEFAULT '[]',
      rejected boolean NOT NULL DEFAULT false,
      reason text,
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.audit_log (
      id uuid PRIMARY KEY,
      action text NOT NULL,
      source_ref text,
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.job_runs (
      id uuid PRIMARY KEY,
      job_type text NOT NULL,
      status text NOT NULL DEFAULT 'queued',
      payload jsonb NOT NULL DEFAULT '{}',
      attempts integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.dead_letter_jobs (
      id uuid PRIMARY KEY,
      job_run_id uuid,
      reason text NOT NULL,
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.session_items (
      id text PRIMARY KEY,
      session_id text NOT NULL,
      role text NOT NULL,
      content_ref text NOT NULL,
      content text NOT NULL,
      tags jsonb NOT NULL DEFAULT '[]',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.turn_context_records (
      turn_id text PRIMARY KEY,
      session_id text NOT NULL,
      query_hash text,
      redacted_query_preview text,
      turn_context_status text,
      selected_intent text,
      selected_profile text,
      retrieval_event_id text,
      audit_event_id text,
      memory_context text,
      latency_ms integer,
      answer_ref text,
      closed boolean NOT NULL DEFAULT false,
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.repair_journal (
      id uuid PRIMARY KEY,
      session_id text NOT NULL,
      turn_id text,
      kind text NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      reason text NOT NULL,
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.injection_quarantine (
      id uuid PRIMARY KEY,
      memory_id uuid NOT NULL,
      reason text NOT NULL,
      source_ref text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.consolidation_log (
      id uuid PRIMARY KEY,
      source_memory_ids jsonb NOT NULL DEFAULT '[]',
      result_memory_id uuid,
      action text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export class PostgresAgentSessionStore implements AgentSessionStore {
  constructor(private readonly client: SqlClient) {}

  async getSessionItems(sessionId: string): Promise<AgentSessionItem[]> {
    const result = await this.client.query<SessionItemRow>(
      `SELECT id, session_id, role, content_ref, content, tags, created_at
       FROM persistent_agent_memory.session_items
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId],
    );
    return result.rows.map(rowToSessionItem);
  }

  async appendSessionItems(
    sessionId: string,
    items: AgentSessionItem[],
  ): Promise<void> {
    for (const item of items) {
      await this.client.query(
        `INSERT INTO persistent_agent_memory.session_items
         (id, session_id, role, content_ref, content, tags, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           session_id = EXCLUDED.session_id,
           role = EXCLUDED.role,
           content_ref = EXCLUDED.content_ref,
           content = EXCLUDED.content,
           tags = EXCLUDED.tags`,
        [
          item.id,
          sessionId,
          item.role,
          item.contentRef,
          item.content,
          JSON.stringify(item.tags ?? []),
          item.createdAt ?? now(),
        ],
      );
    }
  }

  async getRecentTurns(
    sessionId: string,
    limit: number,
  ): Promise<AgentSessionItem[]> {
    const result = await this.client.query<SessionItemRow>(
      `SELECT id, session_id, role, content_ref, content, tags, created_at
       FROM persistent_agent_memory.session_items
       WHERE session_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [sessionId, limit],
    );
    return result.rows.map(rowToSessionItem).reverse();
  }

  async markTurnStarted(
    turnId: string,
    input: MarkTurnStartedInput,
  ): Promise<AgentTurnRecord> {
    const timestamp = now();
    const metadata = {
      rawQueryForRepair: input.rawQueryForRepair,
    };
    const result = await this.client.query<TurnContextRow>(
      `INSERT INTO persistent_agent_memory.turn_context_records
       (turn_id, session_id, query_hash, redacted_query_preview, turn_context_status,
        selected_intent, selected_profile, retrieval_event_id, audit_event_id,
        memory_context, latency_ms, answer_ref, closed, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, $5, $6, $6)
       ON CONFLICT (turn_id) DO UPDATE SET
         session_id = EXCLUDED.session_id,
         query_hash = COALESCE(EXCLUDED.query_hash, persistent_agent_memory.turn_context_records.query_hash),
         redacted_query_preview = COALESCE(EXCLUDED.redacted_query_preview, persistent_agent_memory.turn_context_records.redacted_query_preview),
         metadata = persistent_agent_memory.turn_context_records.metadata || EXCLUDED.metadata,
         updated_at = EXCLUDED.updated_at
       RETURNING turn_id, session_id, query_hash, redacted_query_preview, turn_context_status,
         selected_intent, selected_profile, retrieval_event_id, audit_event_id, memory_context,
         latency_ms, answer_ref, closed, metadata, created_at, updated_at`,
      [
        turnId,
        input.sessionId,
        input.queryHash ?? null,
        input.redactedQueryPreview ?? null,
        JSON.stringify(metadata),
        timestamp,
      ],
    );
    return rowToTurnRecord(result.rows[0]);
  }

  async markTurnContextBuilt(
    turnId: string,
    context: TurnMemoryContext,
  ): Promise<AgentTurnRecord> {
    const result = await this.client.query<TurnContextRow>(
      `UPDATE persistent_agent_memory.turn_context_records
       SET query_hash = $1,
           redacted_query_preview = $2,
           turn_context_status = $3,
           selected_intent = $4,
           selected_profile = $5,
           retrieval_event_id = $6,
           audit_event_id = $7,
           memory_context = $8,
           latency_ms = $9,
           updated_at = $10
       WHERE turn_id = $11
       RETURNING turn_id, session_id, query_hash, redacted_query_preview, turn_context_status,
         selected_intent, selected_profile, retrieval_event_id, audit_event_id, memory_context,
         latency_ms, answer_ref, closed, metadata, created_at, updated_at`,
      [
        context.queryHash,
        context.redactedQueryPreview,
        context.turnContextStatus,
        context.selectedIntent,
        context.selectedProfile,
        context.retrievalEventId,
        context.auditEventId,
        turnContextMemoryRef(context),
        context.latencyMs,
        now(),
        turnId,
      ],
    );
    if (result.rows.length === 0) {
      throw new Error(`Turn does not exist: ${turnId}`);
    }
    return rowToTurnRecord(result.rows[0]);
  }

  async markTurnAnswered(
    turnId: string,
    answerRef: string,
  ): Promise<AgentTurnRecord> {
    const result = await this.client.query<TurnContextRow>(
      `UPDATE persistent_agent_memory.turn_context_records
       SET answer_ref = $1,
           updated_at = $2
       WHERE turn_id = $3
       RETURNING turn_id, session_id, query_hash, redacted_query_preview, turn_context_status,
         selected_intent, selected_profile, retrieval_event_id, audit_event_id, memory_context,
         latency_ms, answer_ref, closed, metadata, created_at, updated_at`,
      [answerRef, now(), turnId],
    );
    if (result.rows.length === 0) {
      throw new Error(`Turn does not exist: ${turnId}`);
    }
    return rowToTurnRecord(result.rows[0]);
  }

  async markTurnClosed(turnId: string): Promise<AgentTurnRecord> {
    const result = await this.client.query<TurnContextRow>(
      `UPDATE persistent_agent_memory.turn_context_records
       SET closed = true,
           updated_at = $1
       WHERE turn_id = $2
       RETURNING turn_id, session_id, query_hash, redacted_query_preview, turn_context_status,
         selected_intent, selected_profile, retrieval_event_id, audit_event_id, memory_context,
         latency_ms, answer_ref, closed, metadata, created_at, updated_at`,
      [now(), turnId],
    );
    if (result.rows.length === 0) {
      throw new Error(`Turn does not exist: ${turnId}`);
    }
    return rowToTurnRecord(result.rows[0]);
  }

  async findIncompleteTurns(sessionId: string): Promise<AgentTurnRecord[]> {
    return (await this.listTurnRecords(sessionId)).filter(
      (turn) =>
        !turn.turnContextStatus ||
        !turn.queryHash ||
        !turn.selectedIntent ||
        !turn.retrievalEventId ||
        !turn.auditEventId ||
        !turn.memoryContext,
    );
  }

  async getTurnContextRecord(
    turnId: string,
  ): Promise<AgentTurnRecord | undefined> {
    const result = await this.client.query<TurnContextRow>(
      `SELECT turn_id, session_id, query_hash, redacted_query_preview, turn_context_status,
              selected_intent, selected_profile, retrieval_event_id, audit_event_id,
              memory_context, latency_ms, answer_ref, closed, metadata, created_at, updated_at
       FROM persistent_agent_memory.turn_context_records
       WHERE turn_id = $1`,
      [turnId],
    );
    return result.rows[0] ? rowToTurnRecord(result.rows[0]) : undefined;
  }

  async listTurnRecords(sessionId: string): Promise<AgentTurnRecord[]> {
    const result = await this.client.query<TurnContextRow>(
      `SELECT turn_id, session_id, query_hash, redacted_query_preview, turn_context_status,
              selected_intent, selected_profile, retrieval_event_id, audit_event_id,
              memory_context, latency_ms, answer_ref, closed, metadata, created_at, updated_at
       FROM persistent_agent_memory.turn_context_records
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId],
    );
    return result.rows.map(rowToTurnRecord);
  }

  async compactSession(
    sessionId: string,
    options: CompactSessionOptions = {},
  ): Promise<void> {
    const keepLast = options.keepLast ?? 20;
    const items = await this.getSessionItems(sessionId);
    const protectedIds = new Set(
      items
        .filter((item) =>
          item.tags?.some((tag) => tag === "decision" || tag === "constraint"),
        )
        .map((item) => item.id),
    );
    const recentIds = new Set(items.slice(-keepLast).map((item) => item.id));
    const keepIds = [...new Set([...protectedIds, ...recentIds])];

    if (keepIds.length === 0) {
      await this.client.query(
        `DELETE FROM persistent_agent_memory.session_items
         WHERE session_id = $1`,
        [sessionId],
      );
      return;
    }

    await this.client.query(
      `DELETE FROM persistent_agent_memory.session_items
       WHERE session_id = $1
         AND NOT (id = ANY($2::text[]))`,
      [sessionId, keepIds],
    );
  }
}

export class PostgresRepairJournal implements RepairJournal {
  constructor(private readonly client: SqlClient) {}

  async enqueue(job: RepairJobInput): Promise<RepairJob> {
    const timestamp = now();
    const result = await this.client.query<RepairJobRow>(
      `INSERT INTO persistent_agent_memory.repair_journal
       (id, session_id, turn_id, kind, status, reason, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $7)
       RETURNING id, session_id, turn_id, kind, status, reason, metadata, created_at, updated_at`,
      [
        randomUUID(),
        job.sessionId,
        job.turnId ?? null,
        job.kind,
        job.reason,
        JSON.stringify(job.metadata ?? {}),
        timestamp,
      ],
    );
    return rowToRepairJob(result.rows[0]);
  }

  async markCompleted(jobId: string): Promise<RepairJob> {
    const result = await this.client.query<RepairJobRow>(
      `UPDATE persistent_agent_memory.repair_journal
       SET status = 'completed',
           updated_at = $1
       WHERE id = $2
       RETURNING id, session_id, turn_id, kind, status, reason, metadata, created_at, updated_at`,
      [now(), jobId],
    );
    if (result.rows.length === 0) {
      throw new Error(`Repair job does not exist: ${jobId}`);
    }
    return rowToRepairJob(result.rows[0]);
  }

  async listPending(sessionId?: string): Promise<RepairJob[]> {
    const result = sessionId
      ? await this.client.query<RepairJobRow>(
          `SELECT id, session_id, turn_id, kind, status, reason, metadata, created_at, updated_at
           FROM persistent_agent_memory.repair_journal
           WHERE status = 'pending' AND session_id = $1
           ORDER BY created_at ASC`,
          [sessionId],
        )
      : await this.client.query<RepairJobRow>(
          `SELECT id, session_id, turn_id, kind, status, reason, metadata, created_at, updated_at
           FROM persistent_agent_memory.repair_journal
           WHERE status = 'pending'
           ORDER BY created_at ASC`,
        );
    return result.rows.map(rowToRepairJob);
  }
}

export class PostgresPersistentMemoryStore implements PersistentMemoryStore {
  constructor(private readonly client: SqlClient) {}

  async close(): Promise<void> {
    await this.client.end?.();
  }

  async upsertModelVersion(
    modelVersion: EmbeddingModelVersion,
  ): Promise<EmbeddingModelVersion> {
    await this.client.query(
      `INSERT INTO persistent_agent_memory.model_versions
       (id, provider, model, version, dimensions, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (provider, model, version) DO UPDATE SET
         id = EXCLUDED.id,
         dimensions = EXCLUDED.dimensions,
         metadata = EXCLUDED.metadata`,
      [
        modelVersion.id,
        modelVersion.provider,
        modelVersion.model,
        modelVersion.version,
        modelVersion.dimensions,
        JSON.stringify(modelVersion.metadata),
      ],
    );
    return modelVersion;
  }

  async listModelVersions(): Promise<EmbeddingModelVersion[]> {
    const result = await this.client.query<{
      id: string;
      provider: string;
      model: string;
      version: string;
      dimensions: number;
      metadata: Record<string, unknown>;
    }>(
      `SELECT id, provider, model, version, dimensions, metadata
       FROM persistent_agent_memory.model_versions
       ORDER BY created_at DESC`,
    );

    return result.rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      model: row.model,
      version: row.version,
      dimensions: Number(row.dimensions),
      metadata: row.metadata ?? {},
    }));
  }

  async insertRawEvent(
    event: Omit<PersistentRawEvent, "id" | "createdAt">,
  ): Promise<PersistentRawEvent> {
    const stored: PersistentRawEvent = {
      ...event,
      id: randomUUID(),
      createdAt: now(),
    };
    await this.client.query(
      `INSERT INTO persistent_agent_memory.raw_events
       (id, source_ref, event_type, content_hash, sanitized_content, secret_scan_status, rejected_reason, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        stored.id,
        stored.sourceRef,
        stored.eventType,
        stored.contentHash,
        stored.sanitizedContent,
        stored.secretScanStatus,
        stored.rejectedReason ?? null,
        JSON.stringify(stored.metadata),
        stored.createdAt,
      ],
    );
    return stored;
  }

  async insertSecretScanEvent(
    event: Omit<SecretScanEvent, "id" | "createdAt">,
  ): Promise<SecretScanEvent> {
    const stored: SecretScanEvent = {
      ...event,
      id: randomUUID(),
      createdAt: now(),
    };
    await this.client.query(
      `INSERT INTO persistent_agent_memory.secret_scan_events
       (id, source_ref, event_type, content_hash, scanner_name, scanner_version, status, matched_rule_ids, redacted_preview, action_taken, redacted_metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        stored.id,
        stored.sourceRef,
        stored.eventType,
        stored.contentHash,
        stored.scannerName,
        stored.scannerVersion,
        stored.status,
        JSON.stringify(stored.matchedRuleIds),
        stored.redactedPreview,
        stored.actionTaken,
        JSON.stringify(stored.redactedMetadata),
        stored.createdAt,
      ],
    );
    return stored;
  }

  async insertMemoryCandidate(
    candidate: Omit<MemoryCandidate, "id" | "createdAt">,
  ): Promise<MemoryCandidate> {
    const stored: MemoryCandidate = {
      ...candidate,
      id: randomUUID(),
      createdAt: now(),
    };
    await this.client.query(
      `INSERT INTO persistent_agent_memory.memory_candidates
       (id, raw_event_id, source_ref, content_hash, content, candidate_type, tags, model_version_id, injection_probability, trust_level, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        stored.id,
        stored.rawEventId,
        stored.sourceRef,
        stored.contentHash,
        stored.content,
        stored.candidateType,
        JSON.stringify(stored.tags),
        stored.modelVersionId,
        stored.injectionProbability,
        stored.trustLevel,
        stored.createdAt,
      ],
    );
    return stored;
  }

  async insertMemory(
    memory: Omit<PersistentMemoryRecord, "id" | "createdAt">,
  ): Promise<PersistentMemoryRecord> {
    const timestamp = now();
    const stored: PersistentMemoryRecord = {
      ...memory,
      id: randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.client.query(
      `INSERT INTO persistent_agent_memory.memories
       (id, candidate_id, source_ref, content_hash, content, memory_type, tags, trust_level, model_version_id, injection_probability, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)`,
      [
        stored.id,
        stored.candidateId,
        stored.sourceRef,
        stored.contentHash,
        stored.content,
        stored.memoryType,
        JSON.stringify(stored.tags),
        stored.trustLevel,
        stored.modelVersionId,
        stored.injectionProbability,
        stored.createdAt,
      ],
    );
    return stored;
  }

  async insertJobRun(job: Omit<JobRun, "id" | "createdAt">): Promise<JobRun> {
    const stored: JobRun = {
      ...job,
      id: randomUUID(),
      createdAt: now(),
    };
    await this.client.query(
      `INSERT INTO persistent_agent_memory.job_runs
       (id, job_type, status, payload, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $5)`,
      [
        stored.id,
        stored.jobType,
        stored.status,
        JSON.stringify(stored.payload),
        stored.createdAt,
      ],
    );
    return stored;
  }

  async insertRetrievalEvent(
    event: Omit<RetrievalEvent, "id" | "createdAt">,
  ): Promise<RetrievalEvent> {
    const stored: RetrievalEvent = {
      ...event,
      id: randomUUID(),
      createdAt: now(),
    };
    await this.client.query(
      `INSERT INTO persistent_agent_memory.retrieval_events
       (id, query, intent, selected_profile, result_memory_ids, scores, reranker_used, latency_ms, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        stored.id,
        stored.query,
        stored.intent,
        stored.selectedProfile ?? stored.intent,
        JSON.stringify(stored.resultMemoryIds),
        JSON.stringify(stored.scores ?? {}),
        stored.rerankerUsed ?? false,
        stored.latencyMs ?? 0,
        stored.createdAt,
      ],
    );
    return stored;
  }

  async insertAuditLog(
    entry: Omit<AuditLogEntry, "id" | "createdAt">,
  ): Promise<AuditLogEntry> {
    const stored: AuditLogEntry = {
      ...entry,
      id: randomUUID(),
      createdAt: now(),
    };
    await this.client.query(
      `INSERT INTO persistent_agent_memory.audit_log
       (id, action, source_ref, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        stored.id,
        stored.action,
        stored.sourceRef ?? null,
        JSON.stringify(stored.metadata),
        stored.createdAt,
      ],
    );
    return stored;
  }

  async insertInjectionQuarantine(
    entry: Omit<InjectionQuarantineRecord, "id" | "createdAt">,
  ): Promise<InjectionQuarantineRecord> {
    const stored: InjectionQuarantineRecord = {
      ...entry,
      id: randomUUID(),
      createdAt: now(),
    };
    await this.client.query(
      `INSERT INTO persistent_agent_memory.injection_quarantine
       (id, memory_id, reason, source_ref, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [stored.id, stored.memoryId, stored.reason, stored.sourceRef, stored.createdAt],
    );
    return stored;
  }

  async insertConsolidationLog(
    entry: Omit<ConsolidationLogEntry, "id" | "createdAt">,
  ): Promise<ConsolidationLogEntry> {
    const stored: ConsolidationLogEntry = {
      ...entry,
      id: randomUUID(),
      createdAt: now(),
    };
    await this.client.query(
      `INSERT INTO persistent_agent_memory.consolidation_log
       (id, source_memory_ids, result_memory_id, action, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        stored.id,
        JSON.stringify(stored.sourceMemoryIds),
        stored.resultMemoryId ?? null,
        stored.action,
        stored.createdAt,
      ],
    );
    return stored;
  }

  async purgeBySourceRef(
    sourceRef: string,
  ): Promise<{ rawEvents: number; memories: PersistentMemoryRecord[] }> {
    const memoryResult = await this.client.query<MemoryRow>(
      `SELECT id, candidate_id, source_ref, content_hash, content, memory_type, tags,
              trust_level, model_version_id, injection_probability, created_at, updated_at
       FROM persistent_agent_memory.memories
       WHERE source_ref = $1 AND archived = false`,
      [sourceRef],
    );
    const rawResult = await this.client.query<{ id: string }>(
      `UPDATE persistent_agent_memory.raw_events
       SET sanitized_content = NULL,
           secret_scan_status = 'quarantined',
           rejected_reason = 'purged_by_memory_secret_policy'
       WHERE source_ref = $1 AND sanitized_content IS NOT NULL
       RETURNING id`,
      [sourceRef],
    );
    await this.client.query(
      `UPDATE persistent_agent_memory.memories
       SET archived = true,
           quarantined = true,
           updated_at = now()
       WHERE source_ref = $1 AND archived = false`,
      [sourceRef],
    );

    return {
      rawEvents: rawResult.rows.length,
      memories: memoryResult.rows.map((row) => ({
        id: row.id,
        candidateId: row.candidate_id,
        sourceRef: row.source_ref,
        contentHash: row.content_hash,
        content: row.content,
        memoryType: row.memory_type as PersistentMemoryRecord["memoryType"],
        tags: Array.isArray(row.tags) ? row.tags : [],
        trustLevel: row.trust_level,
        modelVersionId: row.model_version_id,
        injectionProbability: Number(row.injection_probability),
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
        archived: true,
        quarantined: true,
      })),
    };
  }

  async listMemories(): Promise<PersistentMemoryRecord[]> {
    const result = await this.client.query<MemoryRow>(
      `SELECT id, candidate_id, source_ref, content_hash, content, memory_type, tags,
              trust_level, model_version_id, injection_probability, created_at, updated_at
       FROM persistent_agent_memory.memories
       WHERE archived = false AND quarantined = false
       ORDER BY created_at DESC`,
    );

    return result.rows.map((row) => ({
      id: row.id,
      candidateId: row.candidate_id,
      sourceRef: row.source_ref,
      contentHash: row.content_hash,
      content: row.content,
      memoryType: row.memory_type as PersistentMemoryRecord["memoryType"],
      tags: Array.isArray(row.tags) ? row.tags : [],
      trustLevel: row.trust_level,
      modelVersionId: row.model_version_id,
      injectionProbability: Number(row.injection_probability),
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    }));
  }
}
