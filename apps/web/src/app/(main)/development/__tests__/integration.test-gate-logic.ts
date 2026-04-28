// @vitest-environment jsdom
/**
 * @fileoverview Integration tests for isAnalysisComplete gate unlock logic (T043–T045)
 */

import { act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { mountHook } from "./test-helpers";

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

describe("T043-T045: isAnalysisComplete gate unlock logic", () => {
  beforeEach(() => vi.clearAllMocks());

  it("T043: isAnalysisComplete becomes true when textInput reaches 100 chars", async () => {
    const { result } = await mountHook();

    // Initially locked
    expect(result.current.isAnalysisComplete).toBe(false);

    act(() => {
      result.current.setTextInput("أ".repeat(101));
    });

    await act(async () => {
      /* empty */
    });

    expect(result.current.isAnalysisComplete).toBe(true);
  });

  it("T043b: textInput of exactly 100 chars does NOT unlock (boundary — must exceed 100)", async () => {
    const { result } = await mountHook();

    act(() => {
      result.current.setTextInput("أ".repeat(100));
    });

    await act(async () => {
      /* empty */
    });

    // 100 chars is NOT > MIN_TEXT_LENGTH(100) — still locked
    expect(result.current.isAnalysisComplete).toBe(false);
  });

  it("T044: isAnalysisComplete becomes true when analysisReport reaches 100 chars (existing path)", async () => {
    const { result } = await mountHook();

    act(() => {
      result.current.setAnalysisReport("أ".repeat(101));
    });

    await act(async () => {
      /* empty */
    });

    expect(result.current.isAnalysisComplete).toBe(true);
  });

  it("T045: isAnalysisComplete stays false when both textInput and analysisReport < 100 chars", async () => {
    const { result } = await mountHook();

    act(() => {
      result.current.setTextInput("أ".repeat(50));
      result.current.setAnalysisReport("أ".repeat(50));
    });

    await act(async () => {
      /* empty */
    });

    expect(result.current.isAnalysisComplete).toBe(false);
  });

  it("T045b: textInput alone (no report) unlocks when it exceeds 100 chars", async () => {
    const { result } = await mountHook();

    // No analysisReport set — only textInput
    act(() => {
      result.current.setTextInput("أ".repeat(150));
    });

    await act(async () => {
      /* empty */
    });

    expect(result.current.isAnalysisComplete).toBe(true);
  });
});
