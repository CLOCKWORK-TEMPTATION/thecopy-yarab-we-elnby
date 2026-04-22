/**
 * Cache Warming Background Job
 *
 * Proactively warms the cache for frequently accessed entities
 * to improve performance and reduce API calls
 */

import { Job } from 'bullmq';
import { queueManager, QueueName } from '@/queues/queue.config';
import { warmGeminiCache } from '@/services/gemini-cache.strategy';
import { logger } from '@/utils/logger';

// Job data types
export interface CacheWarmingJobData {
  entities: Array<{
    type: 'scene' | 'character' | 'shot' | 'project';
    id: string;
    analysisType: string;
  }>;
  priority?: number;
}

export interface CacheWarmingResult {
  warmedCount: number;
  skippedCount: number;
  failedCount: number;
  processingTime: number;
}

/**
 * Process cache warming job
 */
async function processCacheWarming(job: Job<CacheWarmingJobData>): Promise<CacheWarmingResult> {
  const startTime = Date.now();
  const { entities } = job.data;

  // Ensure entities.length is a number to avoid injection if data is malformed
  const count = Number(entities.length) || 0;
  logger.info(`[CacheWarming] Starting cache warming for ${count} entities`);

  await job.updateProgress(0);

  let warmedCount = 0;
  const skippedCount = 0;
  const failedCount = 0;

  try {
    // Use the warmGeminiCache utility
    await warmGeminiCache(entities, async (entity) => {
      // Import Gemini service dynamically
      const { GeminiService } = await import('@/services/gemini.service');
      const gemini = new GeminiService();

      // Fetch entity data (this should be replaced with actual DB queries)
      const text = `${entity.type} ${entity.id}`;

      // Analyze using Gemini
      const result = await gemini.analyzeText(text, entity.analysisType);

      warmedCount++;

      // Update progress
      const progress = Math.floor((warmedCount / entities.length) * 100);
      await job.updateProgress(progress);

      return result;
    });

    const processingTime = Date.now() - startTime;

    logger.info(
      `[CacheWarming] Completed: ${warmedCount} warmed, ${skippedCount} skipped, ${failedCount} failed in ${processingTime}ms`
    );

    await job.updateProgress(100);

    return {
      warmedCount,
      skippedCount,
      failedCount,
      processingTime,
    };
  } catch (error) {
    logger.error('[CacheWarming] Error processing cache warming:', error);
    throw error;
  }
}

/**
 * Queue cache warming job
 */
export async function queueCacheWarming(data: CacheWarmingJobData): Promise<string> {
  const queue = queueManager.getQueue(QueueName.CACHE_WARMING);

  const job = await queue.add('cache-warming', data, {
    priority: data.priority || 5,
    attempts: 2, // Only retry once
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });

  // Sanitize job ID
  const safeJobId = job.id ? String(job.id).replace(/[\r\n]/g, '') : 'unknown';
  logger.info(`[CacheWarming] Job ${safeJobId} queued for ${data.entities.length} entities`);

  return job.id!;
}

/**
 * Register cache warming worker
 */
export function registerCacheWarmingWorker(): void {
  queueManager.registerWorker(QueueName.CACHE_WARMING, processCacheWarming, {
    concurrency: 1, // Process one warming job at a time
    limiter: {
      max: 1,
      duration: 5000, // Max 1 job per 5 seconds to avoid API rate limits
    },
  });

  logger.info('[CacheWarming] Worker registered');
}

export const cacheWarmingJob = {
  queueCacheWarming,
  registerCacheWarmingWorker,
};
