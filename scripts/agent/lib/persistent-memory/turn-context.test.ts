import { describe, expect, test } from "vitest";

import {
  buildTurnMemoryContext,
  classifyTurnMemoryIntent,
  renderTurnMemoryContext,
} from "./turn-context";
import { createPersistentMemorySystem } from "./index";
import { BGE_M3_EMBEDDING_MODEL_VERSION } from "./embeddings";
import { InMemoryPersistentMemoryStore } from "./store";

describe("persistent memory turn context", () => {
  test("selects injected memories from the current question", async () => {
    const store = new InMemoryPersistentMemoryStore();
    const system = createPersistentMemorySystem({ store });

    await system.ingestRawEvent({
      sourceRef: "output/round-notes.md",
      eventType: "decision",
      content:
        "قرار ميزانية: مسار تصدير الميزانية يجب أن ينتج ملف جدول حقيقي عند غياب الخادم الخلفي.",
      tags: ["budget", "export"],
    });
    await system.ingestRawEvent({
      sourceRef: "output/round-notes.md",
      eventType: "decision",
      content:
        "قيد الواجهة: تموضع كروت الهيرو السبعة ثابت ولا يجوز تغييره تلقائيًا.",
      tags: ["hero", "layout"],
    });

    const budgetContext = await buildTurnMemoryContext({
      system,
      query: "هل تصدير الميزانية يعمل عند غياب الخادم الخلفي؟",
    });
    const heroContext = await buildTurnMemoryContext({
      system,
      query: "ما قيد تموضع كروت الهيرو؟",
    });

    expect(budgetContext.envelope.items.map((item) => item.content)).toEqual(
      expect.arrayContaining([expect.stringContaining("تصدير الميزانية")]),
    );
    expect(budgetContext.envelope.items.map((item) => item.content)).not.toEqual(
      expect.arrayContaining([expect.stringContaining("كروت الهيرو")]),
    );
    expect(heroContext.envelope.items.map((item) => item.content)).toEqual(
      expect.arrayContaining([expect.stringContaining("كروت الهيرو")]),
    );
    expect(heroContext.envelope.items.map((item) => item.content)).not.toEqual(
      expect.arrayContaining([expect.stringContaining("تصدير الميزانية")]),
    );
  });

  test("different questions produce different contexts", async () => {
    const store = new InMemoryPersistentMemoryStore();
    const system = createPersistentMemorySystem({ store });

    await system.ingestRawEvent({
      sourceRef: "memory/budget",
      eventType: "decision",
      content: "قرار ميزانية: تصدير الميزانية يعمل عبر ملف جدول.",
      tags: ["budget"],
    });
    await system.ingestRawEvent({
      sourceRef: "memory/constraints",
      eventType: "memory",
      content: "قيد عدم التكرار: لا تستخدم حقنًا عامًا لكل الأسئلة.",
      tags: ["constraints"],
    });

    const first = await buildTurnMemoryContext({
      system,
      query: "ما قرار تصدير الميزانية؟",
    });
    const second = await buildTurnMemoryContext({
      system,
      query: "ما الذي لا يجب تكراره؟",
    });

    expect(first.queryHash).not.toBe(second.queryHash);
    expect(first.envelope.items.map((item) => item.sourceRef)).not.toEqual(
      second.envelope.items.map((item) => item.sourceRef),
    );
  });

  test("renders a live question context in the memory zone", async () => {
    const store = new InMemoryPersistentMemoryStore();
    const system = createPersistentMemorySystem({ store });

    await system.ingestRawEvent({
      sourceRef: "AGENTS.md",
      eventType: "decision",
      content:
        "قرار حاكم عالي الثقة: الحقن الحي يجب أن يعتمد على نص السؤال الحالي.",
      tags: ["live", "question"],
    });

    const context = await buildTurnMemoryContext({
      system,
      query: "هل الحقن الحي يعتمد على السؤال؟",
    });
    const rendered = renderTurnMemoryContext(context);

    expect(context.status).toBe("ready");
    expect(context.envelope.zone).toBe("memory_context");
    expect(rendered).toContain("Persistent Memory Live Turn Context");
    expect(rendered).toContain("query_hash:");
    expect(rendered).toContain("redacted_query_preview:");
    expect(rendered).not.toContain("query: هل الحقن الحي يعتمد على السؤال؟");
    expect(rendered).toContain("memory_context");
  });

  test("rejects an empty current question before retrieval", async () => {
    await expect(
      buildTurnMemoryContext({
        query: "   ",
        system: createPersistentMemorySystem({
          store: new InMemoryPersistentMemoryStore(),
        }),
      }),
    ).rejects.toThrow(/current user question/i);
  });

  test("keeps secret question text out of rendered context", async () => {
    const secretQuery =
      "راجع DATABASE_URL=postgresql://user:super-secret@localhost:5432/app";
    const context = await buildTurnMemoryContext({
      system: createPersistentMemorySystem({
        store: new InMemoryPersistentMemoryStore(),
      }),
      query: secretQuery,
    });
    const rendered = renderTurnMemoryContext(context);

    expect(context.secretScanStatus).toBe("rejected");
    expect(context.queryHash).toEqual(expect.any(String));
    expect(rendered).toContain("query_hash:");
    expect(rendered).toContain("redacted_query_preview:");
    expect(rendered).not.toContain("super-secret");
    expect(rendered).not.toContain(secretQuery);
  });

  test("records live turn metadata required by the close gate", async () => {
    const store = new InMemoryPersistentMemoryStore();
    const system = createPersistentMemorySystem({ store });

    await system.ingestRawEvent({
      sourceRef: "AGENTS.md",
      eventType: "decision",
      content: "قرار: كل دور يجب أن يملك سياق سؤال حي قبل الرد.",
      tags: ["turn", "context"],
    });

    const context = await buildTurnMemoryContext({
      system,
      query: "ما قرار سياق السؤال الحي لكل دور؟",
    });
    const rendered = renderTurnMemoryContext(context);

    expect(context.turnContextStatus).toBe("ready");
    expect(context.queryHash).toMatch(/^[a-f0-9]{64}$/);
    expect(context.selectedIntent).toBe("prior_decision_lookup");
    expect(context.selectedProfile).toBe("prior_decision_lookup");
    expect(context.retrievalEventId).toEqual(expect.any(String));
    expect(context.auditEventId).toEqual(expect.any(String));
    expect(context.latencyMs).toEqual(expect.any(Number));
    expect(rendered).toContain("turn_context_status: ready");
    expect(rendered).toContain("degradation_reason:");
    expect(rendered).toContain("repair_job_id:");
    expect(rendered).toContain("memory_context:");
  });

  test("prefers the newest current state memory when matches are otherwise equal", async () => {
    const store = new InMemoryPersistentMemoryStore();
    const system = createPersistentMemorySystem({ store });

    store.memories.push(
      {
        id: "old-state",
        candidateId: "old-state-candidate",
        sourceRef: "output/session-state.md",
        contentHash: "old-state-hash",
        content: "حالة البنية المحلية قديمة على فرع سابق.",
        memoryType: "state_snapshot",
        tags: ["state", "infra"],
        trustLevel: "medium",
        modelVersionId: BGE_M3_EMBEDDING_MODEL_VERSION.id,
        injectionProbability: 0.1,
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z",
      },
      {
        id: "new-state",
        candidateId: "new-state-candidate",
        sourceRef: "output/session-state.md",
        contentHash: "new-state-hash",
        content: "حالة البنية المحلية حديثة على الفرع الرئيسي.",
        memoryType: "state_snapshot",
        tags: ["state", "infra"],
        trustLevel: "medium",
        modelVersionId: BGE_M3_EMBEDDING_MODEL_VERSION.id,
        injectionProbability: 0.1,
        createdAt: "2026-05-03T00:00:00.000Z",
        updatedAt: "2026-05-03T00:00:00.000Z",
      },
    );

    const context = await buildTurnMemoryContext({
      system,
      query: "ما حالة البنية المحلية؟",
      topK: 1,
    });

    expect(context.selectedIntent).toBe("current_state_lookup");
    expect(context.envelope.items[0]?.id).toBe("new-state");
  });

  test("injects live state source ahead of stale long term state for current state questions", async () => {
    const store = new InMemoryPersistentMemoryStore();
    const system = createPersistentMemorySystem({ store });

    await system.ingestRawEvent({
      sourceRef: "output/session-state.md",
      eventType: "state_snapshot",
      content: "حالة البنية المحلية قديمة على فرع سابق.",
      tags: ["state", "infra"],
    });

    const context = await buildTurnMemoryContext({
      system,
      query: "ما حالة البنية المحلية؟",
      liveStateSources: [
        {
          sourceRef: "output/session-state.md",
          content: "حالة البنية المحلية حديثة على الفرع الرئيسي.",
        },
      ],
    });

    expect(context.envelope.items[0]?.id).toBe("live-state-output-session-state-md");
    expect(context.envelope.items[0]?.content).toContain("حديثة");
  });

  test("high risk memory quarantined away from live turn injection", async () => {
    const store = new InMemoryPersistentMemoryStore();
    const system = createPersistentMemorySystem({ store });
    const timestamp = new Date(0).toISOString();

    store.memories.push({
      id: "risk-memory",
      candidateId: "risk-candidate",
      sourceRef: "risk/source",
      contentHash: "hash-risk",
      content: "risk memory: لا يجب حقن هذه الذاكرة عالية الخطر.",
      memoryType: "memory",
      tags: ["risk"],
      trustLevel: "high",
      modelVersionId: BGE_M3_EMBEDDING_MODEL_VERSION.id,
      injectionProbability: 0.95,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await system.ingestRawEvent({
      sourceRef: "safe/source",
      eventType: "memory",
      content: "safe memory: حقن آمن لسؤال risk.",
      tags: ["risk"],
    });

    const context = await buildTurnMemoryContext({
      system,
      query: "risk memory",
    });

    expect(context.envelope.items.map((item) => item.id)).not.toContain(
      "risk-memory",
    );
    expect(context.envelope.items.map((item) => item.sourceRef)).toContain(
      "safe/source",
    );
  });

  test("classifies execution and constraint questions from the current query", () => {
    expect(classifyTurnMemoryIntent("نفذ الخطة واكتب الاختبارات")).toBe(
      "execution_or_code_change",
    );
    expect(classifyTurnMemoryIntent("ما الذي لا يجب تكراره؟")).toBe(
      "avoid_repetition_or_follow_constraints",
    );
  });
});
