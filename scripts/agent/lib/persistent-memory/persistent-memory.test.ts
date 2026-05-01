import { describe, expect, test } from "vitest";

import {
  MemoryInjectionEnvelope,
  createPersistentMemorySystem,
  createShadowIndexController,
  isPersistentMemoryInfraRequired,
} from "./index";
import { MemorySecretScanner } from "./secrets";
import { InMemoryPersistentMemoryStore } from "./store";

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
        "DATABASE_URL=postgresql://user:super-secret@localhost:5432/app",
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
        modelVersionId: expect.any(String),
      }),
    );
    expect(retrieved.auditEventId).toEqual(expect.any(String));
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
      modelVersionId: "model-1",
      injectionProbability: 0.1,
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
        modelVersionId: "model-1",
      }),
    );
  });

  test("prevents shadow index promotion before parity and rollback readiness", () => {
    const controller = createShadowIndexController();

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
});
