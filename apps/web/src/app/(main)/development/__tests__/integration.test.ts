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

import { renderHook, act } from "@testing-library/react";
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

// Import hook AFTER mocks
const { useCreativeDevelopment } =
  await import("../hooks/useCreativeDevelopment");

// ---------------------------------------------------------------------------
// Global setup — reset all mock state and browser storage before every test
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a successful /api/development/execute response */
function primaryOk(text = "النتيجة من Gemini مباشرةً") {
  return {
    ok: true,
    status: 200,
    json: () => ({
      success: true,
      result: {
        finalDecision: text,
        proposals: [
          {
            agentId: "completion",
            agentName: "إكمال النص",
            text,
            confidence: 0.85,
          },
        ],
      },
    }),
  } as unknown as Response;
}

/** Build a failed /api/development/execute response (API key missing) */
function primaryFail(status = 503) {
  return {
    ok: false,
    status,
    json: () => ({
      success: false,
      error: "Gemini API key missing",
      fallback: true,
    }),
  } as unknown as Response;
}

/** Build a successful /api/brainstorm fallback response */
function brainstormOk(text = "نتيجة من brainstorm") {
  return {
    ok: true,
    status: 200,
    json: () => ({
      finalDecision: text,
      proposals: [{ agentId: "completion", text, confidence: 0.82 }],
    }),
  } as unknown as Response;
}

/** Render the hook */
function mountHook() {
  return renderHook(() => useCreativeDevelopment());
}

/**
 * يعيّن الحقول الإلزامية لتنفيذ executeTask("completion"):
 * - textInput >= 20 حرف
 * - analysisReport غير فارغ
 * - completionScope غير فارغ (مطلوب لمهمة "completion" فقط)
 */
function prepareForExecution(
  result: ReturnType<typeof mountHook>["result"],
  overrides?: { text?: string; report?: string; scope?: string }
) {
  act(() => {
    result.current.setTextInput(overrides?.text ?? "أ".repeat(200));
    result.current.setAnalysisReport(
      overrides?.report ?? "تقرير تحليل الأداء الدرامي — حد أدنى مطلوب"
    );
    result.current.setCompletionScope(
      overrides?.scope ?? "تحسين الحوار والأسلوب الروائي"
    );
  });
}

// ---------------------------------------------------------------------------
// T040 / T041 / T042 — Primary path dispatches catalogResult
// ---------------------------------------------------------------------------

describe("T040-T042: Primary path — /api/development/execute → catalogResult", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.clearAllMocks());

  it("T040: executeTask calls /api/development/execute as first fetch", async () => {
    mockFetch.mockResolvedValueOnce(primaryOk());

    const { result } = mountHook();
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

    const { result } = mountHook();
    prepareForExecution(result);

    await act(async () => {
      await result.current.executeTask("completion");
    });

    expect(result.current.catalogResult).not.toBeNull();
    expect(result.current.catalogResult?.text).toBe(expectedText);
  });

  it("T042: /api/development/execute payload contains taskId, taskName, originalText", async () => {
    mockFetch.mockResolvedValueOnce(primaryOk());

    const { result } = mountHook();
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

    const { result } = mountHook();
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

    const { result } = mountHook();

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

// ---------------------------------------------------------------------------
// T043–T045 — isAnalysisComplete gate unlock logic
// ---------------------------------------------------------------------------

describe("T043-T045: isAnalysisComplete gate unlock logic", () => {
  beforeEach(() => vi.clearAllMocks());

  it("T043: isAnalysisComplete becomes true when textInput reaches 100 chars", async () => {
    const { result } = mountHook();

    // Initially locked
    expect(result.current.isAnalysisComplete).toBe(false);

    act(() => {
      result.current.setTextInput("أ".repeat(101));
    });

    await act(async () => {});

    expect(result.current.isAnalysisComplete).toBe(true);
  });

  it("T043b: textInput of exactly 100 chars does NOT unlock (boundary — must exceed 100)", async () => {
    const { result } = mountHook();

    act(() => {
      result.current.setTextInput("أ".repeat(100));
    });

    await act(async () => {});

    // 100 chars is NOT > MIN_TEXT_LENGTH(100) — still locked
    expect(result.current.isAnalysisComplete).toBe(false);
  });

  it("T044: isAnalysisComplete becomes true when analysisReport reaches 100 chars (existing path)", async () => {
    const { result } = mountHook();

    act(() => {
      result.current.setAnalysisReport("أ".repeat(101));
    });

    await act(async () => {});

    expect(result.current.isAnalysisComplete).toBe(true);
  });

  it("T045: isAnalysisComplete stays false when both textInput and analysisReport < 100 chars", async () => {
    const { result } = mountHook();

    act(() => {
      result.current.setTextInput("أ".repeat(50));
      result.current.setAnalysisReport("أ".repeat(50));
    });

    await act(async () => {});

    expect(result.current.isAnalysisComplete).toBe(false);
  });

  it("T045b: textInput alone (no report) unlocks when it exceeds 100 chars", async () => {
    const { result } = mountHook();

    // No analysisReport set — only textInput
    act(() => {
      result.current.setTextInput("أ".repeat(150));
    });

    await act(async () => {});

    expect(result.current.isAnalysisComplete).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T046–T047 — handleCatalogTaskSelect
// ---------------------------------------------------------------------------

describe("T046-T047: handleCatalogTaskSelect", () => {
  beforeEach(() => vi.clearAllMocks());

  it("T046: handleCatalogTaskSelect sets selectedCatalogTaskId", () => {
    const { result } = mountHook();

    expect(result.current.selectedCatalogTaskId).toBeNull();

    act(() => {
      result.current.handleCatalogTaskSelect("rhythm-mapping");
    });

    expect(result.current.selectedCatalogTaskId).toBe("rhythm-mapping");
  });

  it("T046b: selecting a different task updates selectedCatalogTaskId", () => {
    const { result } = mountHook();

    act(() => {
      result.current.handleCatalogTaskSelect("analysis");
    });

    expect(result.current.selectedCatalogTaskId).toBe("analysis");

    act(() => {
      result.current.handleCatalogTaskSelect("creative");
    });

    expect(result.current.selectedCatalogTaskId).toBe("creative");
  });

  it("T047: selecting a new task clears previous catalogResult", async () => {
    mockFetch.mockResolvedValueOnce(primaryOk("النتيجة الأولى"));

    const { result } = mountHook();

    prepareForExecution(result);

    // Run a task to populate catalogResult
    await act(async () => {
      await result.current.executeTask("completion");
    });

    expect(result.current.catalogResult).not.toBeNull();

    // Now select a different task — catalogResult must clear
    act(() => {
      result.current.handleCatalogTaskSelect("creative");
    });

    expect(result.current.catalogResult).toBeNull();
    expect(result.current.selectedCatalogTaskId).toBe("creative");
  });
});

// ---------------------------------------------------------------------------
// T048 — isLoading lifecycle
// ---------------------------------------------------------------------------

describe("T048: isLoading transitions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("T048: isLoading is false after successful primary-path executeTask", async () => {
    mockFetch.mockResolvedValueOnce(primaryOk());

    const { result } = mountHook();
    prepareForExecution(result);

    await act(async () => {
      await result.current.executeTask("completion");
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("T048b: isLoading is false after failed executeTask (both routes fail)", async () => {
    mockFetch.mockResolvedValueOnce(primaryFail());
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => ({ error: "server error" }),
    });

    const { result } = mountHook();
    prepareForExecution(result);

    await act(async () => {
      await result.current.executeTask("completion");
    });

    expect(result.current.isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T049 — Empty result from primary route → error
// ---------------------------------------------------------------------------

describe("T049: Empty result handling", () => {
  beforeEach(() => vi.clearAllMocks());

  it("T049: sets error when primary route returns success but empty finalDecision", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => ({
        success: true,
        result: {
          finalDecision: "   ", // whitespace-only
          proposals: [],
        },
      }),
    });

    const { result } = mountHook();

    prepareForExecution(result);

    await act(async () => {
      await result.current.executeTask("completion");
    });

    // Empty finalText should trigger an error
    expect(result.current.error).toBeTruthy();
    expect(result.current.catalogResult).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T050 — clearAnalysisData resets catalogResult
// ---------------------------------------------------------------------------

describe("T050: clearAnalysisData resets catalog state", () => {
  beforeEach(() => vi.clearAllMocks());

  it("T050: clearAnalysisData sets catalogResult to null", async () => {
    mockFetch.mockResolvedValueOnce(primaryOk("نتيجة"));

    const { result } = mountHook();

    prepareForExecution(result);

    await act(async () => {
      await result.current.executeTask("completion");
    });

    expect(result.current.catalogResult).not.toBeNull();

    act(() => {
      result.current.clearAnalysisData();
    });

    expect(result.current.catalogResult).toBeNull();
    expect(result.current.isAnalysisComplete).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T051 — unlockStatus.progress tracks Math.max(reportLen, textLen)
// ---------------------------------------------------------------------------

describe("T051: unlockStatus.progress after gate fix", () => {
  it("T051: progress reflects textInput length when textInput > analysisReport", async () => {
    const { result } = mountHook();

    act(() => {
      result.current.setTextInput("أ".repeat(80));
      result.current.setAnalysisReport("أ".repeat(20));
    });

    await act(async () => {});

    // Progress should be based on max(80, 20) = 80
    expect(result.current.unlockStatus.progress).toBe(80);
  });

  it("T051b: progress reflects analysisReport length when analysisReport > textInput", async () => {
    const { result } = mountHook();

    act(() => {
      result.current.setTextInput("أ".repeat(30));
      result.current.setAnalysisReport("أ".repeat(70));
    });

    await act(async () => {});

    expect(result.current.unlockStatus.progress).toBe(70);
  });
});

// ---------------------------------------------------------------------------
// T052 — Short text guard (< 20 chars)
// ---------------------------------------------------------------------------

describe("T052: Short text guard", () => {
  it("T052: executeTask sets error without calling fetch when textInput < 20 chars", async () => {
    const { result } = mountHook();

    act(() => {
      result.current.setTextInput("قصير");
    });

    await act(async () => {
      await result.current.executeTask("completion");
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// T053 — handleCatalogSubmit exists
// ---------------------------------------------------------------------------

describe("T053: handleCatalogSubmit is exposed from hook", () => {
  it("T053: handleCatalogSubmit is a function", () => {
    const { result } = mountHook();
    expect(typeof result.current.handleCatalogSubmit).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// T054 — Fallback path still works when primary fails
// ---------------------------------------------------------------------------

describe("T054: Fallback path when primary route fails", () => {
  beforeEach(() => vi.clearAllMocks());

  it("T054: uses /api/brainstorm as fallback and populates catalogResult", async () => {
    const fallbackText = "نتيجة من brainstorm fallback";
    mockFetch.mockResolvedValueOnce(primaryFail(503)); // primary fails (no API key)
    mockFetch.mockResolvedValueOnce(brainstormOk(fallbackText));

    const { result } = mountHook();

    prepareForExecution(result);

    await act(async () => {
      await result.current.executeTask("completion");
    });

    expect(result.current.catalogResult).not.toBeNull();
    expect(result.current.catalogResult?.text).toBe(fallbackText);
    expect(result.current.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T055 — taskResults populated after executeTask
// ---------------------------------------------------------------------------

describe("T055: taskResults populated after executeTask", () => {
  beforeEach(() => vi.clearAllMocks());

  it("T055: taskResults contains the executed task id after success", async () => {
    mockFetch.mockResolvedValueOnce(primaryOk("نتيجة المهمة"));

    const { result } = mountHook();

    prepareForExecution(result);

    await act(async () => {
      await result.current.executeTask("completion");
    });

    expect(result.current.taskResults).toHaveProperty("completion");
    expect(result.current.taskResults["completion"].text).toBe("نتيجة المهمة");
    expect(result.current.taskResults["completion"].agentId).toBe("completion");
  });
});
