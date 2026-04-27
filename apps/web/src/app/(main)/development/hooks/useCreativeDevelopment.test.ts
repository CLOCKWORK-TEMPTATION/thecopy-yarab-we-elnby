// @vitest-environment jsdom
/**
 * @fileoverview Unit tests for useCreativeDevelopment hook — ExecutionAdapter paths
 *
 * Covers:
 *  T013 — brainstorm / workflow-single / workflow-custom routing + advancedSettings pass-through
 *  T020 — Regression: all 16 brainstorm task ids resolve executionMode === "brainstorm"
 *          + "integrated" resolves to "workflow-custom"
 *  T021 — Regression: brainstorm payload shape matches the contract exactly
 *
 * The hook is tested by calling `executeTask` directly after setting up
 * the required state via the reducer actions. Because the hook uses React
 * hooks internally (useReducer, useCallback, useEffect, useToast) we use
 * @testing-library/react's `renderHook` to mount it inside a proper
 * React environment.
 *
 * Mocked dependencies:
 *  - global `fetch`          — captured to inspect call arguments
 *  - `@/hooks/use-toast`     — silenced
 *  - `@/ai/gemini-core`      — silenced (toText)
 *  - `@/lib/app-state-client`— silenced (loadRemoteAppState)
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { DEVELOPMENT_TASKS, getTaskById } from "../utils/task-catalog";

// ---------------------------------------------------------------------------
// Global mocks (must be hoisted before module imports that use them)
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/ai/gemini-core", () => ({
  toText: (v: unknown) => String(v),
}));

vi.mock("@/lib/app-state-client", () => ({
  loadRemoteAppState: vi.fn().mockResolvedValue(null),
}));

// ---------------------------------------------------------------------------
// Import the hook AFTER mocks are set up
// ---------------------------------------------------------------------------
// Dynamic import is used so vitest processes the mocks before the module loads.
const { useCreativeDevelopment } = await import("./useCreativeDevelopment");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal OK fetch response */
function okResponse(body: unknown = { success: true }) {
  return {
    ok: true,
    status: 200,
    json: () => body,
  } as unknown as Response;
}

/** Build a minimal error fetch response */
function errResponse(status = 500) {
  return {
    ok: false,
    status,
    json: () => ({ error: "server error" }),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Shared state for hook rendering
// ---------------------------------------------------------------------------

/** Render the hook and return { result } */
function mountHook() {
  return renderHook(() => useCreativeDevelopment());
}

/** Read the RequestInit options from a captured fetch mock call */
function fetchCallOptions(callIndex: number): RequestInit | undefined {
  const call = mockFetch.mock.calls[callIndex] as
    | [unknown, RequestInit | undefined]
    | undefined;
  return call?.[1];
}

const READY_TEXT_INPUT = "أ".repeat(200);
const READY_ANALYSIS_REPORT = "ت".repeat(160);

/** تجهيز الحالة الدنيا اللازمة لتنفيذ مسار أدوات التطوير */
function applyExecutionPrerequisites(
  result: ReturnType<typeof mountHook>["result"]
) {
  act(() => {
    result.current.setTextInput(READY_TEXT_INPUT);
    result.current.setAnalysisReport(READY_ANALYSIS_REPORT);
  });
}

// ---------------------------------------------------------------------------
// T013: ExecutionAdapter — routing per executionMode
// ---------------------------------------------------------------------------

describe("T013: executeTask — ExecutionAdapter routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Helper: mock the primary /api/development/execute to fail so tests exercise fallback routes
  function mockPrimaryFail() {
    mockFetch.mockResolvedValueOnce(errResponse(503));
  }

  it("brainstorm mode calls POST /api/brainstorm (via fallback when primary fails)", async () => {
    // First call → primary /api/development/execute fails
    mockPrimaryFail();
    // Second call → /api/brainstorm succeeds
    mockFetch.mockResolvedValueOnce(
      okResponse({
        finalDecision: "ok",
        proposals: [{ agentId: "completion", text: "ok", confidence: 0.85 }],
      })
    );

    const { result } = mountHook();

    applyExecutionPrerequisites(result);

    await act(async () => {
      await result.current.executeTask("completion"); // executionMode: brainstorm
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [url0] = mockFetch.mock.calls[0] as [string];
    const [url1] = mockFetch.mock.calls[1] as [string];
    expect(url0).toBe("/api/development/execute");
    expect(url1).toBe("/api/brainstorm");
    expect(fetchCallOptions(1)?.method).toBe("POST");
  });

  it("workflow-single mode calls POST /api/workflow/execute-custom (via fallback when primary fails)", async () => {
    mockPrimaryFail();
    mockFetch.mockResolvedValueOnce(
      okResponse({
        success: true,
        status: "completed",
        results: {
          "character-deep-analyzer": {
            agentId: "character-deep-analyzer",
            status: "completed",
            output: { text: "تحليل عميق", confidence: 0.9 },
          },
        },
      })
    );

    const { result } = mountHook();

    applyExecutionPrerequisites(result);

    await act(async () => {
      await result.current.executeTask("character-deep-analyzer");
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [url1] = mockFetch.mock.calls[1] as [string];
    expect(url1).toBe("/api/workflow/execute-custom");
    expect(fetchCallOptions(1)?.method).toBe("POST");
  });

  it("workflow-single mode sends a single-step config (via fallback)", async () => {
    mockPrimaryFail();
    mockFetch.mockResolvedValueOnce(
      okResponse({
        status: "completed",
        results: {
          "character-deep-analyzer": {
            status: "completed",
            output: { text: "نتيجة", confidence: 0.9 },
          },
        },
      })
    );

    const { result } = mountHook();

    applyExecutionPrerequisites(result);

    await act(async () => {
      await result.current.executeTask("character-deep-analyzer");
    });

    const rawBody = fetchCallOptions(1)?.body as string;
    const body = JSON.parse(rawBody) as { config: { steps: unknown[] } };
    expect(body.config).toBeDefined();
    expect(Array.isArray(body.config.steps)).toBe(true);
    expect(body.config.steps).toHaveLength(1);
  });

  it("workflow-custom mode calls POST /api/workflow/execute-custom with multi-step config (via fallback)", async () => {
    mockPrimaryFail();
    mockFetch.mockResolvedValueOnce(
      okResponse({
        status: "completed",
        results: {
          integrated: {
            status: "completed",
            output: { text: "نتيجة متكاملة", confidence: 0.88 },
          },
        },
      })
    );

    const { result } = mountHook();

    applyExecutionPrerequisites(result);

    await act(async () => {
      await result.current.executeTask("integrated");
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [url1] = mockFetch.mock.calls[1] as [string];
    expect(url1).toBe("/api/workflow/execute-custom");

    const rawBody = fetchCallOptions(1)?.body as string;
    const body = JSON.parse(rawBody) as { config: { steps: unknown[] } };
    expect(body.config).toBeDefined();
    expect(body.config.steps.length).toBeGreaterThan(1);
  });

  it("advancedSettings are included in workflow-single request body under input (via fallback)", async () => {
    mockPrimaryFail();
    mockFetch.mockResolvedValueOnce(
      okResponse({
        status: "completed",
        results: {
          "character-deep-analyzer": {
            status: "completed",
            output: { text: "نتيجة", confidence: 0.9 },
          },
        },
      })
    );

    const { result } = mountHook();

    act(() => {
      result.current.setTextInput(READY_TEXT_INPUT);
      result.current.setAnalysisReport(READY_ANALYSIS_REPORT);
      result.current.updateAdvancedSettings({
        enableRAG: false,
        enableDebate: true,
      });
    });

    await act(async () => {
      await result.current.executeTask("character-deep-analyzer");
    });

    const rawBody = fetchCallOptions(1)?.body as string;
    const body = JSON.parse(rawBody) as {
      input: {
        advancedSettings: { enableRAG: boolean; enableDebate: boolean };
      };
    };
    expect(body.input.advancedSettings).toBeDefined();
    expect(body.input.advancedSettings.enableRAG).toBe(false);
    expect(body.input.advancedSettings.enableDebate).toBe(true);
  });

  it("returns null and sets error for unknown task id", async () => {
    const { result } = mountHook();

    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.executeTask("non-existent-task-id");
    });

    expect(returnValue).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sets error and returns null when all routes fail", async () => {
    // Primary fails
    mockFetch.mockResolvedValueOnce(errResponse(503));
    // Fallback also fails
    mockFetch.mockResolvedValueOnce(errResponse(500));

    const { result } = mountHook();

    applyExecutionPrerequisites(result);

    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.executeTask("completion");
    });

    expect(returnValue).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it("isLoading is false after executeTask completes (primary path)", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse({
        success: true,
        result: {
          finalDecision: "done",
          proposals: [
            { agentId: "completion", text: "done", confidence: 0.85 },
          ],
        },
      })
    );

    const { result } = mountHook();

    applyExecutionPrerequisites(result);

    await act(async () => {
      await result.current.executeTask("completion");
    });

    expect(result.current.isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T020: Regression — task catalog executionMode correctness
// ---------------------------------------------------------------------------

describe("T020: task catalog executionMode regression", () => {
  /**
   * These are the 16 brainstorm task ids listed in the task requirements.
   * Each must have executionMode === "brainstorm" in the catalog.
   */
  const BRAINSTORM_TASK_IDS = [
    "completion",
    "creative",
    "analysis",
    "adaptive-rewriting",
    "scene-generator",
    "character-voice",
    "world-builder",
    "rhythm-mapping",
    "character-network",
    "dialogue-forensics",
    "thematic-mining",
    "style-fingerprint",
    "conflict-dynamics",
    "plot-predictor",
    "tension-optimizer",
    "audience-resonance",
    "platform-adapter",
  ] as const;

  for (const taskId of BRAINSTORM_TASK_IDS) {
    it(`"${taskId}" resolves executionMode === "brainstorm"`, () => {
      const task = getTaskById(taskId);
      expect(
        task,
        `Task "${taskId}" must exist in DEVELOPMENT_TASKS`
      ).toBeDefined();
      expect(task!.executionMode).toBe("brainstorm");
    });
  }

  it('"integrated" resolves executionMode === "workflow-custom" (NOT brainstorm)', () => {
    const task = getTaskById("integrated");
    expect(task).toBeDefined();
    expect(task!.executionMode).toBe("workflow-custom");
    expect(task!.executionMode).not.toBe("brainstorm");
  });

  it("DEVELOPMENT_TASKS catalog contains all expected brainstorm tasks", () => {
    const brainstormIds = DEVELOPMENT_TASKS.filter(
      (t) => t.executionMode === "brainstorm"
    ).map((t) => t.id);

    for (const taskId of BRAINSTORM_TASK_IDS) {
      expect(
        brainstormIds,
        `Expected "${taskId}" to be in brainstorm tasks`
      ).toContain(taskId);
    }
  });

  it("workflow-single tasks do NOT include any of the 16 brainstorm ids", () => {
    const workflowSingleIds = DEVELOPMENT_TASKS.filter(
      (t) => t.executionMode === "workflow-single"
    ).map((t) => t.id);

    for (const taskId of BRAINSTORM_TASK_IDS) {
      expect(workflowSingleIds).not.toContain(taskId);
    }
  });
});

// ---------------------------------------------------------------------------
// T021: Regression — brainstorm payload shape
// ---------------------------------------------------------------------------

describe("T021: brainstorm payload shape matches contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Stub primary route to fail so fallback brainstorm payload is inspectable
  function mockPrimaryFailThenBrainstorm(brainstormBody: unknown) {
    mockFetch.mockResolvedValueOnce(errResponse(503)); // primary fails
    mockFetch.mockResolvedValueOnce(okResponse(brainstormBody)); // brainstorm succeeds
  }

  it("brainstorm payload contains task, context, and agentIds at top level", async () => {
    mockPrimaryFailThenBrainstorm({
      finalDecision: "result text",
      proposals: [
        { agentId: "completion", text: "result text", confidence: 0.85 },
      ],
    });

    const { result } = mountHook();

    act(() => {
      result.current.setTextInput(READY_TEXT_INPUT);
      result.current.setAnalysisReport(READY_ANALYSIS_REPORT);
      result.current.setSpecialRequirements("توجيه خاص");
      result.current.setAdditionalInfo("معلومات إضافية");
    });

    await act(async () => {
      await result.current.executeTask("completion");
    });

    // Call 0 = primary /api/development/execute (fails), call 1 = /api/brainstorm
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const rawBody = fetchCallOptions(1)?.body as string;
    const payload = JSON.parse(rawBody) as {
      task: string;
      context: { brief: string; phase: number; sessionId: string };
      agentIds: string[];
    };

    // Top-level keys
    expect(payload).toHaveProperty("task");
    expect(payload).toHaveProperty("context");
    expect(payload).toHaveProperty("agentIds");

    // task is a non-empty string
    expect(typeof payload.task).toBe("string");
    expect(payload.task.length).toBeGreaterThan(0);

    // context shape
    expect(typeof payload.context.brief).toBe("string");
    expect(typeof payload.context.phase).toBe("number");
    expect(typeof payload.context.sessionId).toBe("string");
    expect(payload.context.phase).toBe(3);

    // agentIds is a non-empty array of strings
    expect(Array.isArray(payload.agentIds)).toBe(true);
    expect(payload.agentIds.length).toBeGreaterThan(0);
    expect(typeof payload.agentIds[0]).toBe("string");
  });

  it("brainstorm task field includes the task name, special requirements, and original text", async () => {
    mockPrimaryFailThenBrainstorm({
      finalDecision: "done",
      proposals: [{ agentId: "creative", text: "done", confidence: 0.85 }],
    });

    const { result } = mountHook();

    const originalText = "أ".repeat(200);
    const specialReq = "متطلبات خاصة جداً";

    act(() => {
      result.current.setTextInput(originalText);
      result.current.setAnalysisReport(READY_ANALYSIS_REPORT);
      result.current.setSpecialRequirements(specialReq);
    });

    await act(async () => {
      await result.current.executeTask("creative");
    });

    const rawBody = fetchCallOptions(1)?.body as string;
    const payload = JSON.parse(rawBody) as { task: string };

    // The task string is assembled from multiple parts including the original text
    expect(payload.task).toContain(originalText);
    // The special requirements are embedded in the task string
    expect(payload.task).toContain(specialReq);
  });

  it("brainstorm context.brief includes analysisReport when set", async () => {
    mockPrimaryFailThenBrainstorm({
      finalDecision: "done",
      proposals: [{ agentId: "creative", text: "done", confidence: 0.85 }],
    });

    const { result } = mountHook();
    const report = "تقرير التحليل المهم";

    act(() => {
      result.current.setTextInput("أ".repeat(200));
      result.current.setAnalysisReport(report);
    });

    await act(async () => {
      await result.current.executeTask("creative");
    });

    const rawBody = fetchCallOptions(1)?.body as string;
    const payload = JSON.parse(rawBody) as { context: { brief: string } };

    expect(payload.context.brief).toContain(report);
  });

  it("brainstorm agentIds contains the task id", async () => {
    mockPrimaryFailThenBrainstorm({
      finalDecision: "done",
      proposals: [
        { agentId: "rhythm-mapping", text: "done", confidence: 0.85 },
      ],
    });

    const { result } = mountHook();

    applyExecutionPrerequisites(result);

    await act(async () => {
      await result.current.executeTask("rhythm-mapping");
    });

    const rawBody = fetchCallOptions(1)?.body as string;
    const payload = JSON.parse(rawBody) as { agentIds: string[] };

    expect(payload.agentIds).toContain("rhythm-mapping");
  });
});

// ---------------------------------------------------------------------------
// T030: unlock logic and manual mode
// ---------------------------------------------------------------------------

describe("T030: unlock status and manual mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it("unlockStatus is locked with reason 'no-report' when analysisReport is empty", () => {
    const { result } = mountHook();
    expect(result.current.unlockStatus.locked).toBe(true);
    expect(result.current.unlockStatus.reason).toBe("no-report");
    expect(result.current.unlockStatus.progress).toBe(0);
  });

  it("unlockStatus shows 'short-report' and progress when report is under 100 chars", () => {
    const { result } = mountHook();
    act(() => {
      result.current.setAnalysisReport("أ".repeat(50));
    });
    expect(result.current.unlockStatus.locked).toBe(true);
    expect(result.current.unlockStatus.reason).toBe("short-report");
    expect(result.current.unlockStatus.progress).toBe(50);
  });

  it("unlockStatus unlocks when report exceeds MIN_TEXT_LENGTH", async () => {
    const { result } = mountHook();
    act(() => {
      result.current.setAnalysisReport("أ".repeat(101));
    });
    // Wait for the effect to fire
    await act(async () => {});
    expect(result.current.unlockStatus.locked).toBe(false);
    expect(result.current.unlockStatus.reason).toBe("ready");
    expect(result.current.isAnalysisComplete).toBe(true);
  });

  it("enableManualMode clears analysisId and sets isManualMode", () => {
    const { result } = mountHook();
    // Simulate an auto-loaded state by setting report + id via the load path
    act(() => {
      result.current.setAnalysisReport("أ".repeat(200));
    });
    act(() => {
      result.current.enableManualMode();
    });
    expect(result.current.isManualMode).toBe(true);
    expect(result.current.analysisId).toBeNull();
  });

  it("clearAnalysisData resets manual mode", () => {
    const { result } = mountHook();
    act(() => {
      result.current.enableManualMode();
    });
    expect(result.current.isManualMode).toBe(true);
    act(() => {
      result.current.clearAnalysisData();
    });
    expect(result.current.isManualMode).toBe(false);
    expect(result.current.isAnalysisComplete).toBe(false);
  });
});
