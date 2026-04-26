/**
 * Critique Controller
 * وحدة تحكم النقد الذاتي المحسن
 * 
 * Handles endpoints for enhanced self-critique functionality
 */

import { Request, Response } from 'express';
import { z } from 'zod';

import { logger } from '@/lib/logger';
import { getCritiqueConfiguration, getAllCritiqueConfigurations } from '@/services/agents/shared/critiqueConfigurations';
import { enhancedSelfCritiqueModule } from '@/services/agents/shared/enhancedSelfCritique';
import { TaskType } from '@core/types';

import type { EnhancedCritiqueResult, CritiqueRequest, CritiqueContext, CritiqueConfiguration } from '@/services/agents/shared/critiqueTypes';

const critiqueSummaryBodySchema = z.object({
  output: z.string().min(1),
  task: z.string().min(1),
  context: z.object({
    taskType: z.nativeEnum(TaskType),
    agentName: z.string().min(1).optional(),
    originalText: z.string().min(1),
    additionalContext: z.record(z.string(), z.unknown()).optional(),
  }).passthrough(),
  customConfig: z.custom<Partial<CritiqueConfiguration>>().optional(),
}).passthrough();

export class CritiqueController {
  /**
   * Get all critique configurations
   * الحصول على جميع تكوينات النقد
   */
  async getAllCritiqueConfigs(_req: Request, res: Response): Promise<void> {
    try {
      const configurations = getAllCritiqueConfigurations();
      
      res.json({
        success: true,
        data: configurations,
        count: configurations.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('[CritiqueController] Error getting all configurations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve critique configurations',
        code: 'CONFIGS_RETRIEVAL_ERROR'
      });
    }
  }

  /**
   * Get critique configuration for specific task type
   * الحصول على تكوين النقد لنوع المهمة المحدد
   */
  async getCritiqueConfig(req: Request, res: Response): Promise<void> {
    try {
      const { taskType } = req.params;
      
      if (!taskType || !Object.values(TaskType).includes(taskType as TaskType)) {
        res.status(400).json({
          success: false,
          error: 'Invalid task type',
          code: 'INVALID_TASK_TYPE'
        });
        return;
      }

      const configuration = getCritiqueConfiguration(taskType as TaskType);
      
      if (!configuration) {
        res.status(404).json({
          success: false,
          error: `No critique configuration found for task type: ${taskType}`,
          code: 'CONFIG_NOT_FOUND'
        });
        return;
      }

      res.json({
        success: true,
        data: configuration,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('[CritiqueController] Error getting config', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve critique configuration',
        code: 'CONFIG_RETRIEVAL_ERROR'
      });
    }
  }

  /**
   * Get dimension details for specific task type
   * الحصول على تفاصيل الأبعاد لنوع المهمة المحدد
   */
  async getDimensionDetails(req: Request, res: Response): Promise<void> {
    try {
      const { taskType } = req.params;
      
      if (!taskType || !Object.values(TaskType).includes(taskType as TaskType)) {
        res.status(400).json({
          success: false,
          error: 'Invalid task type',
          code: 'INVALID_TASK_TYPE'
        });
        return;
      }

      const configuration = getCritiqueConfiguration(taskType as TaskType);
      
      if (!configuration) {
        res.status(404).json({
          success: false,
          error: `No critique configuration found for task type: ${taskType}`,
          code: 'CONFIG_NOT_FOUND'
        });
        return;
      }

      const dimensionDetails = {
        dimensions: configuration.dimensions,
        thresholds: configuration.thresholds,
        maxIterations: configuration.maxIterations,
        enableAutoCorrection: configuration.enableAutoCorrection
      };

      res.json({
        success: true,
        data: dimensionDetails,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('[CritiqueController] Error getting dimension details', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dimension details',
        code: 'DIMENSIONS_RETRIEVAL_ERROR'
      });
    }
  }

  /**
   * Get critique summary for output
   * الحصول على ملخص نقد للمخرجات
   */
  async getCritiqueSummary(req: Request, res: Response): Promise<void> {
    try {
      const validation = critiqueSummaryBodySchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, error: 'Invalid critique request body', code: 'INVALID_CRITIQUE_BODY' });
        return;
      }
      const { output, task, context, customConfig } = validation.data;

      const critiqueContext: CritiqueContext = {
        taskType: context.taskType,
        agentName: context.agentName ?? String(context.taskType),
        originalText: context.originalText,
        ...(context.additionalContext ? { additionalContext: context.additionalContext } : {}),
      };
      const critiqueRequest: CritiqueRequest = {
        output,
        task,
        context: critiqueContext,
        ...(customConfig ? { customConfig } : {}),
      };

      logger.info('[CritiqueController] Starting enhanced critique', {
        taskType: context.taskType, outputLength: output.length, taskLength: task.length
      });

      const result: EnhancedCritiqueResult = await enhancedSelfCritiqueModule.applyEnhancedCritique(critiqueRequest);

      logger.info('[CritiqueController] Enhanced critique completed', {
        taskType: context.taskType, overallScore: result.overallScore,
        overallLevel: result.overallLevel, improved: result.improved, iterations: result.iterations
      });

      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error('[CritiqueController] Error applying critique:', error);

      if (error instanceof Error && error.message.includes('No critique configuration found')) {
        res.status(404).json({ success: false, error: error.message, code: 'CONFIG_NOT_FOUND' });
        return;
      }

      res.status(500).json({ success: false, error: 'Failed to apply critique', code: 'CRITIQUE_APPLICATION_ERROR' });
    }
  }
}

// Export singleton instance
export const critiqueController = new CritiqueController();
