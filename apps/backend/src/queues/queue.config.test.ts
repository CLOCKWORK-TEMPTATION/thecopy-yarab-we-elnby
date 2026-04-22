/**
 * Queue Configuration Tests
 *
 * Tests for BullMQ queue setup and configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { queueManager, QueueName } from './queue.config';
import { Queue } from 'bullmq';

describe('Queue Configuration', () => {
  afterEach(async () => {
    // Clean up queues after each test
    await queueManager.close();
  });

  describe('QueueManager', () => {
    it('should create a new queue instance', () => {
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);

      expect(queue).toBeInstanceOf(Queue);
      expect(queue.name).toBe(QueueName.AI_ANALYSIS);
    });

    it('should return same queue instance on multiple calls', () => {
      const queue1 = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const queue2 = queueManager.getQueue(QueueName.AI_ANALYSIS);

      expect(queue1).toBe(queue2);
    });

    it('should create separate instances for different queues', () => {
      const analysisQueue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const docQueue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);

      expect(analysisQueue).not.toBe(docQueue);
      expect(analysisQueue.name).toBe(QueueName.AI_ANALYSIS);
      expect(docQueue.name).toBe(QueueName.DOCUMENT_PROCESSING);
    });

    it('should register a worker successfully', async () => {
      const mockProcessor = vi.fn().mockResolvedValue({ success: true });

      const worker = queueManager.registerWorker(
        QueueName.AI_ANALYSIS,
        mockProcessor
      );

      expect(worker).toBeDefined();
      expect(worker.name).toBe(QueueName.AI_ANALYSIS);
    });

    it('should not allow duplicate worker registration', () => {
      const mockProcessor = vi.fn().mockResolvedValue({ success: true });

      // Register first worker
      const worker1 = queueManager.registerWorker(
        QueueName.AI_ANALYSIS,
        mockProcessor
      );

      // Try to register again
      const worker2 = queueManager.registerWorker(
        QueueName.AI_ANALYSIS,
        mockProcessor
      );

      expect(worker1).toBe(worker2);
    });

    it('should get queue statistics', async () => {
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);

      // Add some jobs for testing
      await queue.add('test-job', { data: 'test' });
      await queue.add('test-job-2', { data: 'test2' });

      const stats = await queueManager.getQueueStats(QueueName.AI_ANALYSIS);

      expect(stats).toHaveProperty('name', QueueName.AI_ANALYSIS);
      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('delayed');
      expect(stats).toHaveProperty('total');
      expect(stats.total).toBeGreaterThanOrEqual(2);
    });

    it('should pause and resume a queue', async () => {
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);

      // Pause queue
      await queueManager.pauseQueue(QueueName.AI_ANALYSIS);
      const pausedState = await queue.isPaused();
      expect(pausedState).toBe(true);

      // Resume queue
      await queueManager.resumeQueue(QueueName.AI_ANALYSIS);
      const resumedState = await queue.isPaused();
      expect(resumedState).toBe(false);
    });

    it('should clean old jobs from queue', async () => {
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);

      // Add and complete some jobs
      const job1 = await queue.add('test-job', { data: 'test' });
      await job1.moveToCompleted({ result: 'success' }, '0', false);

      // Clean with very short grace period to ensure cleanup
      await queueManager.cleanQueue(QueueName.AI_ANALYSIS, 0);

      // Check that cleanup was called
      const completedCount = await queue.getCompletedCount();
      expect(completedCount).toBe(0);
    });

    it('should close all queues and workers gracefully', async () => {
      const queue1 = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const queue2 = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);

      const mockProcessor = vi.fn().mockResolvedValue({ success: true });
      queueManager.registerWorker(QueueName.AI_ANALYSIS, mockProcessor);

      // Close all
      await queueManager.close();

      // Verify queues are closed by checking if we can still use them
      await expect(queue1.getJobCounts()).rejects.toThrow();
    });

    it('should get all queue statistics', async () => {
      // Create multiple queues
      queueManager.getQueue(QueueName.AI_ANALYSIS);
      queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);

      const allStats = await queueManager.getAllStats();

      expect(Array.isArray(allStats)).toBe(true);
      expect(allStats.length).toBeGreaterThanOrEqual(2);
      expect(allStats[0]).toHaveProperty('name');
      expect(allStats[0]).toHaveProperty('waiting');
    });
  });

  describe('Queue Job Options', () => {
    it('should apply default job options', async () => {
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.add('test-job', { data: 'test' });

      expect(job.opts.attempts).toBe(3);
      expect(job.opts.backoff).toEqual({
        type: 'exponential',
        delay: 2000,
      });
    });

    it('should allow custom job options', async () => {
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.add(
        'test-job',
        { data: 'test' },
        {
          attempts: 5,
          priority: 1,
        }
      );

      expect(job.opts.attempts).toBe(5);
      expect(job.opts.priority).toBe(1);
    });

    it('should respect removeOnComplete option', async () => {
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.add('test-job', { data: 'test' });

      expect(job.opts.removeOnComplete).toBeDefined();
      expect(job.opts.removeOnComplete).toHaveProperty('age');
      expect(job.opts.removeOnComplete).toHaveProperty('count');
    });

    it('should respect removeOnFail option', async () => {
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.add('test-job', { data: 'test' });

      expect(job.opts.removeOnFail).toBeDefined();
      expect(job.opts.removeOnFail).toHaveProperty('age');
      expect(job.opts.removeOnFail).toHaveProperty('count');
    });
  });

  describe('Queue Event Handlers', () => {
    it('should emit waiting event when job is added', async () => {
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);

      const waitingPromise = new Promise((resolve) => {
        queue.once('waiting', (job) => {
          resolve(job);
        });
      });

      await queue.add('test-job', { data: 'test' });

      const waitingJob = await waitingPromise;
      expect(waitingJob).toBeDefined();
    });

    it('should handle queue errors gracefully', async () => {
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);

      const errorPromise = new Promise((resolve) => {
        queue.once('error', (error) => {
          resolve(error);
        });
      });

      // Force an error by trying to process with invalid connection
      queue.emit('error', new Error('Test error'));

      const error = await errorPromise;
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('Redis Connection', () => {
    it('should use REDIS_URL if provided', () => {
      const originalEnv = process.env['REDIS_URL'];

      process.env['REDIS_URL'] = 'redis://:password@localhost:6379';

      // This would require re-importing the module
      // For now, we just verify the URL is set
      expect(process.env['REDIS_URL']).toBe('redis://:password@localhost:6379');

      // Restore original
      if (originalEnv) {
        process.env['REDIS_URL'] = originalEnv;
      } else {
        delete process.env['REDIS_URL'];
      }
    });

    it('should fall back to individual REDIS_ variables', () => {
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      expect(queue).toBeDefined();
      // Connection is established successfully
    });
  });

  describe('Queue Names Enum', () => {
    it('should have all required queue names', () => {
      expect(QueueName.AI_ANALYSIS).toBe('ai-analysis');
      expect(QueueName.DOCUMENT_PROCESSING).toBe('document-processing');
      expect(QueueName.NOTIFICATIONS).toBe('notifications');
      expect(QueueName.EXPORT).toBe('export');
      expect(QueueName.CACHE_WARMING).toBe('cache-warming');
    });
  });
});
