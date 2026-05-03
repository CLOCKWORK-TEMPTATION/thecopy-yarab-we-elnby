import { describe, expect, test } from "vitest";

import {
  buildTurnMemoryContext,
  renderTurnMemoryContext,
} from "./turn-context";
import { createPersistentMemorySystem } from "./index";
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

    expect(budgetContext.envelope.items.map((item) => item.content)).toContain(
      expect.stringContaining("تصدير الميزانية"),
    );
    expect(budgetContext.envelope.items.map((item) => item.content)).not.toContain(
      expect.stringContaining("كروت الهيرو"),
    );
    expect(heroContext.envelope.items.map((item) => item.content)).toContain(
      expect.stringContaining("كروت الهيرو"),
    );
    expect(heroContext.envelope.items.map((item) => item.content)).not.toContain(
      expect.stringContaining("تصدير الميزانية"),
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
    expect(rendered).toContain("هل الحقن الحي يعتمد على السؤال؟");
    expect(rendered).toContain("memory_context");
  });
});
