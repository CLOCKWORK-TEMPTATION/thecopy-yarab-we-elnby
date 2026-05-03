import { describe, expect, test } from "vitest";

import { createPersistentMemorySystem } from "./index";
import { InMemoryRepairJournal } from "./repair-journal";
import { SessionCloseGate } from "./session-close-gate";
import { InMemoryAgentSessionStore } from "./session-store";
import { InMemoryPersistentMemoryStore } from "./store";
import { buildTurnMemoryContext } from "./turn-context";

describe("persistent memory session close gate", () => {
  test("blocks close when a turn lacks required live context fields", async () => {
    const store = new InMemoryAgentSessionStore();
    const gate = new SessionCloseGate({ store });

    await store.markTurnStarted("turn-1", {
      sessionId: "session-a",
      rawQueryForRepair: "هل الحقول موجودة؟",
    });

    const report = await gate.inspectSession("session-a");

    expect(report.closable).toBe(false);
    expect(report.missing).toContainEqual(
      expect.objectContaining({
        turnId: "turn-1",
        fields: expect.arrayContaining([
          "turn_context_status",
          "retrieval_event_id",
          "audit_event_id",
          "memory_context",
        ]),
      }),
    );
    await expect(gate.assertSessionClosable("session-a")).rejects.toThrow(
      /not closable/i,
    );
  });

  test("repairs missing turn context from the stored turn query before close", async () => {
    const store = new InMemoryAgentSessionStore();
    const memorySystem = createPersistentMemorySystem({
      store: new InMemoryPersistentMemoryStore(),
    });
    await memorySystem.ingestRawEvent({
      sourceRef: "AGENTS.md",
      eventType: "decision",
      content: "قرار: بوابة الإغلاق تصلح سياق الدور المفقود قبل الحكم.",
      tags: ["repair", "close"],
    });
    const gate = new SessionCloseGate({
      store,
      buildContext: ({ query }) =>
        buildTurnMemoryContext({
          system: memorySystem,
          query,
        }),
    });

    await store.markTurnStarted("turn-1", {
      sessionId: "session-a",
      rawQueryForRepair: "هل بوابة الإغلاق تصلح سياق الدور؟",
    });

    const repair = await gate.repairMissingTurns("session-a");
    const report = await gate.assertSessionClosable("session-a");

    expect(repair.repairedTurns).toEqual(["turn-1"]);
    expect(report.closable).toBe(true);
    expect(report.pendingRepairJobs).toHaveLength(0);
  });

  test("blocks close while repair journal has pending work", async () => {
    const store = new InMemoryAgentSessionStore();
    const repairJournal = new InMemoryRepairJournal();
    const gate = new SessionCloseGate({ store, repairJournal });
    const context = await buildTurnMemoryContext({
      system: createPersistentMemorySystem({
        store: new InMemoryPersistentMemoryStore(),
      }),
      query: "هل توجد مهمة إصلاح معلقة؟",
    });

    await store.markTurnStarted("turn-1", {
      sessionId: "session-a",
      rawQueryForRepair: "هل توجد مهمة إصلاح معلقة؟",
    });
    await store.markTurnContextBuilt("turn-1", context);
    await store.markTurnAnswered("turn-1", "answer-1");
    await store.markTurnClosed("turn-1");
    await repairJournal.enqueue({
      sessionId: "session-a",
      turnId: "turn-1",
      kind: "audit_replay",
      reason: "audit write failed",
    });

    const report = await gate.inspectSession("session-a");

    expect(report.closable).toBe(false);
    expect(report.pendingRepairJobs).toEqual([
      expect.objectContaining({
        kind: "audit_replay",
        status: "pending",
      }),
    ]);
  });
});
