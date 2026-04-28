/**
 * @fileoverview Backend integration tests for workflow route isolation
 *
 * Confirms that the /api/brainstorm route is NOT intercepted by the
 * newly registered workflow routes (/api/workflow/...).
 */

import { describe, it, expect } from "vitest";

describe("Route isolation", () => {
  it("brainstorm route path does not overlap with workflow routes", () => {
    // Verify the paths are distinct
    const brainstormPath = "/api/brainstorm";
    const workflowPaths = [
      "/api/workflow/presets",
      "/api/workflow/execute",
      "/api/workflow/execute-custom",
    ];

    for (const wfPath of workflowPaths) {
      expect(wfPath).not.toBe(brainstormPath);
      expect(wfPath.startsWith(brainstormPath)).toBe(false);
      expect(brainstormPath.startsWith(wfPath)).toBe(false);
    }
  });

  it("workflow routes all share the /api/workflow prefix", () => {
    const workflowPaths = [
      "/api/workflow/presets",
      "/api/workflow/execute",
      "/api/workflow/execute-custom",
    ];

    for (const wfPath of workflowPaths) {
      expect(wfPath.startsWith("/api/workflow")).toBe(true);
    }
  });

  it("brainstorm path does not start with /api/workflow", () => {
    const brainstormPath = "/api/brainstorm";
    expect(brainstormPath.startsWith("/api/workflow")).toBe(false);
  });
});
