import { describe, expect, test } from "vitest";

import { buildTurnMemoryContext } from "./turn-context";
import { createPersistentMemorySystem } from "./index";
import {
  InMemoryAgentSessionStore,
  type AgentSessionItem,
} from "./session-store";
import { InMemoryPersistentMemoryStore } from "./store";

describe("agent session store", () => {
  test("resumes appended session items by session id without mixing sessions", async () => {
    const store = new InMemoryAgentSessionStore();
    const items: AgentSessionItem[] = [
      {
        id: "item-user-1",
        sessionId: "session-a",
        role: "user",
        contentRef: "user-input-1",
        content: "نفذ خطة الذاكرة الحية",
      },
      {
        id: "item-agent-1",
        sessionId: "session-a",
        role: "assistant",
        contentRef: "assistant-output-1",
        content: "بدأت التنفيذ بعد سياق السؤال.",
      },
    ];

    await store.appendSessionItems("session-a", items);
    await store.appendSessionItems("session-b", [
      {
        id: "item-user-2",
        sessionId: "session-b",
        role: "user",
        contentRef: "user-input-2",
        content: "سؤال آخر",
      },
    ]);

    expect(await store.getSessionItems("session-a")).toEqual([
      expect.objectContaining(items[0]),
      expect.objectContaining(items[1]),
    ]);
    expect(await store.getRecentTurns("session-a", 1)).toEqual([
      expect.objectContaining({
        role: "assistant",
        contentRef: "assistant-output-1",
      }),
    ]);
  });

  test("tracks turn lifecycle fields required by the close gate", async () => {
    const sessionStore = new InMemoryAgentSessionStore();
    const memorySystem = createPersistentMemorySystem({
      store: new InMemoryPersistentMemoryStore(),
    });
    await memorySystem.ingestRawEvent({
      sourceRef: "AGENTS.md",
      eventType: "decision",
      content: "قرار: إغلاق الجلسة لا يمر قبل سياق سؤال حي.",
      tags: ["close", "gate"],
    });

    await sessionStore.markTurnStarted("turn-1", {
      sessionId: "session-a",
      rawQueryForRepair: "هل إغلاق الجلسة يحتاج سياق سؤال حي؟",
    });
    const context = await buildTurnMemoryContext({
      system: memorySystem,
      query: "هل إغلاق الجلسة يحتاج سياق سؤال حي؟",
    });

    await sessionStore.markTurnContextBuilt("turn-1", context);
    await sessionStore.markTurnAnswered("turn-1", "answer-1");
    await sessionStore.markTurnClosed("turn-1");

    expect(await sessionStore.findIncompleteTurns("session-a")).toEqual([]);
    expect(await sessionStore.getTurnContextRecord("turn-1")).toEqual(
      expect.objectContaining({
        turnContextStatus: "ready",
        queryHash: context.queryHash,
        retrievalEventId: expect.any(String),
        auditEventId: expect.any(String),
        memoryContext: expect.any(String),
      }),
    );
  });

  test("compacts old session items without removing decision and constraint records", async () => {
    const store = new InMemoryAgentSessionStore();
    await store.appendSessionItems("session-a", [
      {
        id: "item-1",
        sessionId: "session-a",
        role: "user",
        contentRef: "turn-1",
        content: "قرار: لا تكرر الحقن العام.",
        tags: ["decision"],
      },
      {
        id: "item-2",
        sessionId: "session-a",
        role: "assistant",
        contentRef: "turn-2",
        content: "رد عام يمكن ضغطه.",
      },
      {
        id: "item-3",
        sessionId: "session-a",
        role: "user",
        contentRef: "turn-3",
        content: "قيد: لا تستخدم أرشيفًا واسعًا.",
        tags: ["constraint"],
      },
    ]);

    await store.compactSession("session-a", { keepLast: 1 });

    expect(await store.getSessionItems("session-a")).toEqual([
      expect.objectContaining({ id: "item-1" }),
      expect.objectContaining({ id: "item-3" }),
    ]);
  });
});
