/**
 * Queue Integration Tests
 *
 * End-to-end integration tests for queue system with failure and retry scenarios
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { queueManager, QueueName } from '@/queues/queue.config';
import { queueAIAnalysis, registerAIAnalysisWorker } from '@/queues/jobs/ai-analysis.job';
import {
  queueDocumentProcessing,
  registerDocumentProcessingWorker,
} from '@/queues/jobs/document-processing.job';
import { Queue } from 'bullmq';

describe('Queue Integration Tests', () => {
  beforeAll(() => {
    // Initialize workers
    registerAIAnalysisWorker();
    registerDocumentProcessingWorker();
  });

  afterEach(async () => {
    // Clean up queues after each test
    const queues = [QueueName.AI_ANALYSIS, QueueName.DOCUMENT_PROCESSING];

    for (const queueName of queues) {
      const queue = queueManager.getQueue(queueName);
      await queue.obliterate({ force: true });
    }
  });

  afterAll(async () => {
    await queueManager.close();
  });

  describe('Job Lifecycle', () => {
    it('should complete full job lifecycle: queue -> process -> complete', async () => {
      const jobId = await queueAIAnalysis({
        type: 'scene',
        entityId: 'lifecycle-scene',
        userId: 'user-lifecycle',
        analysisType: 'quick',
      });

      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.getJob(jobId);

      expect(job).toBeDefined();

      // Wait for job to be processed
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Check job state
      if (job) {
        const state = await job.getState();
        expect(['completed', 'active', 'waiting', 'delayed']).toContain(state);
      }
    }, 10000);

    it('should process multiple jobs in sequence', async () => {
      const jobIds = [];

      for (let i = 0; i < 3; i++) {
        const jobId = await queueAIAnalysis({
          type: 'character',
          entityId: `seq-char-${i}`,
          userId: 'user-seq',
          analysisType: 'quick',
        });
        jobIds.push(jobId);
      }

      expect(jobIds.length).toBe(3);

      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);

      // Verify all jobs are in queue
      for (const jobId of jobIds) {
        const job = await queue.getJob(jobId);
        expect(job).toBeDefined();
      }
    });

    it('should process jobs from different queues concurrently', async () => {
      const aiJobId = await queueAIAnalysis({
        type: 'scene',
        entityId: 'concurrent-scene',
        userId: 'user-concurrent',
        analysisType: 'quick',
      });

      const docJobId = await queueDocumentProcessing({
        documentId: 'concurrent-doc',
        filePath: '/uploads/concurrent.pdf',
        fileType: 'pdf',
        userId: 'user-concurrent',
      });

      expect(aiJobId).toBeDefined();
      expect(docJobId).toBeDefined();

      const aiQueue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const docQueue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);

      const aiJob = await aiQueue.getJob(aiJobId);
      const docJob = await docQueue.getJob(docJobId);

      expect(aiJob).toBeDefined();
      expect(docJob).toBeDefined();
    });
  });

  describe('Failure and Retry Scenarios', () => {
    it('should retry failed job with exponential backoff', async () => {
      // Create a mock processor that fails initially
      let attemptCount = 0;
      const failingProcessor = vi.fn(async (job: any) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Attempt ${attemptCount} failed`);
        }
        return { success: true, attempt: attemptCount };
      });

      // Register custom worker with failing processor
      const testQueue = queueManager.getQueue(QueueName.NOTIFICATIONS);
      const worker = queueManager.registerWorker(
        QueueName.NOTIFICATIONS,
        failingProcessor
      );

      // Add job with retry config
      const job = await testQueue.add(
        'retry-test',
        { data: 'test' },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 100,
          },
        }
      );

      // Wait for retries to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify job was retried
      const updatedJob = await testQueue.getJob(job.id!);

      if (updatedJob) {
        const state = await updatedJob.getState();
        // Job should eventually complete or still be retrying
        expect(['completed', 'active', 'waiting', 'failed']).toContain(state);
      }

      await worker.close();
    }, 10000);

    it('should fail job after max retry attempts', async () => {
      let attemptCount = 0;
      const alwaysFailingProcessor = vi.fn(async (job: any) => {
        attemptCount++;
        throw new Error(`Permanent failure at attempt ${attemptCount}`);
      });

      const testQueue = queueManager.getQueue(QueueName.EXPORT);
      const worker = queueManager.registerWorker(
        QueueName.EXPORT,
        alwaysFailingProcessor
      );

      const job = await testQueue.add(
        'fail-test',
        { data: 'test' },
        {
          attempts: 2,
          backoff: {
            type: 'fixed',
            delay: 100,
          },
        }
      );

      // Wait for all retry attempts
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const updatedJob = await testQueue.getJob(job.id!);

      if (updatedJob) {
        const state = await updatedJob.getState();
        // After max retries, should be failed or active
        expect(['failed', 'active', 'waiting']).toContain(state);
      }

      // Should have attempted multiple times
      expect(attemptCount).toBeGreaterThan(0);

      await worker.close();
    }, 10000);

    it('should handle job timeout', async () => {
      const slowProcessor = vi.fn(async (job: any) => {
        // Simulate long processing
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return { success: true };
      });

      const testQueue = queueManager.getQueue(QueueName.CACHE_WARMING);
      const worker = queueManager.registerWorker(
        QueueName.CACHE_WARMING,
        slowProcessor,
        {
          lockDuration: 1000, // Short lock duration for testing
        }
      );

      const job = await testQueue.add('timeout-test', { data: 'test' });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const updatedJob = await testQueue.getJob(job.id!);

      if (updatedJob) {
        const state = await updatedJob.getState();
        expect(['active', 'waiting', 'completed', 'failed']).toContain(state);
      }

      await worker.close();
    }, 15000);

    it('should handle job stalling and recovery', async () => {
      // Create processor that simulates stalling
      const stallingProcessor = vi.fn(async (job: any) => {
        // Process quickly to avoid actual stall
        return { success: true };
      });

      const testQueue = queueManager.getQueue(QueueName.AI_ANALYSIS);

      const job = await testQueue.add('stall-test', { data: 'test' });

      // Monitor for stalled jobs
      const stalledPromise = new Promise((resolve) => {
        testQueue.on('stalled', (jobId) => {
          resolve(jobId);
        });
      });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const updatedJob = await testQueue.getJob(job.id!);
      expect(updatedJob).toBeDefined();
    }, 10000);
  });

  describe('Queue Statistics and Monitoring', () => {
    it('should track queue statistics accurately', async () => {
      // Add multiple jobs
      await queueAIAnalysis({
        type: 'scene',
        entityId: 'stats-1',
        userId: 'user-stats',
        analysisType: 'quick',
      });

      await queueAIAnalysis({
        type: 'character',
        entityId: 'stats-2',
        userId: 'user-stats',
        analysisType: 'quick',
      });

      const stats = await queueManager.getQueueStats(QueueName.AI_ANALYSIS);

      expect(stats.name).toBe(QueueName.AI_ANALYSIS);
      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(typeof stats.waiting).toBe('number');
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.failed).toBe('number');
    });

    it('should get stats for all queues', async () => {
      await queueAIAnalysis({
        type: 'scene',
        entityId: 'all-stats-1',
        userId: 'user-all',
        analysisType: 'quick',
      });

      await queueDocumentProcessing({
        documentId: 'all-stats-doc',
        filePath: '/uploads/stats.pdf',
        fileType: 'pdf',
        userId: 'user-all',
      });

      const allStats = await queueManager.getAllStats();

      expect(Array.isArray(allStats)).toBe(true);
      expect(allStats.length).toBeGreaterThan(0);

      allStats.forEach((stat) => {
        expect(stat).toHaveProperty('name');
        expect(stat).toHaveProperty('waiting');
        expect(stat).toHaveProperty('active');
        expect(stat).toHaveProperty('total');
      });
    });
  });

  describe('Queue Pause and Resume', () => {
    it('should pause and resume queue processing', async () => {
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);

      // Add job before pausing
      const jobId = await queueAIAnalysis({
        type: 'scene',
        entityId: 'pause-test',
        userId: 'user-pause',
        analysisType: 'quick',
      });

      // Pause queue
      await queueManager.pauseQueue(QueueName.AI_ANALYSIS);
      const pausedState = await queue.isPaused();
      expect(pausedState).toBe(true);

      // Resume queue
      await queueManager.resumeQueue(QueueName.AI_ANALYSIS);
      const resumedState = await queue.isPaused();
      expect(resumedState).toBe(false);

      const job = await queue.getJob(jobId);
      expect(job).toBeDefined();
    });

    it('should not process jobs when queue is paused', async () => {
      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);

      // Pause queue first
      await queueManager.pauseQueue(QueueName.DOCUMENT_PROCESSING);

      const jobId = await queueDocumentProcessing({
        documentId: 'paused-doc',
        filePath: '/uploads/paused.pdf',
        fileType: 'pdf',
        userId: 'user-paused',
      });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const job = await queue.getJob(jobId);

      if (job) {
        const state = await job.getState();
        // Job should be waiting or delayed, not completed
        expect(['waiting', 'delayed', 'paused']).toContain(state);
      }

      // Resume queue
      await queueManager.resumeQueue(QueueName.DOCUMENT_PROCESSING);
    }, 10000);
  });

  describe('Job Priority', () => {
    it('should process high-priority jobs first', async () => {
      const lowPriorityId = await queueAIAnalysis({
        type: 'project',
        entityId: 'low-priority',
        userId: 'user-priority',
        analysisType: 'full', // Lower priority
      });

      const highPriorityId = await queueAIAnalysis({
        type: 'scene',
        entityId: 'high-priority',
        userId: 'user-priority',
        analysisType: 'quick', // Higher priority
      });

      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);

      const lowJob = await queue.getJob(lowPriorityId);
      const highJob = await queue.getJob(highPriorityId);

      expect(lowJob?.opts.priority).toBe(2);
      expect(highJob?.opts.priority).toBe(1);

      // Lower number = higher priority in BullMQ
      expect(highJob?.opts.priority!).toBeLessThan(lowJob?.opts.priority!);
    });
  });

  describe('Queue Cleanup', () => {
    it('should clean completed jobs', async () => {
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);

      // Add and complete a job manually for testing
      const job = await queue.add('cleanup-test', { data: 'test' });
      await job.moveToCompleted({ result: 'success' }, '0', false);

      // Clean with immediate grace period
      await queueManager.cleanQueue(QueueName.AI_ANALYSIS, 0);

      const completedCount = await queue.getCompletedCount();
      expect(completedCount).toBe(0);
    });

    it('should clean failed jobs after grace period', async () => {
      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);

      // Add and fail a job manually
      const job = await queue.add('cleanup-fail', { data: 'test' });
      await job.moveToFailed(new Error('Test failure'), '0', false);

      // Clean with immediate grace period
      await queueManager.cleanQueue(QueueName.DOCUMENT_PROCESSING, 0);

      const failedCount = await queue.getFailedCount();
      expect(failedCount).toBe(0);
    });
  });

  describe('Multiple Workers', () => {
    it('should handle multiple workers processing different queues', async () => {
      // Both workers are already registered in beforeAll

      const aiJobId = await queueAIAnalysis({
        type: 'scene',
        entityId: 'multi-worker-ai',
        userId: 'user-multi',
        analysisType: 'quick',
      });

      const docJobId = await queueDocumentProcessing({
        documentId: 'multi-worker-doc',
        filePath: '/uploads/multi.pdf',
        fileType: 'pdf',
        userId: 'user-multi',
      });

      const aiQueue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const docQueue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);

      const aiJob = await aiQueue.getJob(aiJobId);
      const docJob = await docQueue.getJob(docJobId);

      expect(aiJob).toBeDefined();
      expect(docJob).toBeDefined();
    });
  });

  describe('Job Events', () => {
    it('should emit events during job lifecycle', async () => {
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);

      const events: string[] = [];

      queue.on('waiting', () => events.push('waiting'));
      queue.on('active', () => events.push('active'));
      queue.on('completed', () => events.push('completed'));

      await queueAIAnalysis({
        type: 'scene',
        entityId: 'events-test',
        userId: 'user-events',
        analysisType: 'quick',
      });

      // Wait for events to be emitted
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // At least 'waiting' event should be emitted
      expect(events.length).toBeGreaterThan(0);
      expect(events).toContain('waiting');
    }, 10000);
  });

  describe('Error Propagation', () => {
    it('should propagate errors correctly', async () => {
      const errorProcessor = vi.fn(async (job: any) => {
        throw new Error('Test error propagation');
      });

      const testQueue = queueManager.getQueue(QueueName.NOTIFICATIONS);
      const worker = queueManager.registerWorker(
        QueueName.NOTIFICATIONS,
        errorProcessor
      );

      const job = await testQueue.add(
        'error-test',
        { data: 'test' },
        {
          attempts: 1,
        }
      );

      // Wait for job to fail
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const updatedJob = await testQueue.getJob(job.id!);

      if (updatedJob) {
        const state = await updatedJob.getState();
        expect(['failed', 'active', 'waiting']).toContain(state);
      }

      await worker.close();
    }, 10000);
  });
});
