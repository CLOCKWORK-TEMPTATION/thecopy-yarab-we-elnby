/**
 * Queue Status Controller
 * 
 * Provides endpoints to check job status and queue statistics
 */

import { Request, Response } from 'express';

import { logger } from '@/lib/logger';
import { queueManager, QueueName } from '@/queues/queue.config';

export class QueueController {
  /**
   * Get status of a specific job
   * GET /api/queue/jobs/:jobId
   */
  /**
   * Validate queue name against whitelist
   */
  private isValidQueueName(queueName: string): queueName is QueueName {
    return Object.values(QueueName).includes(queueName as QueueName);
  }

  /**
   * Build the job status response payload from a job instance
   */
  private async buildJobPayload(job: Awaited<ReturnType<ReturnType<typeof queueManager.getQueue>['getJob']>>) {
    if (!job) return null;

    const state = await job.getState();
    return {
      id: job.id,
      name: job.name,
      state,
      progress: job.progress,
      result: state === 'completed' ? job.returnvalue : null,
      error: state === 'failed' ? job.failedReason : null,
      data: job.data,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      attemptsMade: job.attemptsMade,
    };
  }

  /**
   * Get status of a specific job
   * GET /api/queue/jobs/:jobId
   */
  async getJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const jobId = typeof req.params["jobId"] === 'string' ? req.params["jobId"] : '';

      if (!jobId) {
        res.status(400).json({ success: false, error: 'معرف المهمة مطلوب' });
        return;
      }

      const queueName = (req.query["queue"] as string) || QueueName.AI_ANALYSIS;

      if (!this.isValidQueueName(queueName)) {
        res.status(400).json({ success: false, error: 'اسم الطابور غير صالح' });
        return;
      }

      const queue = queueManager.getQueue(queueName);
      const job = await queue.getJob(jobId);

      if (!job) {
        res.status(404).json({ success: false, error: 'المهمة غير موجودة' });
        return;
      }

      const jobPayload = await this.buildJobPayload(job);
      res.json({ success: true, job: jobPayload });
    } catch (error) {
      logger.error('Failed to get job status:', error);
      res.status(500).json({ success: false, error: 'فشل في الحصول على حالة المهمة' });
    }
  }

  /**
   * Get statistics for all queues
   * GET /api/queue/stats
   */
  async getQueueStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await queueManager.getAllStats();

      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في الحصول على إحصائيات الطوابير',
      });
    }
  }

  /**
   * Get statistics for a specific queue
   * GET /api/queue/:queueName/stats
   */
  async getSpecificQueueStats(req: Request, res: Response): Promise<void> {
    try {
      const { queueName } = req.params;

      if (!Object.values(QueueName).includes(queueName as QueueName)) {
        res.status(400).json({
          success: false,
          error: 'اسم الطابور غير صالح',
        });
        return;
      }

      const stats = await queueManager.getQueueStats(queueName as QueueName);

      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في الحصول على إحصائيات الطابور',
      });
    }
  }

  /**
   * Retry a failed job
   * POST /api/queue/jobs/:jobId/retry
   */
  async retryJob(req: Request, res: Response): Promise<void> {
    try {
      const jobId = typeof req.params["jobId"] === 'string' ? req.params["jobId"] : '';

      if (!jobId) {
        res.status(400).json({
          success: false,
          error: 'معرف المهمة مطلوب',
        });
        return;
      }

      const queueName = (req.query["queue"] as string) || QueueName.AI_ANALYSIS;

      // Validate queue name against whitelist
      if (!this.isValidQueueName(queueName)) {
        res.status(400).json({
          success: false,
          error: 'اسم الطابور غير صالح',
        });
        return;
      }

      const queue = queueManager.getQueue(queueName);
      const job = await queue.getJob(jobId);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'المهمة غير موجودة',
        });
        return;
      }

      await job.retry();

      res.json({
        success: true,
        message: 'تم إعادة محاولة المهمة',
        jobId: job.id,
      });
    } catch (error) {
      logger.error('Failed to retry job:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في إعادة محاولة المهمة',
      });
    }
  }

  /**
   * Clean old completed/failed jobs
   * POST /api/queue/:queueName/clean
   */
  async cleanQueue(req: Request, res: Response): Promise<void> {
    try {
      const { queueName } = req.params;
      const grace = parseInt(req.query["grace"] as string) || 24 * 3600 * 1000; // Default 24 hours

      if (!Object.values(QueueName).includes(queueName as QueueName)) {
        res.status(400).json({
          success: false,
          error: 'اسم الطابور غير صالح',
        });
        return;
      }

      await queueManager.cleanQueue(queueName as QueueName, grace);

      res.json({
        success: true,
        message: 'تم تنظيف الطابور',
      });
    } catch (error) {
      logger.error('Failed to clean queue:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في تنظيف الطابور',
      });
    }
  }
}

export const queueController = new QueueController();
