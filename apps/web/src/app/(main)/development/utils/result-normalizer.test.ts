/**
 * @fileoverview Unit tests for result-normalizer.ts (T026)
 *
 * Covers:
 *  - BrainstormDebateResponse with finalDecision → finalText extracted
 *  - BrainstormDebateResponse with judgeReasoning fallback
 *  - BrainstormDebateResponse with only proposals → concatenation
 *  - WorkflowExecutionResponse single-step → finalText from results[finalStepId]
 *  - WorkflowExecutionResponse multi-step → taskResults populated for completed steps
 *  - Failed step excluded from taskResults
 */

import { describe, it, expect } from "vitest";

import { normalizeResult } from "./result-normalizer";

import type { DevelopmentTaskDefinition } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal DevelopmentTaskDefinition for testing */
function makeTask(
  id: string,
  finalStepId: string,
  executionMode: DevelopmentTaskDefinition["executionMode"] = "brainstorm"
): DevelopmentTaskDefinition {
  return {
    id,
    nameAr: `مهمة ${id}`,
    category: "core",
    icon: "Test",
    description: "test task",
    executionMode,
    backendTarget: "/api/brainstorm",
    finalStepId,
  };
}

// ---------------------------------------------------------------------------
// Brainstorm response tests
// ---------------------------------------------------------------------------

describe("normalizeResult — BrainstormDebateResponse", () => {
  const task = makeTask("creative", "creative", "brainstorm");

  it("extracts finalDecision as finalText when present", () => {
    const raw = {
      finalDecision: "النص النهائي من القاضي",
      judgeReasoning: "تفسير القاضي",
      proposals: [
        { agentId: "agent1", text: "اقتراح الوكيل", confidence: 0.8 },
      ],
    };

    const report = normalizeResult(raw, task);

    expect(report.finalText).toBe("النص النهائي من القاضي");
    expect(report.taskId).toBe("creative");
    expect(report.executionMode).toBe("brainstorm");
  });

  it("falls back to judgeReasoning when finalDecision is absent", () => {
    const raw = {
      judgeReasoning: "تفسير القاضي المفصل",
      proposals: [{ agentId: "agent1", text: "اقتراح", confidence: 0.7 }],
    };

    const report = normalizeResult(raw, task);

    expect(report.finalText).toBe("تفسير القاضي المفصل");
  });

  it("falls back to judgeReasoning when finalDecision is an empty string", () => {
    const raw = {
      finalDecision: "   ",
      judgeReasoning: "تفسير مهم",
    };

    const report = normalizeResult(raw, task);

    // trimmed empty string is falsy — should fall through to judgeReasoning
    expect(report.finalText).toBe("تفسير مهم");
  });

  it("concatenates proposals text when finalDecision and judgeReasoning are absent", () => {
    const raw = {
      proposals: [
        { agentId: "agent1", text: "الاقتراح الأول", confidence: 0.9 },
        { agentId: "agent2", text: "الاقتراح الثاني", confidence: 0.8 },
      ],
    };

    const report = normalizeResult(raw, task);

    expect(report.finalText).toContain("الاقتراح الأول");
    expect(report.finalText).toContain("الاقتراح الثاني");
  });

  it("proposals without text are filtered out during concatenation", () => {
    const raw = {
      proposals: [
        { agentId: "agent1", text: "النص الصحيح", confidence: 0.9 },
        { agentId: "agent2", text: "", confidence: 0.5 },
        { agentId: "agent3", confidence: 0.4 },
      ],
    };

    const report = normalizeResult(raw, task);

    expect(report.finalText).toContain("النص الصحيح");
    expect(report.finalText).not.toContain("agent2");
  });

  it("aiResponse.text equals finalText", () => {
    const raw = { finalDecision: "النص النهائي" };
    const report = normalizeResult(raw, task);

    expect(report.aiResponse.text).toBe(report.finalText);
  });

  it("aiResponse.raw is a JSON string of the original response", () => {
    const raw = { finalDecision: "نص", proposals: [] };
    const report = normalizeResult(raw, task);

    const parsed = JSON.parse(report.aiResponse.raw) as typeof raw;
    expect(parsed.finalDecision).toBe("نص");
  });

  it("taskResults is populated from proposals with valid text", () => {
    const raw = {
      proposals: [
        {
          agentId: "agent1",
          agentName: "الوكيل الأول",
          text: "نتيجة الوكيل 1",
          confidence: 0.9,
        },
        {
          agentId: "agent2",
          agentName: "الوكيل الثاني",
          text: "نتيجة الوكيل 2",
          confidence: 0.7,
        },
      ],
    };

    const report = normalizeResult(raw, task);

    expect(report.taskResults).toHaveProperty("agent1");
    expect(report.taskResults).toHaveProperty("agent2");
    expect(report.taskResults["agent1"].text).toBe("نتيجة الوكيل 1");
    expect(report.taskResults["agent2"].confidence).toBe(0.7);
  });

  it("taskResults excludes proposals without agentId", () => {
    const raw = {
      proposals: [
        { text: "نص بدون agentId", confidence: 0.8 },
        { agentId: "agent1", text: "نص مع agentId", confidence: 0.9 },
      ],
    };

    const report = normalizeResult(raw, task);

    expect(Object.keys(report.taskResults)).toHaveLength(1);
    expect(report.taskResults).toHaveProperty("agent1");
  });

  it("returns empty string finalText when all fields are missing", () => {
    const raw = {};
    const report = normalizeResult(raw, task);

    expect(report.finalText).toBe("");
  });

  it("handles null input gracefully", () => {
    const report = normalizeResult(null, task);

    expect(report.finalText).toBe("");
    expect(report.taskId).toBe("creative");
  });
});

// ---------------------------------------------------------------------------
// Workflow response tests
// ---------------------------------------------------------------------------

describe("normalizeResult — WorkflowExecutionResponse", () => {
  const singleStepTask = makeTask(
    "character-deep-analyzer",
    "character-deep-analyzer",
    "workflow-single"
  );

  it("extracts finalText from results[finalStepId] for single-step workflow", () => {
    const raw = {
      status: "completed",
      results: {
        "character-deep-analyzer": {
          agentId: "character-deep-analyzer",
          taskType: "character-deep-analyzer",
          status: "completed",
          output: { text: "تحليل الشخصيات المعمق", confidence: 0.95 },
        },
      },
    };

    const report = normalizeResult(raw, singleStepTask);

    expect(report.finalText).toBe("تحليل الشخصيات المعمق");
    expect(report.executionMode).toBe("workflow-single");
    expect(report.taskId).toBe("character-deep-analyzer");
  });

  it("aiResponse.confidence comes from the final step output", () => {
    const raw = {
      status: "completed",
      results: {
        "character-deep-analyzer": {
          status: "completed",
          output: { text: "النتيجة", confidence: 0.88 },
        },
      },
    };

    const report = normalizeResult(raw, singleStepTask);

    expect(report.aiResponse.confidence).toBe(0.88);
  });

  it("taskResults is populated for all completed steps in multi-step workflow", () => {
    const multiTask = makeTask("integrated", "integrated", "workflow-custom");
    const raw = {
      status: "completed",
      results: {
        analysis: {
          agentId: "analysis",
          taskType: "analysis",
          status: "completed",
          output: { text: "نتيجة التحليل", confidence: 0.9 },
        },
        creative: {
          agentId: "creative",
          taskType: "creative",
          status: "completed",
          output: { text: "نتيجة الإبداع", confidence: 0.85 },
        },
        integrated: {
          agentId: "integrated",
          taskType: "integrated",
          status: "completed",
          output: { text: "النتيجة المتكاملة", confidence: 0.92 },
        },
      },
    };

    const report = normalizeResult(raw, multiTask);

    expect(report.taskResults).toHaveProperty("analysis");
    expect(report.taskResults).toHaveProperty("creative");
    expect(report.taskResults).toHaveProperty("integrated");
    expect(report.taskResults["analysis"].text).toBe("نتيجة التحليل");
    expect(report.taskResults["creative"].text).toBe("نتيجة الإبداع");
    expect(report.finalText).toBe("النتيجة المتكاملة");
  });

  it("failed step is excluded from taskResults", () => {
    const multiTask = makeTask(
      "recommendations-generator",
      "recommendations",
      "workflow-custom"
    );
    const raw = {
      status: "partial",
      results: {
        "target-audience": {
          agentId: "target-audience-analyzer",
          status: "completed",
          output: { text: "تحليل الجمهور", confidence: 0.8 },
        },
        "literary-quality": {
          agentId: "literary-quality-analyzer",
          status: "failed",
          output: { text: "حدث خطأ", confidence: 0 },
        },
        recommendations: {
          agentId: "recommendations-generator",
          status: "completed",
          output: { text: "التوصيات النهائية", confidence: 0.75 },
        },
      },
    };

    const report = normalizeResult(raw, multiTask);

    expect(report.taskResults).toHaveProperty("target-audience");
    expect(report.taskResults).toHaveProperty("recommendations");
    // failed step must NOT appear
    expect(report.taskResults).not.toHaveProperty("literary-quality");
  });

  it("step with empty output text is excluded from taskResults", () => {
    const raw = {
      status: "completed",
      results: {
        "character-deep-analyzer": {
          agentId: "character-deep-analyzer",
          status: "completed",
          output: { text: "", confidence: 0 },
        },
      },
    };

    const report = normalizeResult(raw, singleStepTask);

    expect(Object.keys(report.taskResults)).toHaveLength(0);
    expect(report.finalText).toBe("");
  });

  it("returns empty finalText when finalStepId is not in results", () => {
    const raw = {
      status: "completed",
      results: {
        "some-other-step": {
          agentId: "other",
          status: "completed",
          output: { text: "نتيجة خطوة أخرى", confidence: 0.8 },
        },
      },
    };

    const report = normalizeResult(raw, singleStepTask);

    // finalStepId is 'character-deep-analyzer' but only 'some-other-step' exists
    expect(report.finalText).toBe("");
  });

  it("taskResults agentName falls back to stepId when agentId is absent", () => {
    const raw = {
      status: "completed",
      results: {
        "character-deep-analyzer": {
          // no agentId field
          status: "completed",
          output: { text: "النتيجة", confidence: 0.9 },
        },
      },
    };

    const report = normalizeResult(raw, singleStepTask);

    expect(report.taskResults["character-deep-analyzer"].agentName).toBe(
      "character-deep-analyzer"
    );
    expect(report.taskResults["character-deep-analyzer"].agentId).toBe(
      "character-deep-analyzer"
    );
  });

  it("aiResponse.raw is a JSON string of the original workflow response", () => {
    const raw = {
      status: "completed",
      results: {
        "character-deep-analyzer": {
          status: "completed",
          output: { text: "نص", confidence: 0.9 },
        },
      },
      metrics: { duration: 1234 },
    };

    const report = normalizeResult(raw, singleStepTask);

    const parsed = JSON.parse(report.aiResponse.raw) as typeof raw;
    expect(parsed.status).toBe("completed");
    expect(parsed.metrics).toEqual({ duration: 1234 });
  });

  it("aiResponse.metadata comes from workflow metrics", () => {
    const raw = {
      status: "completed",
      results: {
        "character-deep-analyzer": {
          status: "completed",
          output: { text: "نتيجة", confidence: 0.9 },
        },
      },
      metrics: { totalDuration: 500, agentCount: 1 },
    };

    const report = normalizeResult(raw, singleStepTask);

    expect(report.aiResponse.metadata).toEqual({
      totalDuration: 500,
      agentCount: 1,
    });
  });

  it("distinguishes workflow from brainstorm by presence of results object", () => {
    // Same shape test: if `results` key exists → workflow path
    const withResults = { results: {} };
    const withoutResults = { finalDecision: "نص" };

    const workflowReport = normalizeResult(withResults, singleStepTask);
    const brainstormReport = normalizeResult(
      withoutResults,
      makeTask("creative", "creative", "brainstorm")
    );

    // workflow path returns finalText from results[finalStepId] (empty here)
    expect(workflowReport.finalText).toBe("");
    // brainstorm path returns finalDecision
    expect(brainstormReport.finalText).toBe("نص");
  });
});
