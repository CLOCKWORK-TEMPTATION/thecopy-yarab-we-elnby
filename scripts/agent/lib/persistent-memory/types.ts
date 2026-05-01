export type PersistentMemoryEventType =
  | "session"
  | "round"
  | "decision"
  | "memory"
  | "fact"
  | "state_snapshot"
  | "state_delta"
  | "raw_event";

export type TrustLevel = "low" | "medium" | "high";

export interface EmbeddingModelVersion {
  id: string;
  provider: string;
  model: string;
  version: string;
  dimensions: number;
  metadata: Record<string, unknown>;
}

export interface EmbeddingProviderAdapter {
  readonly modelVersion: EmbeddingModelVersion;
  embed(input: string[]): Promise<number[][]>;
}

export type QueryIntent =
  | "execution_or_code_change"
  | "continue_from_last_session"
  | "prior_decision_lookup"
  | "current_state_lookup"
  | "plan_review_or_evaluation"
  | "avoid_repetition_or_follow_constraints"
  | "default";

export type InjectionZone =
  | "memory_context"
  | "evidence_context"
  | "system"
  | "developer"
  | "instructions"
  | "tool contract"
  | "policy zone";

export interface IngestRawEventInput {
  sourceRef: string;
  eventType: PersistentMemoryEventType;
  content: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface PersistentRawEvent {
  id: string;
  sourceRef: string;
  eventType: PersistentMemoryEventType;
  contentHash: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SecretFinding {
  ruleId: string;
  fingerprint: string;
}

export interface SecretScanEvent {
  id: string;
  sourceRef: string;
  eventType: PersistentMemoryEventType;
  contentHash: string;
  scannerVersion: string;
  findingIds: string[];
  redactedMetadata: Record<string, unknown>;
  createdAt: string;
}

export interface MemoryCandidate {
  id: string;
  rawEventId: string;
  sourceRef: string;
  contentHash: string;
  content: string;
  candidateType: PersistentMemoryEventType;
  tags: string[];
  modelVersionId: string;
  injectionProbability: number;
  trustLevel: TrustLevel;
  createdAt: string;
}

export interface PersistentMemoryRecord {
  id: string;
  candidateId: string;
  sourceRef: string;
  contentHash: string;
  content: string;
  memoryType: PersistentMemoryEventType;
  tags: string[];
  trustLevel: TrustLevel;
  modelVersionId: string;
  injectionProbability: number;
  createdAt: string;
}

export interface JobRun {
  id: string;
  jobType: string;
  status: "queued" | "running" | "completed" | "failed";
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface RetrievalEvent {
  id: string;
  query: string;
  intent: QueryIntent;
  resultMemoryIds: string[];
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  sourceRef?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface MemoryRetrievalRequest {
  query: string;
  intent?: QueryIntent;
  topK?: number;
}

export interface MemoryRetrievalHit extends PersistentMemoryRecord {
  score: number;
  rank: number;
}

export interface MemoryRetrievalResult {
  hits: MemoryRetrievalHit[];
  retrievalEventId: string;
  auditEventId: string;
  metrics: PersistentMemoryRetrievalMetrics;
}

export interface VectorIndexRebuildResult {
  upserted: number;
  sourceMemoryIds: string[];
}

export type VectorIndexTarget = "weaviate-primary" | "qdrant-shadow";

export type PersistentMemoryVectorCapability =
  | "lexical_bm25"
  | "dense_vector"
  | "metadata_filtering"
  | "application_rrf"
  | "application_mmr"
  | "conditional_reranking"
  | "named_vectors"
  | "sparse_vectors"
  | "multi_vector"
  | "payload_filtering"
  | "collection_aliases"
  | "atomic_alias_switch";

export interface PersistentMemoryIngestMetrics {
  p95_ingest_ack_latency_ms: number;
  p95_ingest_ready_latency_ms: number;
  p95_secret_scan_latency_ms: number;
  p95_embedding_job_latency_ms: number;
  p95_vector_upsert_latency_ms: number;
}

export interface PersistentMemoryRetrievalMetrics {
  p95_retrieval_without_reranker_ms?: number;
  p95_retrieval_with_reranker_ms?: number;
}

export type PersistentMemoryLatencyMetricName =
  | keyof PersistentMemoryIngestMetrics
  | keyof PersistentMemoryRetrievalMetrics;

export interface PersistentMemoryLatencyBudget {
  metric: PersistentMemoryLatencyMetricName;
  p95LimitMs: number;
}

export interface PersistentMemoryStore {
  upsertModelVersion(modelVersion: EmbeddingModelVersion): Promise<EmbeddingModelVersion>;
  listModelVersions(): Promise<EmbeddingModelVersion[]>;
  insertRawEvent(event: Omit<PersistentRawEvent, "id" | "createdAt">): Promise<PersistentRawEvent>;
  insertSecretScanEvent(event: Omit<SecretScanEvent, "id" | "createdAt">): Promise<SecretScanEvent>;
  insertMemoryCandidate(candidate: Omit<MemoryCandidate, "id" | "createdAt">): Promise<MemoryCandidate>;
  insertMemory(memory: Omit<PersistentMemoryRecord, "id" | "createdAt">): Promise<PersistentMemoryRecord>;
  insertJobRun(job: Omit<JobRun, "id" | "createdAt">): Promise<JobRun>;
  insertRetrievalEvent(event: Omit<RetrievalEvent, "id" | "createdAt">): Promise<RetrievalEvent>;
  insertAuditLog(entry: Omit<AuditLogEntry, "id" | "createdAt">): Promise<AuditLogEntry>;
  listMemories(): Promise<PersistentMemoryRecord[]>;
}

export interface VectorIndexAdapter {
  readonly target: VectorIndexTarget;
  readonly capabilities: readonly PersistentMemoryVectorCapability[];
  upsertMemory(memory: PersistentMemoryRecord, vector?: number[]): Promise<void>;
  rebuild(memories: PersistentMemoryRecord[]): Promise<VectorIndexRebuildResult>;
}

export interface IngestResult {
  status: "stored" | "rejected";
  rawEventId?: string;
  memoryCandidateId?: string;
  memoryId?: string;
  secretScanEventId?: string;
  metrics: PersistentMemoryIngestMetrics;
}

