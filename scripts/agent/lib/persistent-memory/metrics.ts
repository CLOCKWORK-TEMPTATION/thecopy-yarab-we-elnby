import type {
  PersistentMemoryIngestMetrics,
  PersistentMemoryLatencyBudget,
  PersistentMemoryLatencyMetricName,
  PersistentMemoryRetrievalMetrics,
} from "./types";

export const PERSISTENT_MEMORY_LATENCY_BUDGETS = {
  p95_ingest_ack_latency_ms: 500,
  p95_ingest_ready_latency_ms: 5000,
  p95_secret_scan_latency_ms: 300,
  p95_embedding_job_latency_ms: 5000,
  p95_vector_upsert_latency_ms: 500,
  p95_retrieval_without_reranker_ms: 200,
  p95_retrieval_with_reranker_ms: 800,
} satisfies Record<PersistentMemoryLatencyMetricName, number>;

export function nowMs(): number {
  return Date.now();
}

export function elapsedMs(startMs: number): number {
  return Math.max(0, Date.now() - startMs);
}

export function buildLatencyBudgetList(): PersistentMemoryLatencyBudget[] {
  return Object.entries(PERSISTENT_MEMORY_LATENCY_BUDGETS).map(
    ([metric, p95LimitMs]) => ({
      metric: metric as PersistentMemoryLatencyMetricName,
      p95LimitMs,
    }),
  );
}

export function createRejectedIngestMetrics(
  secretScanLatencyMs: number,
  ingestAckLatencyMs: number,
): PersistentMemoryIngestMetrics {
  return {
    p95_ingest_ack_latency_ms: ingestAckLatencyMs,
    p95_ingest_ready_latency_ms: ingestAckLatencyMs,
    p95_secret_scan_latency_ms: secretScanLatencyMs,
    p95_embedding_job_latency_ms: 0,
    p95_vector_upsert_latency_ms: 0,
  };
}

export function createRetrievalMetrics(
  retrievalLatencyMs: number,
  rerankerUsed: boolean,
): PersistentMemoryRetrievalMetrics {
  return rerankerUsed
    ? { p95_retrieval_with_reranker_ms: retrievalLatencyMs }
    : { p95_retrieval_without_reranker_ms: retrievalLatencyMs };
}

export function collectLatencyBudgetViolations(
  metrics: Partial<
    PersistentMemoryIngestMetrics & PersistentMemoryRetrievalMetrics
  >,
): PersistentMemoryLatencyBudget[] {
  return buildLatencyBudgetList().filter((budget) => {
    const value = metrics[budget.metric];
    return typeof value === "number" && value > budget.p95LimitMs;
  });
}

