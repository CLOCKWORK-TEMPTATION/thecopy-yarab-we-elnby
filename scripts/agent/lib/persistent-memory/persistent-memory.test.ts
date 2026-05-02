import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  BGE_M3_EMBEDDING_MODEL_VERSION,
  MEMORY_CONTEXT_BUDGET_PROFILES,
  PERSISTENT_MEMORY_LATENCY_BUDGETS,
  MemoryInjectionEnvelope,
  assertEmbeddingProviderAdmitted,
  collectLatencyBudgetViolations,
  createPersistentMemorySystem,
  createShadowIndexController,
  getPersistentMemoryVectorCapabilities,
  isPersistentMemoryInfraRequired,
  supportsPersistentMemoryVectorCapability,
  validateMemoryBudgetProfile,
} from "./index";
import {
  MEMORY_SECRET_SCAN_POLICY,
  MemorySecretScanner,
} from "./secrets";
import { InMemoryPersistentMemoryStore } from "./store";
import type { EmbeddingModelVersion } from "./types";

describe("persistent agent memory", () => {
  test("rejects raw content with secrets before raw event storage", async () => {
    const store = new InMemoryPersistentMemoryStore();
    const system = createPersistentMemorySystem({
      store,
      secretScanner: new MemorySecretScanner(),
    });

    const result = await system.ingestRawEvent({
      sourceRef: "output/session-state.md",
      eventType: "state_snapshot",
      content:
        ["DATABASE_URL=postgresql://user", ":super-secret", "@localhost:5432/app"].join(""),
    });

    expect(result.status).toBe("rejected");
    expect(store.rawEvents).toHaveLength(0);
    expect(store.secretScanEvents).toHaveLength(1);
    expect(store.secretScanEvents[0]).toEqual(
      expect.objectContaining({
        sourceRef: "output/session-state.md",
        scannerVersion: expect.any(String),
      }),
    );
    expect(JSON.stringify(store.secretScanEvents[0])).not.toContain(
      "super-secret",
    );
    expect(result.metrics.p95_secret_scan_latency_ms).toEqual(
      expect.any(Number),
    );
  });

  test("ingests a clean event and retrieves it through the source of truth", async () => {
    const store = new InMemoryPersistentMemoryStore();
    const system = createPersistentMemorySystem({
      store,
      secretScanner: new MemorySecretScanner(),
    });

    const result = await system.ingestRawEvent({
      sourceRef: "output/round-notes.md",
      eventType: "decision",
      content:
        "Decision: PostgreSQL remains the source of truth for persistent agent memory.",
      tags: ["decision", "source-of-truth"],
    });

    expect(result.status).toBe("stored");
    expect(store.rawEvents).toHaveLength(1);
    expect(store.rawEvents[0]).toEqual(
      expect.objectContaining({
        sanitizedContent: expect.stringContaining("PostgreSQL"),
        secretScanStatus: "clean",
      }),
    );
    expect(store.modelVersions).toEqual([BGE_M3_EMBEDDING_MODEL_VERSION]);
    expect(store.memoryCandidates).toHaveLength(1);
    expect(store.memories).toHaveLength(1);

    const retrieved = await system.retrieve({
      query: "source of truth",
      intent: "prior_decision_lookup",
      topK: 3,
    });

    expect(retrieved.hits[0]).toEqual(
      expect.objectContaining({
        sourceRef: "output/round-notes.md",
        trustLevel: "medium",
        modelVersionId: BGE_M3_EMBEDDING_MODEL_VERSION.id,
      }),
    );
    expect(retrieved.auditEventId).toEqual(expect.any(String));
    expect(retrieved.metrics.p95_retrieval_with_reranker_ms).toEqual(
      expect.any(Number),
    );
  });

  test("queues embedding jobs without making the queue a source of truth", async () => {
    const store = new InMemoryPersistentMemoryStore();
    const system = createPersistentMemorySystem({
      store,
      secretScanner: new MemorySecretScanner(),
    });

    await system.ingestRawEvent({
      sourceRef: "output/round-notes.md",
      eventType: "fact",
      content: "Redis is a queue carrier only, not persistent memory.",
    });

    expect(store.jobRuns).toHaveLength(1);
    expect(store.jobRuns[0].jobType).toBe("embedding");
    expect(store.jobRuns[0].payload).toEqual({
      memoryCandidateId: store.memoryCandidates[0].id,
    });
    expect(JSON.stringify(store.jobRuns[0].payload)).not.toContain("Redis");
  });

  test("deduplicates clean events before creating another raw event", async () => {
    const store = new InMemoryPersistentMemoryStore();
    const system = createPersistentMemorySystem({ store });
    const input = {
      sourceRef: "output/round-notes.md",
      eventType: "decision" as const,
      content: "Decision: duplicate memories must not multiply raw events.",
    };

    const first = await system.ingestRawEvent(input);
    const second = await system.ingestRawEvent(input);

    expect(first.status).toBe("stored");
    expect(second.status).toBe("stored");
    expect(store.rawEvents).toHaveLength(1);
    expect(store.memories).toHaveLength(1);
    expect(second.memoryId).toBe(first.memoryId);
  });

  test("rebuilds vector index entries from PostgreSQL-shaped records", async () => {
    const store = new InMemoryPersistentMemoryStore();
    const system = createPersistentMemorySystem({
      store,
      secretScanner: new MemorySecretScanner(),
    });

    await system.ingestRawEvent({
      sourceRef: "output/session-state.md",
      eventType: "state_snapshot",
      content: "The governed memory inventory contains persistent-agent-memory.",
      tags: ["state"],
    });

    const rebuilt = await system.rebuildVectorIndex();

    expect(rebuilt.upserted).toBe(1);
    expect(rebuilt.sourceMemoryIds).toEqual([store.memories[0].id]);
  });

  test("allows injection only into safe zones with evidence metadata", () => {
    const envelope = new MemoryInjectionEnvelope();
    const memory = {
      id: "memory-1",
      content: "Use PostgreSQL as the source of truth.",
      sourceRef: "PLAN.md",
      trustLevel: "high" as const,
      modelVersionId: BGE_M3_EMBEDDING_MODEL_VERSION.id,
      injectionProbability: 0.1,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    };

    expect(() =>
      envelope.build({
        zone: "system",
        memories: [memory],
      }),
    ).toThrow(/forbidden/i);

    expect(() =>
      envelope.build({
        zone: "memory_context",
        memories: [{ ...memory, sourceRef: "" }],
      }),
    ).toThrow(/source_ref/i);

    const payload = envelope.build({
      zone: "memory_context",
      memories: [memory],
    });

    expect(payload.zone).toBe("memory_context");
    expect(payload.items[0]).toEqual(
      expect.objectContaining({
        sourceRef: "PLAN.md",
        trustLevel: "high",
        modelVersionId: BGE_M3_EMBEDDING_MODEL_VERSION.id,
      }),
    );
  });

  test("purges a source reference without leaving retrievable memories", async () => {
    const store = new InMemoryPersistentMemoryStore();
    const system = createPersistentMemorySystem({
      store,
      secretScanner: new MemorySecretScanner(),
    });

    await system.ingestRawEvent({
      sourceRef: "output/round-notes.md",
      eventType: "decision",
      content: "Decision: purge removes stale memory from retrieval.",
      tags: ["decision"],
    });

    const purge = await system.purgeSourceRef("output/round-notes.md");
    const retrieved = await system.retrieve({
      query: "purge stale memory",
      topK: 5,
    });

    expect(purge.purgedRawEvents).toBe(1);
    expect(purge.purgedMemories).toBe(1);
    expect(purge.quarantinedMemories).toBe(1);
    expect(purge.vectorDeletedIds).toHaveLength(1);
    expect(store.rawEvents[0].sanitizedContent).toBeNull();
    expect(store.rawEvents[0].secretScanStatus).toBe("quarantined");
    expect(retrieved.hits).toHaveLength(0);
  });

  test("prevents shadow index promotion before parity and rollback readiness", () => {
    const controller = createShadowIndexController();

    expect(controller.getPrimaryTarget()).toBe("weaviate-primary");

    expect(() =>
      controller.promote({
        decisionRecallAt5: 0.95,
        factRecallAt5: 0.9,
        stateRecallAt5: 0.85,
        preventionConstraintRecallAt5: 0.96,
        secretLeakage: 0,
        highTrustInjectionViolation: 0,
        rollbackReady: false,
      }),
    ).toThrow(/rollback/i);

    expect(
      controller.promote({
        decisionRecallAt5: 0.95,
        factRecallAt5: 0.9,
        stateRecallAt5: 0.85,
        preventionConstraintRecallAt5: 0.96,
        secretLeakage: 0,
        highTrustInjectionViolation: 0,
        rollbackReady: true,
      }),
    ).toEqual({
      promoted: true,
      primaryTarget: "qdrant-shadow",
    });
    expect(controller.getPrimaryTarget()).toBe("qdrant-shadow");
    expect(controller.rollbackToPrimary()).toEqual({
      rolledBack: true,
      primaryTarget: "weaviate-primary",
      shadowDataRetained: true,
    });
    expect(controller.getPrimaryTarget()).toBe("weaviate-primary");
  });

  test("keeps infrastructure optional unless explicitly required", () => {
    expect(isPersistentMemoryInfraRequired({})).toBe(false);
    expect(
      isPersistentMemoryInfraRequired({
        MEMORY_INFRA_REQUIRED: "true",
      }),
    ).toBe(true);
    expect(
      isPersistentMemoryInfraRequired({
        PERSISTENT_MEMORY_INFRA_REQUIRED: "true",
      }),
    ).toBe(true);
  });

  test("defines split latency budgets instead of one generic latency metric", () => {
    expect(PERSISTENT_MEMORY_LATENCY_BUDGETS).toEqual(
      expect.objectContaining({
        p95_ingest_ack_latency_ms: 500,
        p95_ingest_ready_latency_ms: 5000,
        p95_retrieval_without_reranker_ms: 200,
        p95_retrieval_with_reranker_ms: 800,
        p95_embedding_job_latency_ms: 5000,
        p95_vector_upsert_latency_ms: 500,
      }),
    );
    expect(
      collectLatencyBudgetViolations({
        p95_ingest_ack_latency_ms: 501,
      }),
    ).toEqual([
      {
        metric: "p95_ingest_ack_latency_ms",
        p95LimitMs: 500,
      },
    ]);
  });

  test("keeps memory secret scanning independent from git allowlists", () => {
    const scanner = new MemorySecretScanner();
    const outputRoundNotes = "output/round-notes.md";
    const outputSessionState = "output/session-state.md";

    expect(scanner.policy.usesGitAllowlist).toBe(false);
    expect(MEMORY_SECRET_SCAN_POLICY.defaultScanPaths).toContain(outputRoundNotes);
    expect(MEMORY_SECRET_SCAN_POLICY.defaultScanPaths).toContain(outputSessionState);
    expect(scanner.scan("TOKEN=abcdefghijklmnopqrstuvwxyz123456").clean).toBe(
      false,
    );
  });

  test("separates Weaviate primary capabilities from Qdrant shadow capabilities", () => {
    expect(getPersistentMemoryVectorCapabilities("weaviate-primary")).toEqual([
      "lexical_bm25",
      "dense_vector",
      "metadata_filtering",
      "application_rrf",
      "application_mmr",
      "conditional_reranking",
    ]);
    expect(
      supportsPersistentMemoryVectorCapability(
        "weaviate-primary",
        "multi_vector",
      ),
    ).toBe(false);
    expect(
      supportsPersistentMemoryVectorCapability("qdrant-shadow", "multi_vector"),
    ).toBe(true);
    expect(
      supportsPersistentMemoryVectorCapability(
        "qdrant-shadow",
        "collection_aliases",
      ),
    ).toBe(true);
  });

  test("does not admit an unregistered hard-drift embedding provider", () => {
    const bgeM3ModelVersion: EmbeddingModelVersion = {
      id: "baai-bge-m3-unregistered",
      provider: "BAAI",
      model: "bge-m3",
      version: "unregistered",
      dimensions: 1024,
      metadata: {},
    };

    expect(() =>
      assertEmbeddingProviderAdmitted(bgeM3ModelVersion, []),
    ).toThrow(/hard drift/i);
    expect(() =>
      assertEmbeddingProviderAdmitted(bgeM3ModelVersion, [bgeM3ModelVersion]),
    ).not.toThrow();
  });

  test("uses the agreed continuation memory budget profile", () => {
    expect(
      validateMemoryBudgetProfile(
        MEMORY_CONTEXT_BUDGET_PROFILES.continue_from_last_session,
      ),
    ).toBe(true);
    expect(MEMORY_CONTEXT_BUDGET_PROFILES.continue_from_last_session).toEqual(
      expect.objectContaining({
        recent_rounds: 28,
        decisions: 30,
        state_snapshots: 14,
        state_deltas: 10,
        prevention_constraints: 13,
        facts: 5,
      }),
    );
    expect(
      MEMORY_CONTEXT_BUDGET_PROFILES
        .avoid_repetition_or_follow_constraints
        .prevention_constraints,
    ).toBe(45);
  });

  test("exposes the complete persistent memory command surface", () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    const required = [
      "agent:persistent-memory:init",
      "agent:persistent-memory:migrate",
      "agent:persistent-memory:index",
      "agent:persistent-memory:watch",
      "agent:persistent-memory:search",
      "agent:persistent-memory:status",
      "agent:persistent-memory:eval",
      "agent:persistent-memory:eval:golden",
      "agent:persistent-memory:eval:safety",
      "agent:persistent-memory:secrets:scan",
      "agent:persistent-memory:secrets:purge",
      "agent:persistent-memory:secrets:verify",
      "infra:up",
      "infra:down",
      "infra:status",
      "infra:logs",
      "infra:reset",
    ];

    for (const command of required) {
      expect(packageJson.scripts[command]).toEqual(expect.any(String));
    }
  });

  test("uses Podman as the official local infrastructure carrier", () => {
    const infraScript = readFileSync(
      join(process.cwd(), "scripts/infra.ps1"),
      "utf8",
    );

    expect(existsSync(join(process.cwd(), "podman-compose.infra.yml"))).toBe(true);
    expect(infraScript).toContain("podman compose");
    expect(infraScript).not.toMatch(/\bdocker\s+compose\b/i);
    expect(infraScript).not.toContain("Test-Docker");
  });
});
