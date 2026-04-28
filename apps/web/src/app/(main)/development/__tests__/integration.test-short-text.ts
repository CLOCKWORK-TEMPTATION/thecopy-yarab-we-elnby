// @vitest-environment jsdom
/**
 * @fileoverview Integration tests for short text guard (T052)
 */

import { act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

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

describe("T052: Short text guard", () => {
  it("T052: executeTask sets error without calling fetch when textInput < 20 chars", async () => {
    const { result } = await mountHook();

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
