// @vitest-environment jsdom
/**
 * @fileoverview Integration tests for handleCatalogSubmit (T053)
 */

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

describe("T053: handleCatalogSubmit is exposed from hook", () => {
  it("T053: handleCatalogSubmit is a function", async () => {
    const { result } = await mountHook();
    expect(typeof result.current.handleCatalogSubmit).toBe("function");
  });
});
