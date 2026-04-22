import { describe, expect, it } from "vitest";

import { heroConfig } from "../hero-config";

describe("heroConfig", () => {
  const baseline = heroConfig.getResponsiveValues(1440);

  it("locks the seven-card hero layout across viewport widths", () => {
    for (const width of [390, 768, 1024, 1280, 1600]) {
      expect(heroConfig.getResponsiveValues(width)).toEqual(baseline);
    }
  });

  it("keeps the original seven-card V-shape positions", () => {
    expect(baseline.cardPositions).toEqual([
      { left: "30%", top: "34%", rotation: -6 },
      { left: "36%", top: "45%", rotation: -3 },
      { left: "43%", top: "56%", rotation: -1 },
      { left: "50%", top: "67%", rotation: 0 },
      { left: "57%", top: "56%", rotation: 1 },
      { left: "64%", top: "45%", rotation: 3 },
      { left: "70%", top: "34%", rotation: 6 },
    ]);
    expect(baseline.cardWidth).toBe(190);
    expect(baseline.cardHeight).toBe(275);
    expect(baseline.scale).toBe(0.82);
  });
});
