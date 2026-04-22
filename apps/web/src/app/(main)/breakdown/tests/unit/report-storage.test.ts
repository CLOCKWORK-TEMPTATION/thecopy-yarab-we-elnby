import { describe, expect, it, vi } from "vitest";
import {
  breakdownReportErrors,
  readAnalysisReportFromStorage,
  readStoredProjectId,
  readStoredReportId,
  writeAnalysisReportToStorage,
} from "../../breakdown-report";

const validReport = {
  id: "report-1",
  projectId: "project-1",
  title: "تقرير بريك دون",
  generatedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  source: "backend-breakdown" as const,
  summary: "ملخص تنفيذي",
  warnings: ["تحذير 1"],
  sceneCount: 1,
  totalPages: 1.25,
  totalEstimatedShootDays: 1,
  elementsByCategory: { الشخصيات: 2 },
  schedule: [],
  scenes: [],
};

describe("readAnalysisReportFromStorage", () => {
  it("يعيد خطأ واضحًا عند عدم وجود تقرير محفوظ", () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
    };

    expect(readAnalysisReportFromStorage(storage)).toEqual({
      success: false,
      error: breakdownReportErrors.missingResults,
    });
  });

  it("يقرأ تقرير البريك دون الحديث من التخزين", () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify(validReport)),
    };

    const result = readAnalysisReportFromStorage(storage);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.projectId).toBe("project-1");
      expect(result.data.elementsByCategory.الشخصيات).toBe(2);
    }
  });

  it("يحفظ معرفي المشروع والتقرير مع اللقطة الكاملة", () => {
    const storage = {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn(),
    };
    const store: Record<string, string> = {};

    writeAnalysisReportToStorage(validReport, storage);

    expect(readStoredProjectId(storage)).toBe("project-1");
    expect(readStoredReportId(storage)).toBe("report-1");
    expect(readAnalysisReportFromStorage(storage)).toEqual({
      success: true,
      data: validReport,
    });
  });

  it("يعيد خطأ تنسيق عند وجود تقرير غير صالح", () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(
        JSON.stringify({
          id: "broken-report",
          projectId: "project-1",
        })
      ),
    };

    expect(readAnalysisReportFromStorage(storage)).toEqual({
      success: false,
      error: breakdownReportErrors.invalidFormat,
    });
  });

  it("يعيد خطأ تحميل عند وجود JSON غير صالح", () => {
    const storage = {
      getItem: vi.fn().mockReturnValue("{invalid-json"),
    };

    expect(readAnalysisReportFromStorage(storage)).toEqual({
      success: false,
      error: breakdownReportErrors.loadFailed,
    });
  });
});
