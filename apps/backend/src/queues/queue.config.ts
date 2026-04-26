/**
 * BullMQ Queue Configuration
 *
 * Background job processing for long-running tasks
 */

import { Queue, Worker, QueueOptions, WorkerOptions, ConnectionOptions, Job } from 'bullmq';

import { logger } from '@/lib/logger';

const isProduction = process.env['NODE_ENV'] === 'production';

// Redis connection configuration for BullMQ
// Supports both REDIS_URL and individual REDIS_HOST/PORT/PASSWORD
function getRedisConnection(): ConnectionOptions {
  const baseConfig: ConnectionOptions = {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    retryStrategy(times: number) {
      // Limit retries to prevent spam
      if (times > 5) {
        logger.warn('[Redis] Max retries reached, disabling Redis');
        return null;
      }
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  };

  // If REDIS_URL is provided, parse it and merge with base config
  if (process.env['REDIS_URL']) {
    return {
      ...baseConfig,
      url: process.env['REDIS_URL'],
    };
  }

  // Otherwise use individual variables
  return {
    ...baseConfig,
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379'),
    password: process.env['REDIS_PASSWORD'] || undefined,
  };
}

const redisConnection: ConnectionOptions = getRedisConnection();

// Queue names
export enum QueueName {
  AI_ANALYSIS = 'ai-analysis',
  DOCUMENT_PROCESSING = 'document-processing',
  NOTIFICATIONS = 'notifications',
  EXPORT = 'export',
  CACHE_WARMING = 'cache-warming',
}

// Default queue options
const defaultQueueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      count: 5000,
    },
  },
};

// Default worker options
const defaultWorkerOptions: Omit<WorkerOptions, 'connection'> = {
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000,
  },
  autorun: true,
};

/**
 * Queue manager singleton
 */
class QueueManager {
  public queues = new Map<QueueName, Queue>();
  public workers = new Map<QueueName, Worker>();

  /**
   * Get or create a queue
   */
  getQueue(name: QueueName, options?: Partial<QueueOptions>): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        ...defaultQueueOptions,
        ...options,
      });

      // Queue event handlers - use logger instead of console
      queue.on('error', (error: Error) => {
        logger.error('Queue error', { queue: name, error: error.message });
      });

      // Only log detailed queue events in development
      if (!isProduction) {
        queue.on('waiting', (job: Job) => {
          logger.debug('Job waiting', { queue: name, jobId: String(job.id) });
        });
      }

      this.queues.set(name, queue);
    }

    return this.queues.get(name)!;
  }

  /**
   * Register a worker for a queue
   */
  registerWorker(
    name: QueueName,
    processor: (job: Job) => Promise<unknown>,
    options?: Partial<WorkerOptions>
  ): Worker {
    if (this.workers.has(name)) {
      logger.warn('Worker already registered', { queue: name });
      return this.workers.get(name)!;
    }

    const worker = new Worker(name, processor, {
      connection: redisConnection,
      ...defaultWorkerOptions,
      ...options,
    });

    // Worker event handlers - use logger instead of console
    if (!isProduction) {
      worker.on('completed', (job: { id?: string | number }) => {
        logger.debug('Worker job completed', { queue: name, jobId: String(job.id) });
      });
    }

    worker.on('failed', (job: { id?: string | number } | undefined, error: Error) => {
      logger.error('Worker job failed', { queue: name, jobId: String(job?.id), error: error.message });
    });

    worker.on('error', (error: Error) => {
      logger.error('Worker error', { queue: name, error: error.message });
    });

    worker.on('stalled', (jobId: string | number) => {
      logger.warn('Worker job stalled', { queue: name, jobId: String(jobId) });
    });

    this.workers.set(name, worker);
    return worker;
  }

  /**
   * Close all queues and workers
   */
  async close(): Promise<void> {
    logger.info('QueueManager closing all queues and workers');

    // Close all workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      logger.info('Worker closed', { queue: name });
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.info('Queue closed', { queue: name });
    }

    this.workers.clear();
    this.queues.clear();
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(name: QueueName) {
    const queue = this.getQueue(name);

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      name,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Get all queue statistics
   */
  async getAllStats() {
    const stats = await Promise.all(
      Array.from(this.queues.keys()).map((name) => this.getQueueStats(name))
    );
    return stats;
  }

  /**
   * Pause a queue
   */
  async pauseQueue(name: QueueName): Promise<void> {
    const queue = this.getQueue(name);
    await queue.pause();
    logger.info('Queue paused', { queue: name });
  }

  /**
   * Resume a queue
   */
  async resumeQueue(name: QueueName): Promise<void> {
    const queue = this.getQueue(name);
    await queue.resume();
    logger.info('Queue resumed', { queue: name });
  }

  /**
   * Clean old jobs
   */
  async cleanQueue(name: QueueName, grace: number = 24 * 3600 * 1000): Promise<void> {
    const queue = this.getQueue(name);
    await queue.clean(grace, 1000, 'completed');
    await queue.clean(grace * 7, 1000, 'failed');
    logger.info('Queue cleaned', { queue: name });
  }
}

// Export singleton instance
export const queueManager = new QueueManager();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing queues');
  await queueManager.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing queues');
  await queueManager.close();
  process.exit(0);
});

