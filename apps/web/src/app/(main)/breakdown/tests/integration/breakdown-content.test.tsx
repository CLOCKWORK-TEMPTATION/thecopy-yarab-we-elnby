// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BreakdownContent from "../../breakdown-content";

const validReport = {
  id: "report-1",
  projectId: "project-1",
  title: "تقرير بريك دون جاهز",
  generatedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  source: "backend-breakdown" as const,
  summary: "ملخص تنفيذي جاهز",
  warnings: ["تحذير 1"],
  sceneCount: 1,
  totalPages: 1.5,
  totalEstimatedShootDays: 1,
  elementsByCategory: {
    الشخصيات: 2,
  },
  schedule: [],
  scenes: [],
};

describe("BreakdownContent", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("validate-pipeline: يقرأ تقرير البريك دون من التخزين قبل أي طلب شبكي", async () => {
    sessionStorage.setItem(
      "breakdownReportSnapshot",
      JSON.stringify(validReport)
    );

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<BreakdownContent />);

    expect(await screen.findByText("تقرير بريك دون جاهز")).toBeInTheDocument();
    expect(screen.getByText("ملخص تنفيذي جاهز")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validate-pipeline: يرجع إلى الملف الثابت إذا لم توجد لقطة محفوظة", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => validReport,
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<BreakdownContent />);

    await waitFor(() => {
      expect(screen.getByText("تقرير بريك دون جاهز")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/analysis_output/final-report.json"
    );
  });
});
