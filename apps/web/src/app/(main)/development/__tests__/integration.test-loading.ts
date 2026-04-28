// @vitest-environment jsdom
/**
 * @fileoverview Integration tests for isLoading lifecycle (T048)
 */

import { act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { primaryOk, primaryFail } from "./test-fixtures";
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

describe("T048: isLoading transitions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("T048: isLoading is false after successful primary-path executeTask", async () => {
    mockFetch.mockResolvedValueOnce(primaryOk());

    const { result } = await mountHook();
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

    const { result } = await mountHook();
    prepareForExecution(result);

    await act(async () => {
      await result.current.executeTask("completion");
    });

    expect(result.current.isLoading).toBe(false);
  });
});
