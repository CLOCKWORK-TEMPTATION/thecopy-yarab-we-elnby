import { describe, expect, it, vi } from "vitest";

const generateContent = vi.fn(() => ({
  text: JSON.stringify({ items: ["عنصر"] }),
}));

vi.mock("../../infrastructure/gemini/client", () => ({
  getGeminiClient: () => ({
    models: {
      generateContent,
    },
  }),
}));

import {
  runAllBreakdownAgents,
  runConfiguredAgent,
} from "../../infrastructure/agents/runner";

describe("agents runner", () => {
  it("يشغل وكيلاً واحدًا ويعيد العناصر", async () => {
    await expect(runConfiguredAgent("props", "نص المشهد")).resolves.toEqual([
      "عنصر",
    ]);
  });

  it("يبني نتيجة كاملة لكل مفاتيح التفريغ", async () => {
    const result = await runAllBreakdownAgents("نص المشهد");

    expect(result.props).toEqual(["عنصر"]);
    expect(result.locations).toEqual(["عنصر"]);
    expect(result.setDressing).toEqual(["عنصر"]);
    expect(result.sound).toEqual(["عنصر"]);
    expect(result.equipment).toEqual(["عنصر"]);
    expect(result.vfx).toEqual(["عنصر"]);
    expect(result.continuity).toEqual(["عنصر"]);
  });
});
