import { sha256 } from "../utils";
import {
  LOCAL_DETERMINISTIC_EMBEDDING_MODEL_VERSION,
  LocalDeterministicEmbeddingProvider,
  assertEmbeddingProviderAdmitted,
} from "./embeddings";
import { MemoryInjectionEnvelope } from "./injection";
import {
  createRejectedIngestMetrics,
  createRetrievalMetrics,
  elapsedMs,
  nowMs,
} from "./metrics";
import { MemorySecretScanner } from "./secrets";
import { createShadowIndexController, ShadowIndexController } from "./shadow-index";
import { InMemoryPersistentMemoryStore } from "./store";
import { InMemoryVectorIndexAdapter } from "./vector-index";
import type {
  IngestRawEventInput,
  IngestResult,
  EmbeddingModelVersion,
  EmbeddingProviderAdapter,
  MemoryRetrievalHit,
  MemoryRetrievalRequest,
  MemoryRetrievalResult,
  PersistentMemoryRecord,
  PersistentMemoryStore,
  QueryIntent,
  VectorIndexAdapter,
  VectorIndexRebuildResult,
} from "./types";

export interface PersistentMemorySystemOptions {
  store?: PersistentMemoryStore;
  secretScanner?: MemorySecretScanner;
  vectorIndex?: VectorIndexAdapter;
  embeddingProvider?: EmbeddingProviderAdapter;
  admittedModelVersions?: EmbeddingModelVersion[];
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9\u0600-\u06ff]+/u)
    .filter((token) => token.length > 1);
}

function scoreMemory(queryTokens: string[], memory: PersistentMemoryRecord): number {
  const contentTokens = new Set(tokenize(`${memory.content} ${memory.tags.join(" ")}`));
  const matches = queryTokens.filter((token) => contentTokens.has(token)).length;
  const trustBoost =
    memory.trustLevel === "high" ? 0.2 : memory.trustLevel === "medium" ? 0.1 : 0;
  return matches + trustBoost;
}

function inferTrustLevel(input: IngestRawEventInput): "low" | "medium" | "high" {
  if (input.eventType === "decision") {
    return "medium";
  }
  if (input.sourceRef.includes("OPERATING-CONTRACT") || input.sourceRef === "AGENTS.md") {
    return "high";
  }
  return "medium";
}

export class PersistentMemorySystem {
  private readonly store: PersistentMemoryStore;
  private readonly secretScanner: MemorySecretScanner;
  private readonly vectorIndex: VectorIndexAdapter;
  private readonly embeddingProvider: EmbeddingProviderAdapter;
  private readonly admittedModelVersions: EmbeddingModelVersion[];

  constructor(options: PersistentMemorySystemOptions = {}) {
    this.store = options.store ?? new InMemoryPersistentMemoryStore();
    this.secretScanner = options.secretScanner ?? new MemorySecretScanner();
    this.vectorIndex = options.vectorIndex ?? new InMemoryVectorIndexAdapter();
    this.embeddingProvider =
      options.embeddingProvider ?? new LocalDeterministicEmbeddingProvider();
    this.admittedModelVersions = options.admittedModelVersions ?? [
      LOCAL_DETERMINISTIC_EMBEDDING_MODEL_VERSION,
    ];
  }

  async ingestRawEvent(input: IngestRawEventInput): Promise<IngestResult> {
    const ingestStart = nowMs();
    const contentHash = sha256(input.content);
    const secretScanStart = nowMs();
    const scan = this.secretScanner.scan(input.content);
    const secretScanLatencyMs = elapsedMs(secretScanStart);

    if (!scan.clean) {
      const secretEvent = await this.store.insertSecretScanEvent(
        this.secretScanner.buildRejectedEvent(input),
      );
      await this.store.insertAuditLog({
        action: "persistent_memory.secret_rejected",
        sourceRef: input.sourceRef,
        metadata: {
          contentHash,
          secretScanEventId: secretEvent.id,
        },
      });
      return {
        status: "rejected",
        secretScanEventId: secretEvent.id,
        metrics: createRejectedIngestMetrics(
          secretScanLatencyMs,
          elapsedMs(ingestStart),
        ),
      };
    }

    assertEmbeddingProviderAdmitted(
      this.embeddingProvider.modelVersion,
      this.admittedModelVersions,
    );
    await this.store.upsertModelVersion(this.embeddingProvider.modelVersion);

    const rawEvent = await this.store.insertRawEvent({
      sourceRef: input.sourceRef,
      eventType: input.eventType,
      contentHash,
      content: input.content,
      metadata: input.metadata ?? {},
    });
    const trustLevel = inferTrustLevel(input);
    const candidate = await this.store.insertMemoryCandidate({
      rawEventId: rawEvent.id,
      sourceRef: input.sourceRef,
      contentHash,
      content: input.content.trim(),
      candidateType: input.eventType,
      tags: input.tags ?? [],
      modelVersionId: this.embeddingProvider.modelVersion.id,
      injectionProbability: 0.1,
      trustLevel,
    });
    const memory = await this.store.insertMemory({
      candidateId: candidate.id,
      sourceRef: candidate.sourceRef,
      contentHash: candidate.contentHash,
      content: candidate.content,
      memoryType: candidate.candidateType,
      tags: candidate.tags,
      trustLevel: candidate.trustLevel,
      modelVersionId: candidate.modelVersionId,
      injectionProbability: candidate.injectionProbability,
    });

    await this.store.insertJobRun({
      jobType: "embedding",
      status: "queued",
      payload: {
        memoryCandidateId: candidate.id,
      },
    });
    const ingestAckLatencyMs = elapsedMs(ingestStart);
    const embeddingStart = nowMs();
    const [embeddingVector] = await this.embeddingProvider.embed([memory.content]);
    const embeddingLatencyMs = elapsedMs(embeddingStart);
    const vectorUpsertStart = nowMs();
    await this.vectorIndex.upsertMemory(memory, embeddingVector);
    const vectorUpsertLatencyMs = elapsedMs(vectorUpsertStart);
    await this.store.insertAuditLog({
      action: "persistent_memory.ingested",
      sourceRef: input.sourceRef,
      metadata: {
        rawEventId: rawEvent.id,
        memoryCandidateId: candidate.id,
        memoryId: memory.id,
      },
    });

    return {
      status: "stored",
      rawEventId: rawEvent.id,
      memoryCandidateId: candidate.id,
      memoryId: memory.id,
      metrics: {
        p95_ingest_ack_latency_ms: ingestAckLatencyMs,
        p95_ingest_ready_latency_ms: elapsedMs(ingestStart),
        p95_secret_scan_latency_ms: secretScanLatencyMs,
        p95_embedding_job_latency_ms: embeddingLatencyMs,
        p95_vector_upsert_latency_ms: vectorUpsertLatencyMs,
      },
    };
  }

  async retrieve(request: MemoryRetrievalRequest): Promise<MemoryRetrievalResult> {
    const retrievalStart = nowMs();
    const queryTokens = tokenize(request.query);
    const topK = request.topK ?? 5;
    const intent: QueryIntent = request.intent ?? "default";
    const ranked: MemoryRetrievalHit[] = (await this.store.listMemories())
      .map((memory) => ({
        ...memory,
        score: scoreMemory(queryTokens, memory),
        rank: 0,
      }))
      .filter((memory) => memory.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, topK)
      .map((memory, index) => ({
        ...memory,
        rank: index + 1,
      }));

    const retrievalEvent = await this.store.insertRetrievalEvent({
      query: request.query,
      intent,
      resultMemoryIds: ranked.map((memory) => memory.id),
    });
    const auditEvent = await this.store.insertAuditLog({
      action: "persistent_memory.retrieved",
      metadata: {
        retrievalEventId: retrievalEvent.id,
        resultCount: ranked.length,
        intent,
      },
    });

    return {
      hits: ranked,
      retrievalEventId: retrievalEvent.id,
      auditEventId: auditEvent.id,
      metrics: createRetrievalMetrics(elapsedMs(retrievalStart), false),
    };
  }

  async rebuildVectorIndex(): Promise<VectorIndexRebuildResult> {
    return this.vectorIndex.rebuild(await this.store.listMemories());
  }
}

export function createPersistentMemorySystem(
  options: PersistentMemorySystemOptions = {},
): PersistentMemorySystem {
  return new PersistentMemorySystem(options);
}

export function isPersistentMemoryInfraRequired(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return (
    env["MEMORY_INFRA_REQUIRED"] === "true" ||
    env["PERSISTENT_MEMORY_INFRA_REQUIRED"] === "true"
  );
}

export { MemoryInjectionEnvelope } from "./injection";
export {
  LOCAL_DETERMINISTIC_EMBEDDING_MODEL_VERSION,
  LocalDeterministicEmbeddingProvider,
  assertEmbeddingProviderAdmitted,
} from "./embeddings";
export {
  PERSISTENT_MEMORY_LATENCY_BUDGETS,
  buildLatencyBudgetList,
  collectLatencyBudgetViolations,
} from "./metrics";
export { MemorySecretScanner } from "./secrets";
export {
  MEMORY_CONTEXT_BUDGET_PROFILES,
  getMemoryBudgetProfile,
  validateMemoryBudgetProfile,
} from "./budgets";
export { ShadowIndexController, createShadowIndexController } from "./shadow-index";
export { InMemoryPersistentMemoryStore } from "./store";
export {
  InMemoryVectorIndexAdapter,
  getPersistentMemoryVectorCapabilities,
  supportsPersistentMemoryVectorCapability,
} from "./vector-index";
export type * from "./types";

