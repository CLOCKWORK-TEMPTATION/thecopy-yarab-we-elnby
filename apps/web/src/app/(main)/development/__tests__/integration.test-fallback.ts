// @vitest-environment jsdom
/**
 * @fileoverview Integration tests for fallback path (T054)
 */

import { act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { primaryFail, brainstormOk } from "./test-fixtures";
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

describe("T054: Fallback path when primary route fails", () => {
  beforeEach(() => vi.clearAllMocks());

  it("T054: uses /api/brainstorm as fallback and populates catalogResult", async () => {
    const fallbackText = "نتيجة من brainstorm fallback";
    mockFetch.mockResolvedValueOnce(primaryFail(503)); // primary fails (no API key)
    mockFetch.mockResolvedValueOnce(brainstormOk(fallbackText));

    const { result } = await mountHook();

    prepareForExecution(result);

    await act(async () => {
      await result.current.executeTask("completion");
    });

    expect(result.current.catalogResult).not.toBeNull();
    expect(result.current.catalogResult?.text).toBe(fallbackText);
    expect(result.current.error).toBeNull();
  });
});
