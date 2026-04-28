// @vitest-environment jsdom
/**
 * @fileoverview T021: brainstorm payload shape regression tests
 *
 * Covers:
 *  T021 — Regression: brainstorm payload shape matches the contract exactly
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  okResponse,
  errResponse,
  mountHook,
  fetchCallOptions,
  applyExecutionPrerequisites,
} from "../test-helpers";
import { READY_TEXT_INPUT, READY_ANALYSIS_REPORT } from "../test-fixtures";

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
const { useCreativeDevelopment } = await import("../useCreativeDevelopment");

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
