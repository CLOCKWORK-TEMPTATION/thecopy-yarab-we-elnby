// @vitest-environment jsdom
/**
 * @fileoverview Integration tests for handleCatalogTaskSelect (T046–T047)
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

describe("T046-T047: handleCatalogTaskSelect", () => {
  beforeEach(() => vi.clearAllMocks());

  it("T046: handleCatalogTaskSelect sets selectedCatalogTaskId", () => {
    const { result } = await mountHook();

    expect(result.current.selectedCatalogTaskId).toBeNull();

    act(() => {
      result.current.handleCatalogTaskSelect("rhythm-mapping");
    });

    expect(result.current.selectedCatalogTaskId).toBe("rhythm-mapping");
  });

  it("T046b: selecting a different task updates selectedCatalogTaskId", () => {
    const { result } = await mountHook();

    act(() => {
      result.current.handleCatalogTaskSelect("analysis");
    });

    expect(result.current.selectedCatalogTaskId).toBe("analysis");

    act(() => {
      result.current.handleCatalogTaskSelect("creative");
    });

    expect(result.current.selectedCatalogTaskId).toBe("creative");
  });

  it("T047: selecting a new task clears previous catalogResult", async () => {
    mockFetch.mockResolvedValueOnce(primaryOk("النتيجة الأولى"));

    const { result } = await mountHook();

    prepareForExecution(result);

    // Run a task to populate catalogResult
    await act(async () => {
      await result.current.executeTask("completion");
    });

    expect(result.current.catalogResult).not.toBeNull();

    // Now select a different task — catalogResult must clear
    act(() => {
      result.current.handleCatalogTaskSelect("creative");
    });

    expect(result.current.catalogResult).toBeNull();
    expect(result.current.selectedCatalogTaskId).toBe("creative");
  });
});
