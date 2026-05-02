import { describe, expect, test } from "vitest";

import {
  buildStartupMemoryContext,
  renderStartupMemoryContext,
} from "./startup-context";
import { InMemoryPersistentMemoryStore } from "./store";
import { createPersistentMemorySystem } from "./index";

describe("persistent memory startup context", () => {
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
