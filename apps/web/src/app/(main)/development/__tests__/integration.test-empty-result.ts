// @vitest-environment jsdom
/**
 * @fileoverview Integration tests for empty result handling (T049)
 */

import { act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

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

    const { result } = await mountHook();

    prepareForExecution(result);

    await act(async () => {
      await result.current.executeTask("completion");
    });

    // Empty finalText should trigger an error
    expect(result.current.error).toBeTruthy();
    expect(result.current.catalogResult).toBeNull();
  });
});
