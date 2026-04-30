import { describe, expect, it } from "vitest";

import { buildFallbackSevenStationsResult } from "./seven-stations-fallback";

import type { FallbackInput } from "./seven-stations-fallback/types";

describe("buildFallbackSevenStationsResult", () => {
  it("should return a fallback analysis pipeline payload for short text", () => {
    const input: FallbackInput = {
      fullText: "Short text.",
      projectName: "Test Project",
    };

    const result = buildFallbackSevenStationsResult(input);

    expect(result.success).toBe(true);
    expect(result.mode).toBe("fallback");
    expect(result.warnings).toEqual([]);
    expect(result.metadata["analysisMode"]).toBe("fallback");
    expect(result.metadata["projectName"]).toBe("Test Project");

    // Stations outputs are present
    expect(result.stationOutputs.station1).toBeDefined();
    expect(result.stationOutputs.station2).toBeDefined();
    expect(result.stationOutputs.station3).toBeDefined();
    expect(result.stationOutputs.station4).toBeDefined();
    expect(result.stationOutputs.station5).toBeDefined();
    expect(result.stationOutputs.station6).toBeDefined();
    expect(result.stationOutputs.station7).toBeDefined();
  });

  it("should handle warning if provided", () => {
    const input: FallbackInput = {
      fullText: "Some text to analyze.",
      projectName: "Warning Project",
      warning: "This is a warning.",
    };

    const result = buildFallbackSevenStationsResult(input);

    expect(result.success).toBe(true);
    expect(result.warnings).toEqual(["This is a warning."]);
  });

  it("should handle a larger text input", () => {
    const fullText = Array(100)
      .fill("Ali and Sarah went to the market to buy some groceries.")
      .join(" ");

    const input: FallbackInput = {
      fullText,
      projectName: "Large Project",
    };

    const result = buildFallbackSevenStationsResult(input);

    expect(result.success).toBe(true);
    expect(result.metadata["textLength"]).toBe(fullText.length);
  });
});
