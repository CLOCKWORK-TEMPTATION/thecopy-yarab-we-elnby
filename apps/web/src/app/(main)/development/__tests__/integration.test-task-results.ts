// @vitest-environment jsdom
/**
 * @fileoverview Integration tests for taskResults population (T055)
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

describe("T055: taskResults populated after executeTask", () => {
  beforeEach(() => vi.clearAllMocks());

  it("T055: taskResults contains the executed task id after success", async () => {
    mockFetch.mockResolvedValueOnce(primaryOk("نتيجة المهمة"));

    const { result } = await mountHook();

    prepareForExecution(result);

    await act(async () => {
      await result.current.executeTask("completion");
    });

    expect(result.current.taskResults).toHaveProperty("completion");
    expect(result.current.taskResults["completion"].text).toBe("نتيجة المهمة");
    expect(result.current.taskResults["completion"].agentId).toBe("completion");
  });
});
