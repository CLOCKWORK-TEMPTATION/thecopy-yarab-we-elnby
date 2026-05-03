import { describe, expect, test } from "vitest";

import {
  buildStartupMemoryContext,
  readStartupSources,
  renderStartupMemoryContext,
} from "./startup-context";
import { InMemoryPersistentMemoryStore } from "./store";
import { createPersistentMemorySystem } from "./index";

describe("persistent memory startup context", () => {
  test("loads first-response memory requirements as startup sources", async () => {
    const sources = await readStartupSources();
    const requirement = sources.find(
      (source) => source.path === "AGENTS.md" && source.eventType === "decision",
    );
    const startupProtocolRequirement = sources.find(
      (source) =>
        source.path === ".repo-agent/STARTUP-PROTOCOL.md" &&
        source.eventType === "memory",
    );

    expect(requirement?.content).toContain("قبل أول عمل أو رد تنفيذي");
    expect(requirement?.content).toContain("سياق الذاكرة الدائمة");
    expect(startupProtocolRequirement?.content).toContain(
      ".repo-agent/PERSISTENT-MEMORY-CONTEXT.generated.md",
    );
    expect(startupProtocolRequirement?.content).toContain("memory_context");
  });

  test("renders retrieved memories for automatic startup injection", async () => {
    const store = new InMemoryPersistentMemoryStore();
    const system = createPersistentMemorySystem({ store });

    await system.ingestRawEvent({
      sourceRef: "output/round-notes.md",
      eventType: "decision",
      content:
        "Decision: next sessions must load persistent memory before starting work.",
      tags: ["startup", "decision"],
    });
    await system.ingestRawEvent({
      sourceRef: "output/session-state.md",
      eventType: "state_snapshot",
      content:
        "State: persistent-agent-memory is the governed durable memory scope.",
      tags: ["state"],
    });

    const context = await buildStartupMemoryContext({
      system,
      query: "next sessions persistent memory",
    });
    const rendered = renderStartupMemoryContext(context);

    expect(context.status).toBe("ready");
    expect(context.envelope.zone).toBe("memory_context");
    expect(context.envelope.items.length).toBeGreaterThan(0);
    expect(rendered).toContain("Persistent Memory Startup Context");
    expect(rendered).toContain("memory_context");
    expect(rendered).toContain("output/round-notes.md");
  });

  test("pins first-response startup requirements ahead of broad state snapshots", async () => {
    const store = new InMemoryPersistentMemoryStore();
    const system = createPersistentMemorySystem({ store });

    for (let index = 0; index < 12; index += 1) {
      await system.ingestRawEvent({
        sourceRef: "output/session-state.md",
        eventType: "state_snapshot",
        content: `previous decisions persistent memory source of truth continue from last session current state constraints avoid repetition follow constraints current state persistent-agent-memory snapshot ${index}`,
        tags: ["state"],
      });
    }
    await system.ingestRawEvent({
      sourceRef: "AGENTS.md",
      eventType: "decision",
      content:
        "قرار حاكم: يجب أن يبدأ الوكيل من سياق الذاكرة الدائمة المولد قبل أول عمل أو رد تنفيذي.",
      tags: ["startup", "decision"],
    });
    await system.ingestRawEvent({
      sourceRef: "AGENTS.md",
      eventType: "memory",
      content:
        "قرار حاكم عالي الثقة: يجب أن يبدأ الوكيل من سياق الذاكرة الدائمة المولد قبل أول عمل أو رد تنفيذي.",
      tags: ["startup", "decision"],
    });

    const context = await buildStartupMemoryContext({ system });
    const pinnedItems = context.envelope.items.filter((item) =>
      item.content.includes("قبل أول عمل أو رد تنفيذي"),
    );
    const pinned = pinnedItems[0];

    expect(pinnedItems).toHaveLength(1);
    expect(pinned).toBeDefined();
    expect(pinned?.trustLevel).toBe("high");
  });

  test("does not inject broad state snapshots into startup context", async () => {
    const store = new InMemoryPersistentMemoryStore();
    const system = createPersistentMemorySystem({ store });

    await system.ingestRawEvent({
      sourceRef: "output/session-state.md",
      eventType: "state_snapshot",
      content:
        "لقطة حالة عامة طويلة عن كل الخدمات والملفات والقرارات السابقة.",
      tags: ["state"],
    });
    await system.ingestRawEvent({
      sourceRef: "AGENTS.md",
      eventType: "memory",
      content:
        "قرار حاكم عالي الثقة: يجب أن يبدأ الوكيل من سياق الذاكرة الدائمة المولد قبل أول عمل أو رد تنفيذي.",
      tags: ["startup", "decision"],
    });

    const context = await buildStartupMemoryContext({ system });

    expect(context.envelope.items).toHaveLength(1);
    expect(context.envelope.items[0]?.sourceRef).toBe("AGENTS.md");
    expect(context.envelope.items[0]?.content).toContain(
      "قبل أول عمل أو رد تنفيذي",
    );
  });

  test("renders a degraded startup context without blocking bootstrap", () => {
    const rendered = renderStartupMemoryContext({
      status: "degraded",
      reason: "local infrastructure is not available",
      retrievalEventId: null,
      auditEventId: null,
      envelope: {
        zone: "memory_context",
        items: [],
      },
    });

    expect(rendered).toContain("status: degraded");
    expect(rendered).toContain("local infrastructure is not available");
  });

  test("trims injected memory excerpts before writing generated context", () => {
    const rendered = renderStartupMemoryContext({
      status: "ready",
      retrievalEventId: "retrieval-1",
      auditEventId: "audit-1",
      envelope: {
        zone: "memory_context",
        items: [
          {
            id: "memory-1",
            sourceRef: "output/session-state.md",
            trustLevel: "high",
            modelVersionId: "model-1",
            score: 1,
            content: `state with trailing whitespace ${" ".repeat(600)}`,
          },
        ],
      },
    });

    const textLine = rendered
      .split("\n")
      .find((line) => line.startsWith("  text: "));

    expect(textLine).toBeDefined();
    expect(textLine?.endsWith(" ")).toBe(false);
  });
});
