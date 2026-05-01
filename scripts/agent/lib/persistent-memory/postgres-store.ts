import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";

import { fromRepoRoot } from "../utils";
import type {
  AuditLogEntry,
  JobRun,
  MemoryCandidate,
  PersistentMemoryRecord,
  PersistentMemoryStore,
  PersistentRawEvent,
  RetrievalEvent,
  SecretScanEvent,
} from "./types";

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
  created_at: string | Date;
};

function now(): string {
  return new Date().toISOString();
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
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
      id uuid PRIMARY KEY,
      provider text NOT NULL,
      model text NOT NULL,
      version text NOT NULL,
      dimensions integer,
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(provider, model, version)
    )
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
      raw_text text NOT NULL,
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS persistent_agent_memory.secret_scan_events (
      id uuid PRIMARY KEY,
      source_ref text NOT NULL,
      event_type text NOT NULL,
      content_hash text NOT NULL,
      scanner_version text NOT NULL,
      finding_ids jsonb NOT NULL DEFAULT '[]',
      redacted_metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    )
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
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
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
      result_memory_ids jsonb NOT NULL DEFAULT '[]',
      metadata jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    )
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
}

export class PostgresPersistentMemoryStore implements PersistentMemoryStore {
  constructor(private readonly client: SqlClient) {}

  async close(): Promise<void> {
    await this.client.end?.();
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
       (id, source_ref, event_type, content_hash, raw_text, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        stored.id,
        stored.sourceRef,
        stored.eventType,
        stored.contentHash,
        stored.content,
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
       (id, source_ref, event_type, content_hash, scanner_version, finding_ids, redacted_metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        stored.id,
        stored.sourceRef,
        stored.eventType,
        stored.contentHash,
        stored.scannerVersion,
        JSON.stringify(stored.findingIds),
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
    const stored: PersistentMemoryRecord = {
      ...memory,
      id: randomUUID(),
      createdAt: now(),
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
       (id, query, intent, result_memory_ids, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        stored.id,
        stored.query,
        stored.intent,
        JSON.stringify(stored.resultMemoryIds),
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

  async listMemories(): Promise<PersistentMemoryRecord[]> {
    const result = await this.client.query<MemoryRow>(
      `SELECT id, candidate_id, source_ref, content_hash, content, memory_type, tags,
              trust_level, model_version_id, injection_probability, created_at
       FROM persistent_agent_memory.memories
       WHERE archived = false
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
    }));
  }
}

