import { describe, expect, test } from "vitest";

import { buildTurnMemoryContext } from "./turn-context";
import { createPersistentMemorySystem } from "./index";
import {
  InMemoryAgentSessionStore,
  type AgentSessionItem,
} from "./session-store";
import { PostgresAgentSessionStore } from "./postgres-store";
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

  test("persists session items and turn lifecycle through the postgres session store", async () => {
    const client = new FakeSessionSqlClient();
    const store = new PostgresAgentSessionStore(client);
    const context = await buildTurnMemoryContext({
      system: createPersistentMemorySystem({
        store: new InMemoryPersistentMemoryStore(),
      }),
      query: "هل سياق السؤال الحي محفوظ في قاعدة البيانات؟",
    });

    await store.appendSessionItems("session-pg", [
      {
        id: "pg-item-1",
        sessionId: "session-pg",
        role: "user",
        contentRef: "turn-pg-1",
        content: "هل سياق السؤال الحي محفوظ في قاعدة البيانات؟",
      },
    ]);
    await store.markTurnStarted("turn-pg-1", {
      sessionId: "session-pg",
      rawQueryForRepair: "هل سياق السؤال الحي محفوظ في قاعدة البيانات؟",
    });
    await store.markTurnContextBuilt("turn-pg-1", context);
    await store.markTurnAnswered("turn-pg-1", "answer-pg-1");
    await store.markTurnClosed("turn-pg-1");

    expect(await store.getSessionItems("session-pg")).toEqual([
      expect.objectContaining({
        id: "pg-item-1",
        contentRef: "turn-pg-1",
      }),
    ]);
    expect(await store.findIncompleteTurns("session-pg")).toEqual([]);
    expect(await store.getTurnContextRecord("turn-pg-1")).toEqual(
      expect.objectContaining({
        turnId: "turn-pg-1",
        sessionId: "session-pg",
        turnContextStatus: "ready",
        queryHash: context.queryHash,
        retrievalEventId: expect.any(String),
        auditEventId: expect.any(String),
        memoryContext: expect.any(String),
        closed: true,
      }),
    );
  });
});

type FakeQueryResult<T> = { rows: T[] };

class FakeSessionSqlClient {
  readonly items: AgentSessionItem[] = [];
  readonly turns = new Map<string, Record<string, unknown>>();

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values: unknown[] = [],
  ): Promise<FakeQueryResult<T>> {
    const normalized = sql.replace(/\s+/g, " ").trim();

    if (normalized.startsWith("INSERT INTO persistent_agent_memory.session_items")) {
      this.items.push({
        id: String(values[0]),
        sessionId: String(values[1]),
        role: values[2] as AgentSessionItem["role"],
        contentRef: String(values[3]),
        content: String(values[4]),
        tags: values[5] ? (JSON.parse(String(values[5])) as string[]) : [],
        createdAt: String(values[6]),
      });
      return { rows: [] as T[] };
    }

    if (normalized.startsWith("SELECT id, session_id, role, content_ref, content, tags, created_at FROM persistent_agent_memory.session_items")) {
      const sessionId = String(values[0]);
      const rows = this.items
        .filter((item) => item.sessionId === sessionId)
        .map((item) => ({
          id: item.id,
          session_id: item.sessionId,
          role: item.role,
          content_ref: item.contentRef,
          content: item.content,
          tags: item.tags ?? [],
          created_at: item.createdAt,
        }));
      return { rows: rows as T[] };
    }

    if (normalized.startsWith("DELETE FROM persistent_agent_memory.session_items")) {
      const sessionId = String(values[0]);
      const keepIds = new Set(values.slice(1).map(String));
      for (let index = this.items.length - 1; index >= 0; index -= 1) {
        const item = this.items[index];
        if (item.sessionId === sessionId && !keepIds.has(item.id)) {
          this.items.splice(index, 1);
        }
      }
      return { rows: [] as T[] };
    }

    if (normalized.startsWith("INSERT INTO persistent_agent_memory.turn_context_records")) {
      const row = {
        turn_id: values[0],
        session_id: values[1],
        query_hash: values[2],
        redacted_query_preview: values[3],
        turn_context_status: values[4],
        selected_intent: values[5],
        selected_profile: values[6],
        retrieval_event_id: values[7],
        audit_event_id: values[8],
        memory_context: values[9],
        latency_ms: values[10],
        answer_ref: values[11],
        closed: values[12],
        metadata: values[13] ? JSON.parse(String(values[13])) : {},
        created_at: values[14],
        updated_at: values[15],
      };
      this.turns.set(String(values[0]), row);
      return { rows: [row] as T[] };
    }

    if (normalized.startsWith("UPDATE persistent_agent_memory.turn_context_records")) {
      const turnId = String(values.at(-1));
      const existing = this.turns.get(turnId);
      if (!existing) {
        return { rows: [] as T[] };
      }

      if (normalized.includes("query_hash =")) {
        existing.query_hash = values[0];
        existing.redacted_query_preview = values[1];
        existing.turn_context_status = values[2];
        existing.selected_intent = values[3];
        existing.selected_profile = values[4];
        existing.retrieval_event_id = values[5];
        existing.audit_event_id = values[6];
        existing.memory_context = values[7];
        existing.latency_ms = values[8];
        existing.updated_at = values[9];
      } else if (normalized.includes("answer_ref =")) {
        existing.answer_ref = values[0];
        existing.updated_at = values[1];
      } else if (normalized.includes("closed = true")) {
        existing.closed = true;
        existing.updated_at = values[0];
      }
      return { rows: [existing] as T[] };
    }

    if (normalized.startsWith("SELECT turn_id, session_id, query_hash")) {
      if (normalized.includes("WHERE turn_id =")) {
        const row = this.turns.get(String(values[0]));
        return { rows: (row ? [row] : []) as T[] };
      }
      if (normalized.includes("WHERE session_id =")) {
        const sessionId = String(values[0]);
        const rows = [...this.turns.values()].filter(
          (row) => row.session_id === sessionId,
        );
        return { rows: rows as T[] };
      }
    }

    throw new Error(`Unexpected SQL in fake client: ${normalized}`);
  }
}
