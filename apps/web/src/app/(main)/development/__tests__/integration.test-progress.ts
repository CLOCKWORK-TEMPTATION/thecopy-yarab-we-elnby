// @vitest-environment jsdom
/**
 * @fileoverview Integration tests for unlockStatus.progress (T051)
 */

import { act } from "@testing-library/react";
import { describe, it, expect } from "vitest";

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

describe("T051: unlockStatus.progress after gate fix", () => {
  it("T051: progress reflects textInput length when textInput > analysisReport", async () => {
    const { result } = await mountHook();

    act(() => {
      result.current.setTextInput("أ".repeat(80));
      result.current.setAnalysisReport("أ".repeat(20));
    });

    await act(async () => {
      /* empty */
    });

    // Progress should be based on max(80, 20) = 80
    expect(result.current.unlockStatus.progress).toBe(80);
  });

  it("T051b: progress reflects analysisReport length when analysisReport > textInput", async () => {
    const { result } = await mountHook();

    act(() => {
      result.current.setTextInput("أ".repeat(30));
      result.current.setAnalysisReport("أ".repeat(70));
    });

    await act(async () => {
      /* empty */
    });

    expect(result.current.unlockStatus.progress).toBe(70);
  });
});
