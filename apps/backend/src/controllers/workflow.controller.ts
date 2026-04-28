/**
 * Workflow Controller
 * Handles workflow execution and management endpoints
 */

import { Request, Response } from "express";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { StandardAgentInput } from "@/services/agents/core/types";
import { workflowExecutor } from "@/services/agents/core/workflow-executor";
import {
  getPresetWorkflow,
  PRESET_WORKFLOWS,
  type PresetWorkflowName,
} from "@/services/agents/core/workflow-presets";
import {
  WorkflowStatus,
  type WorkflowConfig,
  type WorkflowEvent,
  type WorkflowMetrics,
} from "@/services/agents/core/workflow-types";

interface WorkflowProgressRecord {
  workflowId: string;
  name: string;
  status: WorkflowStatus;
  currentStep?: string;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  progress: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  metrics?: WorkflowMetrics;
  error?: string;
  estimatedTimeRemaining?: number;
}

const MAX_WORKFLOW_HISTORY = 100;
const activeWorkflows = new Map<string, WorkflowProgressRecord>();
const workflowHistory: WorkflowProgressRecord[] = [];

function calculateProgress(record: WorkflowProgressRecord): number {
  if (record.totalSteps === 0) {
    return record.status === WorkflowStatus.COMPLETED ? 100 : 0;
  }

  return Math.min(
    100,
    Math.round(
      ((record.completedSteps + record.failedSteps) / record.totalSteps) * 100,
    ),
  );
}

function calculateEstimatedTimeRemaining(
  record: WorkflowProgressRecord,
): number | undefined {
  const finishedSteps = record.completedSteps + record.failedSteps;
  const remainingSteps = record.totalSteps - finishedSteps;
  if (finishedSteps <= 0 || remainingSteps <= 0) {
    return undefined;
  }

  const elapsed = Date.now() - new Date(record.startedAt).getTime();
  return Math.round((elapsed / finishedSteps) * remainingSteps);
}

function startWorkflowProgress(config: WorkflowConfig): WorkflowProgressRecord {
  const now = new Date().toISOString();
  const record: WorkflowProgressRecord = {
    workflowId: config.id,
    name: config.name,
    status: WorkflowStatus.RUNNING,
    totalSteps: config.steps.length,
    completedSteps: 0,
    failedSteps: 0,
    progress: 0,
    startedAt: now,
    updatedAt: now,
  };
  activeWorkflows.set(config.id, record);
  return record;
}

function finalizeWorkflowProgress(
  workflowId: string,
  status: WorkflowStatus,
  metrics?: WorkflowMetrics,
  error?: string,
): void {
  const record = activeWorkflows.get(workflowId);
  if (!record) {
    return;
  }

  const now = new Date().toISOString();
  record.status = status;
  record.updatedAt = now;
  record.completedAt = now;
  if (metrics) {
    record.metrics = metrics;
  }
  if (error) {
    record.error = error;
  }
  record.progress =
    status === WorkflowStatus.COMPLETED ? 100 : calculateProgress(record);
  workflowHistory.unshift({ ...record });
  if (workflowHistory.length > MAX_WORKFLOW_HISTORY) {
    workflowHistory.pop();
  }
}

function extractEventError(event: WorkflowEvent): string | undefined {
  if (!event.data || typeof event.data !== "object") {
    return undefined;
  }

  const data = event.data as Record<string, unknown>;
  const error = data["error"];
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return undefined;
}

function updateWorkflowProgressFromEvent(event: WorkflowEvent): void {
  const record = activeWorkflows.get(event.workflowId);
  if (!record) {
    return;
  }

  record.updatedAt = event.timestamp.toISOString();

  if (event.type === "step-started") {
    if (typeof event.stepId === "string") {
      record.currentStep = event.stepId;
    }
    record.status = WorkflowStatus.RUNNING;
  } else if (event.type === "step-completed") {
    record.completedSteps += 1;
    if (typeof event.stepId === "string") {
      record.currentStep = event.stepId;
    }
  } else if (event.type === "step-failed") {
    record.failedSteps += 1;
    if (typeof event.stepId === "string") {
      record.currentStep = event.stepId;
    }
    const eventError = extractEventError(event);
    if (eventError) {
      record.error = eventError;
    }
  }

  record.progress = calculateProgress(record);
  const estimatedTimeRemaining = calculateEstimatedTimeRemaining(record);
  if (estimatedTimeRemaining === undefined) {
    delete record.estimatedTimeRemaining;
  } else {
    record.estimatedTimeRemaining = estimatedTimeRemaining;
  }
}

for (const eventType of [
  "step-started",
  "step-completed",
  "step-failed",
] as const) {
  workflowExecutor.on(eventType, updateWorkflowProgressFromEvent);
}

const workflowInputSchema = z
  .object({
    input: z.string().optional(),
    text: z.string().optional(),
    context: z.record(z.string(), z.unknown()).optional(),
    options: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const executeWorkflowBodySchema = z
  .object({
    preset: z.string().min(1),
    input: workflowInputSchema,
  })
  .passthrough();

const executeCustomWorkflowBodySchema = z
  .object({
    config: z
      .object({
        name: z.string().optional(),
      })
      .passthrough(),
    input: workflowInputSchema,
  })
  .passthrough();

/**
 * Execute a preset workflow
 */
export async function executeWorkflow(req: Request, res: Response) {
  try {
    const validation = executeWorkflowBodySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "يجب توفير نوع الورك فلو والمدخلات",
      });
    }
    const { preset, input } = validation.data;

    // Validate preset
    if (!(preset in PRESET_WORKFLOWS)) {
      return res.status(400).json({
        success: false,
        error: "نوع الورك فلو غير صحيح",
      });
    }

    logger.info(`[Workflow API] Executing preset workflow: ${preset}`);

    const agentInput: StandardAgentInput = {
      input: input.input ?? input.text ?? "",
      context: input.context ?? {},
      options: input.options ?? {},
    };

    const workflow = getPresetWorkflow(preset as PresetWorkflowName);
    startWorkflowProgress(workflow);
    const result = await workflowExecutor.execute(workflow, agentInput);
    finalizeWorkflowProgress(workflow.id, result.status, result.metrics);

    return res.json({
      success: true,
      data: {
        status: result.status,
        results: Object.fromEntries(result.results),
        metrics: result.metrics,
      },
    });
  } catch (error) {
    logger.error("[Workflow API] Execution failed:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "فشل تنفيذ الورك فلو",
    });
  }
}

/**
 * Execute a custom workflow
 */
export async function executeCustomWorkflow(req: Request, res: Response) {
  try {
    const validation = executeCustomWorkflowBodySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "يجب توفير تكوين الورك فلو والمدخلات",
      });
    }
    const { config: rawConfig, input } = validation.data;
    const config = rawConfig as unknown as WorkflowConfig;

    logger.info(`[Workflow API] Executing custom workflow: ${config.name}`);

    const agentInput: StandardAgentInput = {
      input: input.input ?? input.text ?? "",
      context: input.context ?? {},
      options: input.options ?? {},
    };

    startWorkflowProgress(config);
    const result = await workflowExecutor.execute(config, agentInput);
    finalizeWorkflowProgress(config.id, result.status, result.metrics);

    return res.json({
      success: true,
      data: {
        status: result.status,
        results: Object.fromEntries(result.results),
        metrics: result.metrics,
      },
    });
  } catch (error) {
    logger.error("[Workflow API] Custom workflow failed:", error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "فشل تنفيذ الورك فلو المخصص",
    });
  }
}

/**
 * Get available workflow presets
 */
export function getWorkflowPresets(_req: Request, res: Response) {
  try {
    const presets = Object.entries(PRESET_WORKFLOWS).map(([id, factory]) => {
      const workflow = factory();
      return {
        id,
        name: workflow.name,
        description: workflow.description ?? "",
        estimatedDuration: workflow.globalTimeout ?? 300000,
        agentCount: workflow.steps.length,
        maxConcurrency: workflow.maxConcurrency ?? 5,
        errorHandling: workflow.errorHandling ?? "lenient",
      };
    });

    return res.json({
      success: true,
      data: presets,
    });
  } catch (error) {
    logger.error("[Workflow API] Failed to get presets:", error);
    return res.status(500).json({
      success: false,
      error: "فشل جلب قوالب الورك فلو",
    });
  }
}

/**
 * Get workflow progress.
 */
export function getWorkflowProgress(req: Request, res: Response) {
  try {
    const workflowParam = req.params["workflowId"];
    const workflowId = Array.isArray(workflowParam)
      ? workflowParam[0]
      : workflowParam;

    if (!workflowId) {
      return res.status(400).json({
        success: false,
        error: "يجب توفير معرّف الورك فلو",
      });
    }

    const record =
      activeWorkflows.get(workflowId) ??
      workflowHistory.find((item) => item.workflowId === workflowId);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: "حالة الورك فلو غير موجودة",
      });
    }

    return res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    logger.error("[Workflow API] Failed to get progress:", error);
    return res.status(500).json({
      success: false,
      error: "فشل جلب حالة الورك فلو",
    });
  }
}

/**
 * Get workflow history.
 */
export function getWorkflowHistory(_req: Request, res: Response) {
  try {
    return res.json({
      success: true,
      data: workflowHistory,
    });
  } catch (error) {
    logger.error("[Workflow API] Failed to get history:", error);
    return res.status(500).json({
      success: false,
      error: "فشل جلب سجل الورك فلو",
    });
  }
}

/**
 * Get workflow details
 */
export function getWorkflowDetails(req: Request, res: Response) {
  try {
    const preset =
      typeof req.params["preset"] === "string" ? req.params["preset"] : "";

    if (!(preset in PRESET_WORKFLOWS)) {
      return res.status(404).json({
        success: false,
        error: "الورك فلو غير موجود",
      });
    }

    const workflow = getPresetWorkflow(preset as keyof typeof PRESET_WORKFLOWS);

    return res.json({
      success: true,
      data: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        steps: workflow.steps.map((step) => ({
          id: step.id,
          agentId: step.agentId,
          taskType: step.taskType,
          dependencies: step.dependencies,
          parallel: step.parallel,
          timeout: step.timeout,
        })),
        maxConcurrency: workflow.maxConcurrency,
        globalTimeout: workflow.globalTimeout,
        errorHandling: workflow.errorHandling,
      },
    });
  } catch (error) {
    logger.error("[Workflow API] Failed to get workflow details:", error);
    return res.status(500).json({
      success: false,
      error: "فشل جلب تفاصيل الورك فلو",
    });
  }
}

/**
 * Workflow Controller instance with bound methods for route registration
 */
export const workflowController = {
  /**
   * List all available workflow presets
   * GET /api/workflow/presets
   */
  listPresets: getWorkflowPresets,

  /**
   * Get a single workflow preset by id
   * GET /api/workflow/presets/:preset
   */
  getPreset: getWorkflowDetails,

  /**
   * Execute a preset workflow
   * POST /api/workflow/execute
   */
  execute: executeWorkflow,

  /**
   * Execute a custom workflow
   * POST /api/workflow/execute-custom
   */
  executeCustom: executeCustomWorkflow,

  /**
   * Get workflow progress by id
   * GET /api/workflow/progress/:workflowId
   */
  progress: getWorkflowProgress,

  /**
   * List recent workflow executions
   * GET /api/workflow/history
   */
  history: getWorkflowHistory,
};
