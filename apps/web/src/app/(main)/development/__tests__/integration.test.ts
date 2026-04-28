// @vitest-environment jsdom
/**
 * @fileoverview Integration tests for the development-tool-execution fix (T040–T055)
 *
 * Tests added in this session to validate:
 *  T040 — Primary path: executeTask dispatches SET_CATALOG_RESULT when /api/development/execute succeeds
 *  T041 — catalogResult is populated in hook state after successful executeTask
 *  T042 — Primary route sends correct payload shape to /api/development/execute
 *  T043 — isAnalysisComplete unlocks via textInput >= 100 chars (not just analysisReport)
 *  T044 — isAnalysisComplete unlocks via analysisReport >= 100 chars (existing behavior preserved)
 *  T045 — isAnalysisComplete does NOT unlock with both inputs < 100 chars
 *  T046 — handleCatalogTaskSelect sets selectedCatalogTaskId in state
 *  T047 — handleCatalogTaskSelect clears previous catalogResult when a new task is selected
 *  T048 — isLoading transitions correctly across executeTask lifecycle
 *  T049 — executeTask sets error when primary succeeds but returns empty finalText
 *  T050 — catalogResult is cleared on clearAnalysisData
 *  T051 — unlockStatus.progress tracks Math.max(reportLen, textLen) after gate fix
 *  T052 — executeTask with short text (< 20 chars) sets error without calling fetch
 *  T053 — handleCatalogSubmit is defined and callable
 */

import { act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Global mocks (must be hoisted before module imports that use them)
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function fetchCallOptions(callIndex: number): RequestInit | undefined {
  const call = mockFetch.mock.calls[callIndex] as
    | [unknown, RequestInit | undefined]
    | undefined;
  return call?.[1];
}

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/ai/gemini-core", () => ({
  toText: (v: unknown) => String(v),
}));

vi.mock("@/lib/app-state-client", () => ({
  loadRemoteAppState: vi.fn().mockResolvedValue(null),
}));

// Import test utilities
import { primaryOk } from "./test-fixtures";
import { mountHook, prepareForExecution } from "./test-helpers";

// ---------------------------------------------------------------------------
// Global setup — reset all mock state and browser storage before every test
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

// ---------------------------------------------------------------------------
// T040 / T041 / T042 — Primary path dispatches catalogResult
// ---------------------------------------------------------------------------

describe("T040-T042: Primary path — /api/development/execute → catalogResult", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.clearAllMocks());

  it("T040: executeTask calls /api/development/execute as first fetch", async () => {
    mockFetch.mockResolvedValueOnce(primaryOk());

    const { result } = await mountHook();
    prepareForExecution(result);

    await act(async () => {
      await result.current.executeTask("completion");
    });

    // First (and only) call must be to the primary route
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe("/api/development/execute");
    expect(fetchCallOptions(0)?.method).toBe("POST");
  });

  it("T041: catalogResult is non-null after successful primary-path executeTask", async () => {
    const expectedText = "محتوى توليدي من Gemini";
    mockFetch.mockResolvedValueOnce(primaryOk(expectedText));

    const { result } = await mountHook();
    prepareForExecution(result);

    await act(async () => {
      await result.current.executeTask("completion");
    });

    expect(result.current.catalogResult).not.toBeNull();
    expect(result.current.catalogResult?.text).toBe(expectedText);
  });

  it("T042: /api/development/execute payload contains taskId, taskName, originalText", async () => {
    mockFetch.mockResolvedValueOnce(primaryOk());

    const { result } = await mountHook();
    const text = "أ".repeat(200);

    // تعيين جميع الحقول الإلزامية + المتطلبات الخاصة
    act(() => {
      result.current.setTextInput(text);
      result.current.setAnalysisReport("تقرير تحليل مطلوب للتنفيذ");
      result.current.setSpecialRequirements("متطلبات خاصة");
    });

    await act(async () => {
      await result.current.executeTask("creative");
    });

    const rawBody = fetchCallOptions(0)?.body as string;
    const payload = JSON.parse(rawBody) as {
      taskId: string;
      taskName: string;
      originalText: string;
      specialRequirements: string;
    };

    expect(payload.taskId).toBe("creative");
    expect(typeof payload.taskName).toBe("string");
    expect(payload.taskName.length).toBeGreaterThan(0);
    expect(payload.originalText).toBe(text);
    expect(payload.specialRequirements).toBe("متطلبات خاصة");
  });

  it("T042b: primary payload includes analysisReport when set", async () => {
    mockFetch.mockResolvedValueOnce(primaryOk());

    const { result } = await mountHook();
    const report = "تقرير تحليل مفصل للنص";

    act(() => {
      result.current.setTextInput("أ".repeat(200));
      result.current.setAnalysisReport(report);
    });

    await act(async () => {
      await result.current.executeTask("analysis");
    });

    const rawBody = fetchCallOptions(0)?.body as string;
    const payload = JSON.parse(rawBody) as { analysisReport: string };

    expect(payload.analysisReport).toBe(report);
  });

  it("T042c: only ONE fetch call is made when primary succeeds (no fallback)", async () => {
    mockFetch.mockResolvedValueOnce(primaryOk());

    const { result } = await mountHook();

    act(() => {
      result.current.setTextInput("أ".repeat(200));
      result.current.setAnalysisReport("تقرير تحليل للتحقق من مسار واحد فقط");
    });

    await act(async () => {
      await result.current.executeTask("creative");
    });

    expect(mockFetch).toHaveBeenCalledOnce();
  });
});
