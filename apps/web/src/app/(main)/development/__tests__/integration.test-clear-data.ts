// @vitest-environment jsdom
/**
 * @fileoverview Integration tests for clearAnalysisData (T050)
 */

import { act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { primaryOk } from "./test-fixtures";
import { mountHook, prepareForExecution } from "./test-helpers";

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

describe("T050: clearAnalysisData resets catalog state", () => {
  beforeEach(() => vi.clearAllMocks());

  it("T050: clearAnalysisData sets catalogResult to null", async () => {
    mockFetch.mockResolvedValueOnce(primaryOk("نتيجة"));

    const { result } = await mountHook();

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
