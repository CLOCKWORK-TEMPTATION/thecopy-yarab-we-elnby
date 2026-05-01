import {
  boolean,
  integer,
  jsonb,
  pgSchema,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const persistentAgentMemorySchema = pgSchema(
  "persistent_agent_memory",
);

const metadata = () =>
  jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull();

const tags = () =>
  jsonb("tags").$type<string[]>().default([]).notNull();

export const modelVersions = persistentAgentMemorySchema.table(
  "model_versions",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    version: text("version").notNull(),
    dimensions: integer("dimensions"),
    metadata: metadata(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    modelVersionsUnique: uniqueIndex("model_versions_unique").on(
      table.provider,
      table.model,
      table.version,
    ),
  }),
);

export const sessions = persistentAgentMemorySchema.table("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  threadId: text("thread_id").notNull(),
  status: text("status").default("active").notNull(),
  metadata: metadata(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rounds = persistentAgentMemorySchema.table("rounds", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").references(() => sessions.id, {
    onDelete: "cascade",
  }),
  roundIndex: integer("round_index").notNull(),
  summary: text("summary"),
  metadata: metadata(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const references = persistentAgentMemorySchema.table("references", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceRef: text("source_ref").notNull(),
  sourceType: text("source_type").notNull(),
  contentHash: text("content_hash").notNull(),
  metadata: metadata(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rawEvents = persistentAgentMemorySchema.table("raw_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  referenceId: uuid("reference_id").references(() => references.id, {
    onDelete: "set null",
  }),
  sourceRef: text("source_ref").notNull(),
  eventType: text("event_type").notNull(),
  contentHash: text("content_hash").notNull(),
  rawText: text("raw_text").notNull(),
  metadata: metadata(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const secretScanEvents = persistentAgentMemorySchema.table(
  "secret_scan_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceRef: text("source_ref").notNull(),
    eventType: text("event_type").notNull(),
    contentHash: text("content_hash").notNull(),
    scannerVersion: text("scanner_version").notNull(),
    findingIds: jsonb("finding_ids").$type<string[]>().default([]).notNull(),
    redactedMetadata: jsonb("redacted_metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);

export const memoryCandidates = persistentAgentMemorySchema.table(
  "memory_candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rawEventId: uuid("raw_event_id")
      .notNull()
      .references(() => rawEvents.id, { onDelete: "cascade" }),
    sourceRef: text("source_ref").notNull(),
    contentHash: text("content_hash").notNull(),
    content: text("content").notNull(),
    candidateType: text("candidate_type").notNull(),
    tags: tags(),
    modelVersionId: text("model_version_id").notNull(),
    injectionProbability: real("injection_probability").default(0).notNull(),
    trustLevel: text("trust_level").default("medium").notNull(),
    metadata: metadata(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);

export const memories = persistentAgentMemorySchema.table("memories", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateId: uuid("candidate_id").references(() => memoryCandidates.id, {
    onDelete: "set null",
  }),
  sourceRef: text("source_ref").notNull(),
  contentHash: text("content_hash").notNull(),
  content: text("content").notNull(),
  memoryType: text("memory_type").notNull(),
  tags: tags(),
  trustLevel: text("trust_level").default("medium").notNull(),
  modelVersionId: text("model_version_id").notNull(),
  injectionProbability: real("injection_probability").default(0).notNull(),
  archived: boolean("archived").default(false).notNull(),
  metadata: metadata(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const decisions = persistentAgentMemorySchema.table("decisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  memoryId: uuid("memory_id").references(() => memories.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  status: text("status").default("accepted").notNull(),
  rationale: text("rationale"),
  metadata: metadata(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stateSnapshots = persistentAgentMemorySchema.table(
  "state_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roundId: uuid("round_id").references(() => rounds.id, {
      onDelete: "set null",
    }),
    contentHash: text("content_hash").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);

export const stateDeltas = persistentAgentMemorySchema.table("state_deltas", {
  id: uuid("id").defaultRandom().primaryKey(),
  snapshotId: uuid("snapshot_id").references(() => stateSnapshots.id, {
    onDelete: "cascade",
  }),
  delta: jsonb("delta").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const factVersions = persistentAgentMemorySchema.table(
  "fact_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memoryId: uuid("memory_id").references(() => memories.id, {
      onDelete: "cascade",
    }),
    factKey: text("fact_key").notNull(),
    factValue: text("fact_value").notNull(),
    validFrom: timestamp("valid_from").defaultNow().notNull(),
    validTo: timestamp("valid_to"),
    supersededBy: uuid("superseded_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);

export const retrievalEvents = persistentAgentMemorySchema.table(
  "retrieval_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    query: text("query").notNull(),
    intent: text("intent").notNull(),
    resultMemoryIds: jsonb("result_memory_ids")
      .$type<string[]>()
      .default([])
      .notNull(),
    metadata: metadata(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);

export const injectionEvents = persistentAgentMemorySchema.table(
  "injection_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    retrievalEventId: uuid("retrieval_event_id").references(
      () => retrievalEvents.id,
      { onDelete: "set null" },
    ),
    zone: text("zone").notNull(),
    memoryIds: jsonb("memory_ids").$type<string[]>().default([]).notNull(),
    rejected: boolean("rejected").default(false).notNull(),
    reason: text("reason"),
    metadata: metadata(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);

export const auditLog = persistentAgentMemorySchema.table("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  action: text("action").notNull(),
  sourceRef: text("source_ref"),
  metadata: metadata(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobRuns = persistentAgentMemorySchema.table("job_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobType: text("job_type").notNull(),
  status: text("status").default("queued").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const deadLetterJobs = persistentAgentMemorySchema.table(
  "dead_letter_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobRunId: uuid("job_run_id").references(() => jobRuns.id, {
      onDelete: "set null",
    }),
    reason: text("reason").notNull(),
    metadata: metadata(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);

export type PersistentMemory = typeof memories.$inferSelect;
export type NewPersistentMemory = typeof memories.$inferInsert;
export type PersistentRawEvent = typeof rawEvents.$inferSelect;
export type NewPersistentRawEvent = typeof rawEvents.$inferInsert;

