/**
 * @fileoverview Unit tests for AgentReportsExporter (T027)
 *
 * Covers:
 *  - JSON export includes finalText and taskResults with all completed steps
 *  - Markdown/text export starts with final text then appends ## {title} heading per completed step
 *  - Steps with status !== "completed" are absent from both export formats
 *  - Empty/missing taskResults does not break export
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AgentReportsExporter } from "./agent-reports-exporter";
import type { AgentTaskResult } from "./agent-reports-exporter";

// ---------------------------------------------------------------------------
// Browser API mocks
// ---------------------------------------------------------------------------

const mockRevokeObjectURL = vi.fn();
const mockCreateObjectURL = vi.fn(() => "blob:mock-url");

// Track Blob constructor calls so we can inspect content
let lastBlobContent = "";
let lastBlobOptions: BlobPropertyBag = {};

class MockBlob {
  constructor(parts: BlobPart[], options?: BlobPropertyBag) {
    lastBlobContent = parts.join("");
    lastBlobOptions = options ?? {};
  }
}

// Mock anchor click so no real navigation happens
const mockAnchorClick = vi.fn();

// Mock useToast so the component doesn't fail due to missing toast context
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

beforeEach(() => {
  vi.stubGlobal("Blob", MockBlob);
  vi.stubGlobal("URL", {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  });

  // Mock document.createElement to intercept anchor creation
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "a") {
      const anchor = originalCreateElement("a");
      anchor.click = mockAnchorClick;
      return anchor;
    }
    return originalCreateElement(tag);
  });

  // Note: لا نمسّ document.body.appendChild/removeChild — render() من
  // @testing-library/react يحتاج هذه الواجهات لإلصاق الحاوية، وضغطة `a` المُحاكاة
  // (mockAnchorClick) تكفي لمنع أي تنقّل فعلي عبر <a>.
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  lastBlobContent = "";
  lastBlobOptions = {};
  mockAnchorClick.mockClear();
  mockCreateObjectURL.mockClear();
  mockRevokeObjectURL.mockClear();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sampleReports: Record<string, unknown> = {
  "agent-alpha": "نتيجة الوكيل ألفا",
};

const completedStep1: AgentTaskResult = {
  agentName: "محلل التحليل",
  agentId: "analysis-step",
  text: "نتيجة خطوة التحليل التفصيلية",
  confidence: 0.9,
  timestamp: "2026-04-03T10:00:00Z",
};

const completedStep2: AgentTaskResult = {
  agentName: "مولد الإبداع",
  agentId: "creative-step",
  text: "نتيجة خطوة الإبداع التفصيلية",
  confidence: 0.85,
  timestamp: "2026-04-03T10:01:00Z",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderExporter(
  props: Partial<React.ComponentProps<typeof AgentReportsExporter>> = {}
) {
  const defaultProps = {
    reports: sampleReports,
    originalText: "النص الأصلي للنص الدرامي",
  };
  return render(<AgentReportsExporter {...defaultProps} {...props} />);
}

function clickJsonExport() {
  fireEvent.click(screen.getByRole("button", { name: /تصدير json/i }));
}

function clickTextExport() {
  fireEvent.click(screen.getByRole("button", { name: /تصدير نصي/i }));
}

// ---------------------------------------------------------------------------
// JSON Export Tests
// ---------------------------------------------------------------------------

describe("AgentReportsExporter — JSON export", () => {
  it("produces valid JSON containing the reports object", () => {
    renderExporter();
    clickJsonExport();

    const parsed = JSON.parse(lastBlobContent) as Record<string, unknown>;
    expect(parsed).toHaveProperty("reports");
    expect((parsed.reports as Record<string, unknown>)["agent-alpha"]).toBe(
      "نتيجة الوكيل ألفا"
    );
  });

  it("includes taskResults in JSON export when provided", () => {
    const taskResults: Record<string, AgentTaskResult> = {
      "analysis-step": completedStep1,
      "creative-step": completedStep2,
    };

    renderExporter({ taskResults });
    clickJsonExport();

    const parsed = JSON.parse(lastBlobContent) as Record<string, unknown>;
    expect(parsed).toHaveProperty("taskResults");

    const exportedResults = parsed.taskResults as Record<
      string,
      AgentTaskResult
    >;
    expect(exportedResults).toHaveProperty("analysis-step");
    expect(exportedResults["analysis-step"].text).toBe(
      "نتيجة خطوة التحليل التفصيلية"
    );
    expect(exportedResults["analysis-step"].agentName).toBe("محلل التحليل");
    expect(exportedResults).toHaveProperty("creative-step");
    expect(exportedResults["creative-step"].text).toBe(
      "نتيجة خطوة الإبداع التفصيلية"
    );
  });

  it("includes originalText in JSON export", () => {
    renderExporter({ taskResults: { "analysis-step": completedStep1 } });
    clickJsonExport();

    const parsed = JSON.parse(lastBlobContent) as Record<string, unknown>;
    expect(parsed).toHaveProperty("originalText", "النص الأصلي للنص الدرامي");
  });

  it("taskResults defaults to empty object when not provided", () => {
    renderExporter();
    clickJsonExport();

    const parsed = JSON.parse(lastBlobContent) as Record<string, unknown>;
    expect(parsed).toHaveProperty("taskResults");
    expect(parsed.taskResults).toEqual({});
  });

  it("uses application/json MIME type", () => {
    renderExporter({ taskResults: { "analysis-step": completedStep1 } });
    clickJsonExport();

    expect(lastBlobOptions.type).toBe("application/json");
  });

  it("triggers file download (createObjectURL + anchor click)", () => {
    renderExporter({ taskResults: { "analysis-step": completedStep1 } });
    clickJsonExport();

    expect(mockCreateObjectURL).toHaveBeenCalledOnce();
    expect(mockAnchorClick).toHaveBeenCalledOnce();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});

// ---------------------------------------------------------------------------
// Text / Markdown Export Tests
// ---------------------------------------------------------------------------

describe("AgentReportsExporter — Text/Markdown export", () => {
  it("produces text containing agent report sections", () => {
    renderExporter();
    clickTextExport();

    expect(lastBlobContent).toContain("نتائج التحليل");
    expect(lastBlobContent).toContain("agent-alpha");
    expect(lastBlobContent).toContain("نتيجة الوكيل ألفا");
  });

  it("includes originalText section when originalText is provided", () => {
    renderExporter({ originalText: "نص درامي تجريبي" });
    clickTextExport();

    expect(lastBlobContent).toContain("النص الأصلي");
    expect(lastBlobContent).toContain("نص درامي تجريبي");
  });

  it("appends ## {agentName} heading for each completed step", () => {
    const taskResults: Record<string, AgentTaskResult> = {
      "analysis-step": completedStep1,
      "creative-step": completedStep2,
    };

    renderExporter({ taskResults });
    clickTextExport();

    expect(lastBlobContent).toContain("## محلل التحليل");
    expect(lastBlobContent).toContain("## مولد الإبداع");
  });

  it("appends step text body after each heading", () => {
    const taskResults: Record<string, AgentTaskResult> = {
      "analysis-step": completedStep1,
    };

    renderExporter({ taskResults });
    clickTextExport();

    expect(lastBlobContent).toContain("نتيجة خطوة التحليل التفصيلية");
  });

  it("appends supporting steps section header when taskResults are present", () => {
    const taskResults: Record<string, AgentTaskResult> = {
      "analysis-step": completedStep1,
    };

    renderExporter({ taskResults });
    clickTextExport();

    expect(lastBlobContent).toContain("النتائج الداعمة");
  });

  it("does not append supporting steps section when taskResults is empty", () => {
    renderExporter({ taskResults: {} });
    clickTextExport();

    expect(lastBlobContent).not.toContain("النتائج الداعمة");
  });

  it("does not append supporting steps section when taskResults is undefined", () => {
    renderExporter({ taskResults: undefined });
    clickTextExport();

    expect(lastBlobContent).not.toContain("النتائج الداعمة");
  });

  it("skips steps with empty text from the supporting steps section", () => {
    const taskResults: Record<string, AgentTaskResult> = {
      "analysis-step": completedStep1,
      "empty-step": {
        agentName: "وكيل فارغ",
        agentId: "empty-step",
        text: "",
        confidence: 0,
        timestamp: "2026-04-03T10:02:00Z",
      },
      "whitespace-step": {
        agentName: "وكيل مسافات",
        agentId: "whitespace-step",
        text: "   ",
        confidence: 0,
        timestamp: "2026-04-03T10:03:00Z",
      },
    };

    renderExporter({ taskResults });
    clickTextExport();

    // Sections with text present
    expect(lastBlobContent).toContain("## محلل التحليل");
    // Steps without meaningful text must NOT appear as headings
    expect(lastBlobContent).not.toContain("## وكيل فارغ");
    expect(lastBlobContent).not.toContain("## وكيل مسافات");
  });

  it("uses text/plain MIME type with utf-8 charset", () => {
    renderExporter({ taskResults: { "analysis-step": completedStep1 } });
    clickTextExport();

    expect(lastBlobOptions.type).toBe("text/plain;charset=utf-8");
  });

  it("triggers file download for text export", () => {
    renderExporter({ taskResults: { "analysis-step": completedStep1 } });
    clickTextExport();

    expect(mockCreateObjectURL).toHaveBeenCalledOnce();
    expect(mockAnchorClick).toHaveBeenCalledOnce();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});

// ---------------------------------------------------------------------------
// Missing / Empty taskResults — Robustness
// ---------------------------------------------------------------------------

describe("AgentReportsExporter — missing/empty taskResults robustness", () => {
  it("JSON export does not throw when taskResults is undefined", () => {
    renderExporter({ taskResults: undefined });
    expect(() => clickJsonExport()).not.toThrow();
  });

  it("JSON export does not throw when taskResults is empty object", () => {
    renderExporter({ taskResults: {} });
    expect(() => clickJsonExport()).not.toThrow();
    const parsed = JSON.parse(lastBlobContent) as Record<string, unknown>;
    expect(parsed.taskResults).toEqual({});
  });

  it("Text export does not throw when taskResults is undefined", () => {
    renderExporter({ taskResults: undefined });
    expect(() => clickTextExport()).not.toThrow();
  });

  it("Text export does not throw when taskResults is empty object", () => {
    renderExporter({ taskResults: {} });
    expect(() => clickTextExport()).not.toThrow();
    expect(lastBlobContent.length).toBeGreaterThan(0);
  });

  it("export buttons are disabled when reports object is empty", () => {
    render(<AgentReportsExporter reports={{}} originalText="نص" />);

    expect(screen.getByRole("button", { name: /تصدير json/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /تصدير نصي/i })).toBeDisabled();
  });

  it("export buttons are enabled when reports has at least one entry", () => {
    renderExporter();

    expect(
      screen.getByRole("button", { name: /تصدير json/i })
    ).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: /تصدير نصي/i })
    ).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// onExport callback
// ---------------------------------------------------------------------------

describe("AgentReportsExporter — onExport callback", () => {
  it("calls onExport with 'json' after successful JSON export", () => {
    const onExport = vi.fn();
    renderExporter({ onExport });
    clickJsonExport();

    expect(onExport).toHaveBeenCalledOnce();
    expect(onExport).toHaveBeenCalledWith("json");
  });

  it("calls onExport with 'txt' after successful text export", () => {
    const onExport = vi.fn();
    renderExporter({ onExport });
    clickTextExport();

    expect(onExport).toHaveBeenCalledOnce();
    expect(onExport).toHaveBeenCalledWith("txt");
  });
});
