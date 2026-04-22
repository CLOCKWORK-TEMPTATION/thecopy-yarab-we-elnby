import { describe, expect, it } from "vitest";

import {
  buildFallbackSevenStationsResult,
  serializeAnalysisValue,
} from "./seven-stations-fallback";

describe("seven-stations fallback", () => {
  it("ينتج حزمة كاملة قابلة للعرض للمحطات السبع", () => {
    const result = buildFallbackSevenStationsResult({
      fullText:
        "ليلى: لا أستطيع الهرب الآن.\n\nقال سامر إن العائلة ستدفع الثمن إذا انكشف السر. حاولت ليلى أن تقاوم الخوف لكنها أدركت أن الصراع يقترب من نقطة اللاعودة.",
      projectName: "اختبار التحليل",
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe("fallback");
    expect(Object.keys(result.stationOutputs)).toEqual([
      "station1",
      "station2",
      "station3",
      "station4",
      "station5",
      "station6",
      "station7",
    ]);
    expect(result.stationOutputs.station1.logline).toBeTruthy();
    expect(result.stationOutputs.station7.finalReport).toBeTruthy();
  });

  it("يحوّل البنى غير القابلة للتسلسل إلى قيم آمنة", () => {
    const serialized = serializeAnalysisValue({
      timestamp: new Date("2026-03-27T10:00:00.000Z"),
      metrics: new Map([
        ["score", 88],
        ["labels", new Set(["أ", "ب"])],
      ]),
    });

    expect(serialized).toEqual({
      timestamp: "2026-03-27T10:00:00.000Z",
      metrics: {
        score: 88,
        labels: ["أ", "ب"],
      },
    });
  });
});
