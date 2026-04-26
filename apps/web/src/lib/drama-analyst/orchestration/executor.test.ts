import { beforeEach, describe, expect, it, vi } from "vitest";

import { geminiService } from "@/ai/gemini-service";
import { cachedGeminiCall } from "@/lib/redis";
import { AnalysisType } from "@/types/enums";

import {
  PipelineOrchestrator,
  submitTask,
  type PipelineStep,
} from "./executor";

vi.mock("@/ai/gemini-service", () => ({
  geminiService: {
    generateText: vi.fn(),
  },
}));

vi.mock("@/lib/ai/utils/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/redis", () => ({
  cachedGeminiCall: vi.fn(),
  generateGeminiCacheKey: vi.fn(() => "cache-key"),
}));

const makeStep = (id: string, dependencies: string[] = []): PipelineStep => ({
  id,
  name: id,
  description: `Step ${id}`,
  type: AnalysisType.QUICK,
  config: {} as PipelineStep["config"],
  dependencies,
});

interface SubmitTaskResult<TData> {
  success: boolean;
  taskId: string;
  status: "submitted";
  data: TData;
}

describe("Executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockedGeminiService = vi.mocked(geminiService);
    vi.mocked(cachedGeminiCall).mockImplementation(async (_key, factory) =>
      factory()
    );
    mockedGeminiService.generateText.mockReset();
  });

  it("validate-pipeline: executes pipeline steps and stores results", async () => {
    const mockedGeminiService = vi.mocked(geminiService);
    mockedGeminiService.generateText
      .mockResolvedValueOnce("first result")
      .mockResolvedValueOnce("second result");

    const orchestrator = new PipelineOrchestrator();
    const execution = await orchestrator.executePipeline(
      "pipeline-1",
      [makeStep("step-1"), makeStep("step-2", ["step-1"])],
      { content: "script" }
    );

    expect(execution.status).toBe("completed");
    expect(execution.progress).toBe(100);
    expect(execution.results.get("step-1")?.success).toBe(true);
    expect(execution.results.get("step-1")?.data).toBe("first result");
    expect(execution.results.get("step-2")?.success).toBe(true);
    expect(mockedGeminiService.generateText.mock.calls).toHaveLength(2);
  });

  it("validate-pipeline: records step failure without losing execution state", async () => {
    const mockedGeminiService = vi.mocked(geminiService);
    mockedGeminiService.generateText.mockRejectedValueOnce(
      new Error("Model unavailable")
    );

    const orchestrator = new PipelineOrchestrator();
    const execution = await orchestrator.executePipeline(
      "pipeline-error",
      [makeStep("step-1")],
      { content: "script" }
    );

    const result = execution.results.get("step-1");

    expect(execution.status).toBe("completed");
    expect(result?.success).toBe(false);
    expect(result?.error).toBe("Model unavailable");
    expect(result?.cached).toBe(false);
  });

  it("validate-pipeline: exposes execution status by id", async () => {
    const mockedGeminiService = vi.mocked(geminiService);
    mockedGeminiService.generateText.mockResolvedValueOnce("result");

    const orchestrator = new PipelineOrchestrator();
    const execution = await orchestrator.executePipeline(
      "pipeline-visible",
      [makeStep("step-1")],
      { content: "script" }
    );

    expect(orchestrator.getExecution("pipeline-visible")).toBe(execution);
    expect(orchestrator.getExecution("missing")).toBeUndefined();
  });

  it("validate-pipeline: rejects cancelling an already completed execution", async () => {
    const mockedGeminiService = vi.mocked(geminiService);
    mockedGeminiService.generateText.mockResolvedValueOnce("result");

    const orchestrator = new PipelineOrchestrator();
    await orchestrator.executePipeline(
      "pipeline-completed",
      [makeStep("step-1")],
      { content: "script" }
    );

    expect(orchestrator.cancelExecution("pipeline-completed")).toBe(false);
  });

  it("validate-pipeline: submitTask returns a submitted task envelope", async () => {
    const taskRequest = {
      agent: "analysis",
      files: [{ name: "test.txt", content: "content" }],
    };

    const result = (await submitTask(taskRequest)) as SubmitTaskResult<
      typeof taskRequest
    >;

    expect(result.success).toBe(true);
    expect(result.status).toBe("submitted");
    expect(result.taskId).toMatch(/^task_/);
    expect(result.data).toBe(taskRequest);
  });
});
