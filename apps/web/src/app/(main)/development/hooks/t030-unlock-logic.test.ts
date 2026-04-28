// @vitest-environment jsdom
/**
 * @fileoverview T030: unlock logic and manual mode tests
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { mountHook } from "../test-helpers";

// ---------------------------------------------------------------------------
// Global mocks (must be hoisted before module imports that use them)
// ---------------------------------------------------------------------------

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
    await act(async () => {
      /* empty */
    });
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
