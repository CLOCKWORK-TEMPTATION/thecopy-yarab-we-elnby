/**
 * Workflow Controller
 * Handles workflow execution and management endpoints
 */

import { Request, Response } from 'express';
import { multiAgentOrchestrator } from '@/services/agents/orchestrator';
import { getPresetWorkflow, PRESET_WORKFLOWS, type PresetWorkflowName } from '@/services/agents/core/workflow-presets';
import { logger } from '@/utils/logger';
import { StandardAgentInput } from '@/services/agents/core/types';
import type { WorkflowConfig } from '@/services/agents/core/workflow-types';
import { z } from 'zod';

const workflowInputSchema = z.object({
  input: z.string().optional(),
  text: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const executeWorkflowBodySchema = z.object({
  preset: z.string().min(1),
  input: workflowInputSchema,
}).passthrough();

const executeCustomWorkflowBodySchema = z.object({
  config: z.object({
    name: z.string().optional(),
  }).passthrough(),
  input: workflowInputSchema,
}).passthrough();

/**
 * Execute a preset workflow
 */
export async function executeWorkflow(req: Request, res: Response) {
  try {
    const validation = executeWorkflowBodySchema.safeParse(req.body);
    if (!validation.success) {
      return res["status"](400).json({
        success: false,
        error: 'يجب توفير نوع الورك فلو والمدخلات',
      });
    }
    const { preset, input } = validation.data;

    // Validate preset
    if (!(preset in PRESET_WORKFLOWS)) {
      return res["status"](400).json({
        success: false,
        error: 'نوع الورك فلو غير صحيح',
      });
    }

    logger.info(`[Workflow API] Executing preset workflow: ${preset}`);

    const agentInput: StandardAgentInput = {
      input: input.input || input.text || '',
      context: input["context"] || {},
      options: input.options || {},
    };

    const result = await multiAgentOrchestrator.executeWorkflow(preset as PresetWorkflowName, agentInput);

    return res.json({
      success: true,
      data: {
        status: result["status"],
        results: Object.fromEntries(result.results),
        metrics: result.metrics,
      },
    });
  } catch (error) {
    logger.error('[Workflow API] Execution failed:', error);
    return res["status"](500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل تنفيذ الورك فلو',
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
      return res["status"](400).json({
        success: false,
        error: 'يجب توفير تكوين الورك فلو والمدخلات',
      });
    }
    const { config: rawConfig, input } = validation.data;
    const config = rawConfig as WorkflowConfig;

    logger.info(`[Workflow API] Executing custom workflow: ${config.name}`);

    const agentInput: StandardAgentInput = {
      input: input.input || input.text || '',
      context: input["context"] || {},
      options: input.options || {},
    };

    const result = await multiAgentOrchestrator.executeCustomWorkflow(config, agentInput);

    return res.json({
      success: true,
      data: {
        status: result["status"],
        results: Object.fromEntries(result.results),
        metrics: result.metrics,
      },
    });
  } catch (error) {
    logger.error('[Workflow API] Custom workflow failed:', error);
    return res["status"](500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل تنفيذ الورك فلو المخصص',
    });
  }
}

/**
 * Get available workflow presets
 */
export async function getWorkflowPresets(_req: Request, res: Response) {
  try {
    const presets = Object.entries(PRESET_WORKFLOWS).map(([id, factory]) => {
      const workflow = factory();
      return {
        id,
        name: workflow.name,
        description: workflow.description || '',
        estimatedDuration: workflow.globalTimeout || 300000,
        agentCount: workflow.steps.length,
        maxConcurrency: workflow.maxConcurrency || 5,
        errorHandling: workflow.errorHandling || 'lenient',
      };
    });

    return res.json({
      success: true,
      data: presets,
    });
  } catch (error) {
    logger.error('[Workflow API] Failed to get presets:', error);
    return res["status"](500).json({
      success: false,
      error: 'فشل جلب قوالب الورك فلو',
    });
  }
}

/**
 * Get workflow progress (placeholder for future implementation)
 */
export async function getWorkflowProgress(req: Request, res: Response) {
  try {
    const { workflowId } = req.params;

    // TODO: Implement real-time progress tracking
    // For now, return mock data
    return res.json({
      success: true,
      data: {
        workflowId,
        status: 'running',
        currentStep: 'step-3',
        totalSteps: 7,
        completedSteps: 3,
        failedSteps: 0,
        progress: 43,
        estimatedTimeRemaining: 120000,
      },
    });
  } catch (error) {
    logger.error('[Workflow API] Failed to get progress:', error);
    return res["status"](500).json({
      success: false,
      error: 'فشل جلب حالة الورك فلو',
    });
  }
}

/**
 * Get workflow history (placeholder for future implementation)
 */
export async function getWorkflowHistory(res: Response) {
  try {
    // TODO: Implement workflow history tracking in database
    // For now, return empty array
    return res.json({
      success: true,
      data: [],
    });
  } catch (error) {
    logger.error('[Workflow API] Failed to get history:', error);
    return res["status"](500).json({
      success: false,
      error: 'فشل جلب سجل الورك فلو',
    });
  }
}

/**
 * Get workflow details
 */
export async function getWorkflowDetails(req: Request, res: Response) {
  try {
    const preset = typeof req.params["preset"] === 'string' ? req.params["preset"] : '';

    if (!(preset in PRESET_WORKFLOWS)) {
      return res["status"](404).json({
        success: false,
        error: 'الورك فلو غير موجود',
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
    logger.error('[Workflow API] Failed to get workflow details:', error);
    return res["status"](500).json({
      success: false,
      error: 'فشل جلب تفاصيل الورك فلو',
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
};
