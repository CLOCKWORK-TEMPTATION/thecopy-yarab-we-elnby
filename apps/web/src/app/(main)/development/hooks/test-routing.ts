// @vitest-environment jsdom
/**
 * @fileoverview Test routing functionality
 */

import { act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { READY_TEXT_INPUT, READY_ANALYSIS_REPORT } from "./test-fixtures";
import {
  okResponse,
  errResponse,
  mountHook,
  fetchCallOptions,
  applyExecutionPrerequisites,
} from "./test-helpers";

// ---------------------------------------------------------------------------
// Global mocks (must be hoisted before module imports that use them)
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Helper: mock the primary /api/development/execute to fail so tests exercise fallback routes
function mockPrimaryFail() {
  mockFetch.mockResolvedValueOnce(errResponse(503));
}

describe("test-routing - brainstorm mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls POST /api/brainstorm (via fallback when primary fails)", async () => {
    // First call → primary /api/development/execute fails
    mockPrimaryFail();
    // Second call → /api/brainstorm succeeds
    mockFetch.mockResolvedValueOnce(
      okResponse({
        finalDecision: "ok",
        proposals: [{ agentId: "completion", text: "ok", confidence: 0.85 }],
      })
    );

    const { result } = mountHook();

    applyExecutionPrerequisites(result);

    await act(async () => {
      await result.current.executeTask("completion"); // executionMode: brainstorm
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [url0] = mockFetch.mock.calls[0] as [string];
    const [url1] = mockFetch.mock.calls[1] as [string];
    expect(url0).toBe("/api/development/execute");
    expect(url1).toBe("/api/brainstorm");
    expect(fetchCallOptions(1)?.method).toBe("POST");
  });
});

describe("test-routing - workflow-single mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls POST /api/workflow/execute-custom (via fallback when primary fails)", async () => {
    mockPrimaryFail();
    mockFetch.mockResolvedValueOnce(
      okResponse({
        success: true,
        status: "completed",
        results: {
          "character-deep-analyzer": {
            agentId: "character-deep-analyzer",
            status: "completed",
            output: { text: "تحليل عميق", confidence: 0.9 },
          },
        },
      })
    );

    const { result } = mountHook();

    applyExecutionPrerequisites(result);

    await act(async () => {
      await result.current.executeTask("character-deep-analyzer");
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [url1] = mockFetch.mock.calls[1] as [string];
    expect(url1).toBe("/api/workflow/execute-custom");
    expect(fetchCallOptions(1)?.method).toBe("POST");
  });

  it("sends a single-step config (via fallback)", async () => {
    mockPrimaryFail();
    mockFetch.mockResolvedValueOnce(
      okResponse({
        status: "completed",
        results: {
          "character-deep-analyzer": {
            status: "completed",
            output: { text: "نتيجة", confidence: 0.9 },
          },
        },
      })
    );

    const { result } = mountHook();

    applyExecutionPrerequisites(result);

    await act(async () => {
      await result.current.executeTask("character-deep-analyzer");
    });

    const rawBody = fetchCallOptions(1)?.body as string;
    const body = JSON.parse(rawBody) as { config: { steps: unknown[] } };
    expect(body.config).toBeDefined();
    expect(Array.isArray(body.config.steps)).toBe(true);
    expect(body.config.steps).toHaveLength(1);
  });
});

describe("test-routing - workflow-custom mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls POST /api/workflow/execute-custom with multi-step config (via fallback)", async () => {
    mockPrimaryFail();
    mockFetch.mockResolvedValueOnce(
      okResponse({
        status: "completed",
        results: {
          integrated: {
            status: "completed",
            output: { text: "نتيجة متكاملة", confidence: 0.88 },
          },
        },
      })
    );

    const { result } = mountHook();

    applyExecutionPrerequisites(result);

    await act(async () => {
      await result.current.executeTask("integrated");
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [url1] = mockFetch.mock.calls[1] as [string];
    expect(url1).toBe("/api/workflow/execute-custom");

    const rawBody = fetchCallOptions(1)?.body as string;
    const body = JSON.parse(rawBody) as { config: { steps: unknown[] } };
    expect(body.config).toBeDefined();
    expect(body.config.steps.length).toBeGreaterThan(1);
  });
});

describe("test-routing - advanced settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("advancedSettings are included in workflow-single request body under input (via fallback)", async () => {
    mockPrimaryFail();
    mockFetch.mockResolvedValueOnce(
      okResponse({
        status: "completed",
        results: {
          "character-deep-analyzer": {
            status: "completed",
            output: { text: "نتيجة", confidence: 0.9 },
          },
        },
      })
    );

    const { result } = mountHook();

    act(() => {
      result.current.setTextInput(READY_TEXT_INPUT);
      result.current.setAnalysisReport(READY_ANALYSIS_REPORT);
      result.current.updateAdvancedSettings({
        enableRAG: false,
        enableDebate: true,
      });
    });

    await act(async () => {
      await result.current.executeTask("character-deep-analyzer");
    });

    const rawBody = fetchCallOptions(1)?.body as string;
    const body = JSON.parse(rawBody) as {
      input: {
        advancedSettings: { enableRAG: boolean; enableDebate: boolean };
      };
    };
    expect(body.input.advancedSettings).toBeDefined();
    expect(body.input.advancedSettings.enableRAG).toBe(false);
    expect(body.input.advancedSettings.enableDebate).toBe(true);
  });
});

describe("test-routing - error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null and sets error for unknown task id", async () => {
    const { result } = mountHook();

    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.executeTask("non-existent-task-id");
    });

    expect(returnValue).toBeNull();
  });
});
