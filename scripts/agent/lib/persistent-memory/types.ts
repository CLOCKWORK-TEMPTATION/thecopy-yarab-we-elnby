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

export type SecretScanStatus = "clean" | "rejected" | "quarantined";

export type SecretScanAction = "stored" | "rejected" | "purged";

export type PersistentMemoryRuntimeStatus = "ready" | "degraded" | "failed";

export interface EmbeddingModelVersion {
  id: string;
  provider: string;
  model: string;
  version: string;
  dimensions: number;
  metadata: Record<string, unknown>;
}

export interface EmbeddingProviderHealth {
  status: PersistentMemoryRuntimeStatus;
  modelName: string;
  modelVersion: string;
  dimensions: number;
  details?: Record<string, unknown>;
}

export interface EmbeddingProviderAdapter {
  readonly modelVersion: EmbeddingModelVersion;
  embed(input: string[]): Promise<number[][]>;
  health?(): Promise<EmbeddingProviderHealth>;
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
  sanitizedContent: string | null;
  secretScanStatus: SecretScanStatus;
  rejectedReason?: string;
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
  scannerName: string;
  scannerVersion: string;
  status: SecretScanStatus;
  matchedRuleIds: string[];
  redactedPreview: string;
  actionTaken: SecretScanAction;
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
  updatedAt?: string;
  archived?: boolean;
  quarantined?: boolean;
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
  selectedProfile?: QueryIntent;
  resultMemoryIds: string[];
  scores?: Record<string, number>;
  rerankerUsed?: boolean;
  latencyMs?: number;
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

export interface MemoryRetrievalResult {
  hits: MemoryRetrievalHit[];
  retrievalEventId: string;
  auditEventId: string;
  selectedProfile: QueryIntent;
  latencyMs: number;
  rerankerUsed: boolean;
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

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface VectorQuery {
  query: string;
  vector?: number[];
  topK: number;
  filters?: Record<string, unknown>;
}

export interface VectorHit {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

export interface VectorIndexHealth {
  status: PersistentMemoryRuntimeStatus;
  name: string;
  details?: Record<string, unknown>;
}

export interface InjectionQuarantineRecord {
  id: string;
  memoryId: string;
  reason: string;
  sourceRef: string;
  createdAt: string;
}

export interface ConsolidationLogEntry {
  id: string;
  sourceMemoryIds: string[];
  resultMemoryId?: string;
  action: string;
  createdAt: string;
}

export interface PurgeResult {
  purgedRawEvents: number;
  purgedMemories: number;
  quarantinedMemories: number;
  vectorDeletedIds: string[];
  auditEventId: string;
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
  insertInjectionQuarantine?(entry: Omit<InjectionQuarantineRecord, "id" | "createdAt">): Promise<InjectionQuarantineRecord>;
  insertConsolidationLog?(entry: Omit<ConsolidationLogEntry, "id" | "createdAt">): Promise<ConsolidationLogEntry>;
  purgeBySourceRef?(sourceRef: string): Promise<{ rawEvents: number; memories: PersistentMemoryRecord[] }>;
  listMemories(): Promise<PersistentMemoryRecord[]>;
}

export interface VectorIndexAdapter {
  readonly target: VectorIndexTarget;
  readonly capabilities: readonly PersistentMemoryVectorCapability[];
  upsertMemory(memory: PersistentMemoryRecord, vector?: number[]): Promise<void>;
  upsert?(points: VectorPoint[]): Promise<void>;
  delete?(ids: string[]): Promise<void>;
  search?(query: VectorQuery): Promise<VectorHit[]>;
  health?(): Promise<VectorIndexHealth>;
  rebuild(memories: PersistentMemoryRecord[]): Promise<VectorIndexRebuildResult>;
}

export interface IngestResult {
  status: "stored" | "rejected";
  rawEventId?: string;
  memoryCandidateId?: string;
  memoryId?: string;
  secretScanEventId?: string;
  auditEventId?: string;
  metrics: PersistentMemoryIngestMetrics;
}
