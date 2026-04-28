// @vitest-environment jsdom
/**
 * @fileoverview T020: task catalog executionMode correctness regression tests
 *
 * Covers:
 *  T020 — Regression: all 16 brainstorm task ids resolve executionMode === "brainstorm"
 *          + "integrated" resolves to "workflow-custom"
 */

import { describe, it, expect } from "vitest";

import { DEVELOPMENT_TASKS, getTaskById } from "../utils/task-catalog";
import { BRAINSTORM_TASK_IDS } from "./test-constants";

// ---------------------------------------------------------------------------
// T020: Regression — task catalog executionMode correctness
// ---------------------------------------------------------------------------

describe("T020: task catalog executionMode regression", () => {
  for (const taskId of BRAINSTORM_TASK_IDS) {
    it(`"${taskId}" resolves executionMode === "brainstorm"`, () => {
      const task = getTaskById(taskId);
      expect(
        task,
        `Task "${taskId}" must exist in DEVELOPMENT_TASKS`
      ).toBeDefined();
      expect(task!.executionMode).toBe("brainstorm");
    });
  }

  it('"integrated" resolves executionMode === "workflow-custom" (NOT brainstorm)', () => {
    const task = getTaskById("integrated");
    expect(task).toBeDefined();
    expect(task!.executionMode).toBe("workflow-custom");
    expect(task!.executionMode).not.toBe("brainstorm");
  });

  it("DEVELOPMENT_TASKS catalog contains all expected brainstorm tasks", () => {
    const brainstormIds = DEVELOPMENT_TASKS.filter(
      (t) => t.executionMode === "brainstorm"
    ).map((t) => t.id);

    for (const taskId of BRAINSTORM_TASK_IDS) {
      expect(
        brainstormIds,
        `Expected "${taskId}" to be in brainstorm tasks`
      ).toContain(taskId);
    }
  });

  it("workflow-single tasks do NOT include any of the 16 brainstorm ids", () => {
    const workflowSingleIds = DEVELOPMENT_TASKS.filter(
      (t) => t.executionMode === "workflow-single"
    ).map((t) => t.id);

    for (const taskId of BRAINSTORM_TASK_IDS) {
      expect(workflowSingleIds).not.toContain(taskId);
    }
  });
});
