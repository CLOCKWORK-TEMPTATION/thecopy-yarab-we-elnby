import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createSessionDiagnostics,
  createAgentDiagnosticEntry,
  finalizeAgentDiagnostic,
  buildDiagnosticsSummary,
} from "./diagnostics";
import type { SessionDiagnostics } from "./diagnostics";

describe("createSessionDiagnostics", () => {
  it("should create diagnostics with the given sessionId", () => {
    const diag = createSessionDiagnostics("session-42");
    expect(diag.sessionId).toBe("session-42");
    expect(diag.agentEntries).toEqual([]);
    expect(diag.errors).toEqual([]);
  });
});

describe("createAgentDiagnosticEntry", () => {
  it("should create a pending entry", () => {
    const entry = createAgentDiagnosticEntry("agent-7");
    expect(entry.agentId).toBe("agent-7");
    expect(entry.status).toBe("pending");
  });
});

describe("finalizeAgentDiagnostic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T10:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should set completedAt and duration on success", () => {
    const entry = createAgentDiagnosticEntry("a-1");
    vi.setSystemTime(new Date("2026-01-15T10:00:03Z"));
    finalizeAgentDiagnostic(entry, "completed");
    expect(entry.status).toBe("completed");
    expect(entry.durationMs).toBe(3000);
  });

  it("should set errorMessage on error", () => {
    const entry = createAgentDiagnosticEntry("a-2");
    finalizeAgentDiagnostic(entry, "error", "Network timeout");
    expect(entry.errorMessage).toBe("Network timeout");
  });
});

describe("buildDiagnosticsSummary", () => {
  it("should compute correct summary", () => {
    const diag: SessionDiagnostics = {
      sessionId: "s-1",
      startedAt: "2026-01-15T10:00:00Z",
      agentEntries: [
        {
          agentId: "a-1",
          startedAt: "",
          completedAt: "",
          durationMs: 2000,
          status: "completed",
        },
        {
          agentId: "a-2",
          startedAt: "",
          completedAt: "",
          durationMs: 4000,
          status: "completed",
        },
        {
          agentId: "a-3",
          startedAt: "",
          completedAt: "",
          durationMs: 1000,
          status: "error",
          errorMessage: "fail",
        },
      ],
      phaseTimings: {
        1: { startedAt: "", agentCount: 3 },
        2: { startedAt: "", agentCount: 2 },
      },
      errors: [{ phase: 1, error: "test", retryable: true, timestamp: "" }],
    };
    const summary = buildDiagnosticsSummary(diag);
    expect(summary.totalAgentRuns).toBe(3);
    expect(summary.successfulRuns).toBe(2);
    expect(summary.failedRuns).toBe(1);
    expect(summary.phasesCompleted).toBe(2);
  });

  it("should handle empty diagnostics", () => {
    const summary = buildDiagnosticsSummary(createSessionDiagnostics("empty"));
    expect(summary.totalAgentRuns).toBe(0);
  });
});
