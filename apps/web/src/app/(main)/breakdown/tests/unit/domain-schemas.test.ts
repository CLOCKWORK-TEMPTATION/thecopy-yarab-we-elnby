import { describe, expect, it } from "vitest";
import {
  validateAnalysisReport,
  validateSceneBreakdown,
  validateScriptSegmentResponse,
} from "../../schemas";

describe("domain schemas", () => {
  it("يملأ القيم الافتراضية في تفريغ المشهد", () => {
    const result = validateSceneBreakdown({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cast).toEqual([]);
      expect(result.data.props).toEqual([]);
      expect(result.data.setDressing).toEqual([]);
      expect(result.data.sound).toEqual([]);
      expect(result.data.equipment).toEqual([]);
      expect(result.data.continuity).toEqual([]);
      expect(result.data.elements).toEqual([]);
      expect(result.data.stats.cast).toBe(0);
    }
  });

  it("يرفض استجابة تقسيم غير صالحة", () => {
    const result = validateScriptSegmentResponse({ scenes: [{ header: 1 }] });

    expect(result.success).toBe(false);
  });

  it("يقبل تقرير تحليل صحيح", () => {
    const result = validateAnalysisReport({
      id: "report-1",
      projectId: "project-1",
      title: "تقرير بريك دون",
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "backend-breakdown",
      summary: "ملخص",
      warnings: [],
      sceneCount: 1,
      totalPages: 1,
      totalEstimatedShootDays: 1,
      elementsByCategory: {
        الشخصيات: 2,
      },
      schedule: [],
      scenes: [],
    });

    expect(result.success).toBe(true);
  });
});
