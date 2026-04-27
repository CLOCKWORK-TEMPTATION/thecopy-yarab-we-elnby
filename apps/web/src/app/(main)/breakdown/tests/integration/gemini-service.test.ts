import { describe, expect, it, vi } from "vitest";

vi.mock("../../infrastructure/gemini/segment-script", () => ({
  segmentScript: vi.fn(() => ({
    scenes: [{ header: "مشهد 1", content: "محتوى المشهد" }],
  })),
}));

vi.mock("../../infrastructure/gemini/analyze-scene", () => ({
  analyzeScene: vi.fn(() => ({
    cast: [],
    costumes: [],
    makeup: [],
    setDressing: [],
    graphics: [],
    sound: [],
    equipment: [],
    vehicles: [],
    locations: [],
    extras: [],
    props: [],
    stunts: [],
    animals: [],
    spfx: [],
    vfx: [],
    continuity: [],
  })),
}));

vi.mock("../../infrastructure/gemini/analyze-scenarios", () => ({
  analyzeProductionScenarios: vi.fn(() => ({
    scenarios: [],
  })),
}));

import * as geminiService from "../../services/geminiService";

describe("geminiService compatibility layer", () => {
  it("يعيد تصدير تقسيم السيناريو من الطبقة الجديدة", async () => {
    await expect(geminiService.segmentScript("نص")).resolves.toEqual({
      scenes: [{ header: "مشهد 1", content: "محتوى المشهد" }],
    });
  });

  it("يعيد تصدير تحليل المشهد من الطبقة الجديدة", async () => {
    const result = await geminiService.analyzeScene("نص");
    expect(result.cast).toEqual([]);
    expect(result.props).toEqual([]);
    expect(result.sound).toEqual([]);
  });

  it("يعيد تصدير تحليل السيناريوهات من الطبقة الجديدة", async () => {
    await expect(
      geminiService.analyzeProductionScenarios("نص")
    ).resolves.toEqual({
      scenarios: [],
    });
  });
});
