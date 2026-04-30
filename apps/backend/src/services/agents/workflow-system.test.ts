import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskType } from "@/services/agents/core/enums";
import { createWorkflow } from "@/services/agents/core/workflow-builder";
import { WorkflowExecutor } from "@/services/agents/core/workflow-executor";
import {
  PRESET_WORKFLOWS,
  createFastParallelWorkflow,
  createStandardAnalysisWorkflow,
  getPresetWorkflow,
} from "@/services/agents/core/workflow-presets";
import {
  AgentStatus,
  WorkflowStatus,
} from "@/services/agents/core/workflow-types";
import { MultiAgentOrchestrator } from "@/services/agents/orchestrator";

import type {
  StandardAgentInput,
  StandardAgentOutput,
} from "@/services/agents/core/types";
import type {
  WorkflowConfig,
  WorkflowStep,
} from "@/services/agents/core/workflow-types";
import type { BaseAgent } from "@/services/agents/shared/BaseAgent";

type ExecuteTaskMock = ReturnType<
  typeof vi.fn<(input: StandardAgentInput) => Promise<StandardAgentOutput>>
>;
type AgentRegistryGetAgent = (taskType: TaskType) => BaseAgent | undefined;

const { getAgentMock } = vi.hoisted(() => ({
  getAgentMock: vi.fn<AgentRegistryGetAgent>(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/config/sentry", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/services/agents/debate", () => ({
  startDebate: vi.fn(),
}));

vi.mock("@/services/agents/registry", () => ({
  agentRegistry: {
    getAgent: getAgentMock,
    registerAgent: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  getAgentMock.mockReturnValue(createAgent().agent);
});

function output(confidence = 0.85): StandardAgentOutput {
  return {
    text: "تحليل مكتمل",
    confidence,
    notes: [],
    metadata: {},
  };
}

function createAgent(
  implementation: ExecuteTaskMock = vi.fn().mockResolvedValue(output()),
): { agent: BaseAgent; executeTask: ExecuteTaskMock } {
  return {
    agent: { executeTask: implementation } as unknown as BaseAgent,
    executeTask: implementation,
  };
}

function input(): StandardAgentInput {
  return {
    input: "نص درامي للاختبار",
    context: { projectName: "مشروع اختبار" },
  };
}

function stepAt(workflow: WorkflowConfig, index: number): WorkflowStep {
  const step = workflow.steps[index];
  if (!step) {
    throw new Error(`Expected workflow step at index ${index}.`);
  }
  return step;
}

describe("WorkflowBuilder", () => {
  it("builds configured sequential, dependent, and parallel steps", () => {
    const workflow = createWorkflow("اختبار", "وصف")
      .addStep("character", TaskType.CHARACTER_DEEP_ANALYZER)
      .addDependentStep("dialogue", TaskType.DIALOGUE_ADVANCED_ANALYZER, [
        {
          agentId: "character",
          taskType: TaskType.CHARACTER_DEEP_ANALYZER,
          minConfidence: 0.8,
        },
      ])
      .addParallelSteps([
        { agentId: "themes", taskType: TaskType.THEMES_MESSAGES_ANALYZER },
        { agentId: "visual", taskType: TaskType.VISUAL_CINEMATIC_ANALYZER },
      ])
      .withConcurrency(3)
      .withErrorHandling("strict")
      .withTimeout(120_000)
      .build();

    expect(workflow.name).toBe("اختبار");
    expect(workflow.description).toBe("وصف");
    expect(workflow.maxConcurrency).toBe(3);
    expect(workflow.errorHandling).toBe("strict");
    expect(workflow.globalTimeout).toBe(120_000);
    expect(workflow.steps).toHaveLength(4);
    expect(stepAt(workflow, 1).dependencies[0]).toMatchObject({
      agentId: "character",
      minConfidence: 0.8,
      required: true,
    });
    expect(stepAt(workflow, 2).parallel).toBe(true);
  });
});

describe("WorkflowExecutor", () => {
  it("executes a successful workflow and records metrics", async () => {
    const executor = new WorkflowExecutor();
    const { executeTask } = createAgent();
    getAgentMock.mockReturnValue({ executeTask } as unknown as BaseAgent);
    const workflow = createWorkflow("تنفيذ")
      .addStep("character", TaskType.CHARACTER_DEEP_ANALYZER)
      .build();

    const result = await executor.execute(workflow, input());
    const step = result.results.get("step-0");

    expect(result.status).toBe(WorkflowStatus.COMPLETED);
    expect(step?.status).toBe(AgentStatus.COMPLETED);
    expect(result.metrics.successRate).toBe(1);
    expect(executeTask).toHaveBeenCalledTimes(1);
  });

  it("retries a failed step according to the retry policy", async () => {
    const executor = new WorkflowExecutor();
    const executeTask = vi
      .fn<(agentInput: StandardAgentInput) => Promise<StandardAgentOutput>>()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce(output(0.9));
    getAgentMock.mockReturnValue({ executeTask } as unknown as BaseAgent);
    const workflow = createWorkflow("إعادة محاولة")
      .addStep("character", TaskType.CHARACTER_DEEP_ANALYZER, {
        retryPolicy: { maxRetries: 1, backoffMs: 0 },
      })
      .build();

    const result = await executor.execute(workflow, input());

    expect(result.status).toBe(WorkflowStatus.COMPLETED);
    expect(result.results.get("step-0")?.retryCount).toBe(1);
    expect(executeTask).toHaveBeenCalledTimes(2);
  });

  it("skips a dependent step when minimum confidence is not met", async () => {
    const executor = new WorkflowExecutor();
    getAgentMock.mockImplementation(
      (taskType) =>
        createAgent(
          vi
            .fn()
            .mockResolvedValue(
              output(taskType === TaskType.CHARACTER_DEEP_ANALYZER ? 0.5 : 0.9),
            ),
        ).agent,
    );
    const workflow = createWorkflow("اعتماد")
      .addStep("character", TaskType.CHARACTER_DEEP_ANALYZER)
      .addStep("dialogue", TaskType.DIALOGUE_ADVANCED_ANALYZER, {
        dependencies: [
          {
            agentId: "character",
            taskType: TaskType.CHARACTER_DEEP_ANALYZER,
            required: true,
            minConfidence: 0.8,
          },
        ],
        skipOnError: true,
      })
      .build();

    const result = await executor.execute(workflow, input());

    expect(result.status).toBe(WorkflowStatus.COMPLETED);
    expect(result.results.get("step-0")?.status).toBe(AgentStatus.COMPLETED);
    expect(result.results.get("step-1")?.status).toBe(AgentStatus.SKIPPED);
  });

  it("fails a strict workflow when the required agent throws", async () => {
    const executor = new WorkflowExecutor();
    getAgentMock.mockReturnValue(
      createAgent(vi.fn().mockRejectedValue(new Error("agent failed"))).agent,
    );
    const workflow = createWorkflow("فشل صارم")
      .addStep("character", TaskType.CHARACTER_DEEP_ANALYZER, {
        retryPolicy: { maxRetries: 0, backoffMs: 0 },
      })
      .withErrorHandling("strict")
      .build();

    const result = await executor.execute(workflow, input());

    expect(result.status).toBe(WorkflowStatus.FAILED);
    expect(result.results.get("step-0")?.status).toBe(AgentStatus.FAILED);
  });
});

describe("MultiAgentOrchestrator", () => {
  it("executes agents in parallel and includes metadata when requested", async () => {
    const orchestrator = MultiAgentOrchestrator.getInstance();
    getAgentMock.mockReturnValue(createAgent().agent);

    const result = await orchestrator.executeAgents({
      fullText: "نص",
      projectName: "مشروع",
      taskTypes: [
        TaskType.CHARACTER_DEEP_ANALYZER,
        TaskType.THEMES_MESSAGES_ANALYZER,
      ],
      options: { includeMetadata: true, parallel: true },
    });

    expect(result.results.size).toBe(2);
    expect(result.summary.successfulTasks).toBe(2);
    expect(result.summary.failedTasks).toBe(0);
    expect(result.metadata?.tasksExecuted).toEqual([
      TaskType.CHARACTER_DEEP_ANALYZER,
      TaskType.THEMES_MESSAGES_ANALYZER,
    ]);
  });

  it("passes context to a single agent and rejects missing agents", async () => {
    const orchestrator = MultiAgentOrchestrator.getInstance();
    const { agent, executeTask } = createAgent();
    getAgentMock.mockReturnValueOnce(agent).mockReturnValueOnce(undefined);

    const result = await orchestrator.executeSingleAgent(
      TaskType.CHARACTER_DEEP_ANALYZER,
      "نص",
      { genre: "drama" },
    );

    expect(result.text).toBe("تحليل مكتمل");
    const calledInput = executeTask.mock.calls[0]?.[0];
    expect(calledInput?.input).toBe("نص");
    expect(calledInput?.context).toMatchObject({ genre: "drama" });
    await expect(
      orchestrator.executeSingleAgent(TaskType.CHARACTER_DEEP_ANALYZER, "نص"),
    ).rejects.toThrow("Agent not found for task type");
  });
});

describe("Preset workflows", () => {
  it("builds the standard and fast presets with their intended constraints", () => {
    const standard = createStandardAnalysisWorkflow();
    const fast = createFastParallelWorkflow();

    expect(standard.name).toBe("Standard 7-Agent Analysis");
    expect(standard.errorHandling).toBe("lenient");
    expect(standard.steps.length).toBeGreaterThanOrEqual(7);
    expect(fast.name).toBe("Fast Parallel Analysis");
    expect(fast.maxConcurrency).toBe(5);
    expect(fast.steps.some((step) => step.parallel)).toBe(true);
  });

  it("exposes every registered preset through getPresetWorkflow", () => {
    const presetNames = Object.keys(
      PRESET_WORKFLOWS,
    ) as (keyof typeof PRESET_WORKFLOWS)[];

    expect(presetNames).toEqual([
      "standard",
      "fast",
      "character",
      "creative",
      "advanced",
      "quick",
      "complete",
    ]);
    for (const name of presetNames) {
      const workflow = getPresetWorkflow(name);
      expect(workflow.id).toMatch(/^workflow-\d+$/);
      expect(workflow.steps.length).toBeGreaterThan(0);
    }
  });
});
