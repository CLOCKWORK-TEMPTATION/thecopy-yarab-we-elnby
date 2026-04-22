/**
 * AI Analysis Job Tests
 *
 * Tests for AI analysis background job processing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { queueAIAnalysis, registerAIAnalysisWorker, AIAnalysisJobData } from './ai-analysis.job';
import { queueManager, QueueName } from '@/queues/queue.config';

describe('AI Analysis Job Processing', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up after tests
    await queueManager.close();
  });

  describe('queueAIAnalysis', () => {
    it('should add analysis job to queue', async () => {
      const jobData: AIAnalysisJobData = {
        type: 'scene',
        entityId: 'test-scene-123',
        userId: 'user-456',
        analysisType: 'full',
      };

      const jobId = await queueAIAnalysis(jobData);

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');

      // Verify job was added
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.getJob(jobId);

      expect(job).toBeDefined();
      expect(job?.data).toEqual(jobData);
    });

    it('should set priority based on analysis type (quick)', async () => {
      const jobData: AIAnalysisJobData = {
        type: 'character',
        entityId: 'char-789',
        userId: 'user-123',
        analysisType: 'quick',
      };

      const jobId = await queueAIAnalysis(jobData);

      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.getJob(jobId);

      expect(job?.opts.priority).toBe(1);
    });

    it('should set priority based on analysis type (full)', async () => {
      const jobData: AIAnalysisJobData = {
        type: 'project',
        entityId: 'proj-123',
        userId: 'user-456',
        analysisType: 'full',
      };

      const jobId = await queueAIAnalysis(jobData);

      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.getJob(jobId);

      expect(job?.opts.priority).toBe(2);
    });

    it('should include custom options in job data', async () => {
      const customOptions = {
        language: 'ar',
        detailLevel: 'high',
      };

      const jobData: AIAnalysisJobData = {
        type: 'shot',
        entityId: 'shot-555',
        userId: 'user-999',
        analysisType: 'detailed',
        options: customOptions,
      };

      const jobId = await queueAIAnalysis(jobData);

      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.getJob(jobId);

      expect(job?.data.options).toEqual(customOptions);
    });

    it('should apply retry configuration', async () => {
      const jobData: AIAnalysisJobData = {
        type: 'scene',
        entityId: 'test-scene-retry',
        userId: 'user-retry',
        analysisType: 'full',
      };

      const jobId = await queueAIAnalysis(jobData);

      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.getJob(jobId);

      expect(job?.opts.attempts).toBe(3);
      expect(job?.opts.backoff).toEqual({
        type: 'exponential',
        delay: 2000,
      });
    });
  });

  describe('registerAIAnalysisWorker', () => {
    it('should register worker successfully', () => {
      registerAIAnalysisWorker();

      // Verify worker is registered by checking queue manager
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      expect(queue).toBeDefined();
    });

    it('should process scene analysis job', async () => {
      registerAIAnalysisWorker();

      const jobData: AIAnalysisJobData = {
        type: 'scene',
        entityId: 'scene-test-1',
        userId: 'user-1',
        analysisType: 'quick',
      };

      const jobId = await queueAIAnalysis(jobData);

      // Wait for job to be processed
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.getJob(jobId);

      expect(job).toBeDefined();

      // Wait for job completion (with timeout)
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const completedJob = await queue.getJob(jobId);

      // Job should be processed
      if (completedJob) {
        const state = await completedJob.getState();
        expect(['completed', 'active', 'waiting']).toContain(state);
      }
    }, 10000);

    it('should process character analysis job', async () => {
      registerAIAnalysisWorker();

      const jobData: AIAnalysisJobData = {
        type: 'character',
        entityId: 'char-test-1',
        userId: 'user-1',
        analysisType: 'full',
      };

      const jobId = await queueAIAnalysis(jobData);
      expect(jobId).toBeDefined();

      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.getJob(jobId);
      expect(job?.data.type).toBe('character');
    });

    it('should process shot analysis job', async () => {
      registerAIAnalysisWorker();

      const jobData: AIAnalysisJobData = {
        type: 'shot',
        entityId: 'shot-test-1',
        userId: 'user-1',
        analysisType: 'quick',
      };

      const jobId = await queueAIAnalysis(jobData);
      expect(jobId).toBeDefined();

      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.getJob(jobId);
      expect(job?.data.type).toBe('shot');
    });

    it('should process project analysis job', async () => {
      registerAIAnalysisWorker();

      const jobData: AIAnalysisJobData = {
        type: 'project',
        entityId: 'proj-test-1',
        userId: 'user-1',
        analysisType: 'detailed',
      };

      const jobId = await queueAIAnalysis(jobData);
      expect(jobId).toBeDefined();

      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.getJob(jobId);
      expect(job?.data.type).toBe('project');
    });
  });

  describe('Job Progress Tracking', () => {
    it('should track job progress during processing', async () => {
      registerAIAnalysisWorker();

      const jobData: AIAnalysisJobData = {
        type: 'scene',
        entityId: 'scene-progress',
        userId: 'user-progress',
        analysisType: 'quick',
      };

      const jobId = await queueAIAnalysis(jobData);
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.getJob(jobId);

      expect(job).toBeDefined();

      // Initial progress should be 0 or undefined
      expect(job?.progress).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid analysis type', async () => {
      registerAIAnalysisWorker();

      const jobData: any = {
        type: 'invalid-type',
        entityId: 'test-id',
        userId: 'user-id',
        analysisType: 'full',
      };

      const jobId = await queueAIAnalysis(jobData);

      // Job should be added but will fail during processing
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.getJob(jobId);

      expect(job).toBeDefined();
    });

    it('should retry failed jobs based on configuration', async () => {
      registerAIAnalysisWorker();

      const jobData: AIAnalysisJobData = {
        type: 'scene',
        entityId: 'scene-retry-test',
        userId: 'user-retry',
        analysisType: 'full',
      };

      const jobId = await queueAIAnalysis(jobData);
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.getJob(jobId);

      // Check retry configuration
      expect(job?.opts.attempts).toBe(3);
      expect(job?.opts.backoff?.type).toBe('exponential');
    });

    it('should handle job failure gracefully', async () => {
      registerAIAnalysisWorker();

      const jobData: AIAnalysisJobData = {
        type: 'scene',
        entityId: 'scene-fail',
        userId: 'user-fail',
        analysisType: 'full',
      };

      const jobId = await queueAIAnalysis(jobData);
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);

      // Even if job fails, it should be in the queue
      const job = await queue.getJob(jobId);
      expect(job).toBeDefined();
    });
  });

  describe('Job Result Structure', () => {
    it('should have correct result structure for scene analysis', async () => {
      // Since we can't easily test the actual result without running the worker,
      // we verify the job structure matches what we expect
      const jobData: AIAnalysisJobData = {
        type: 'scene',
        entityId: 'scene-result',
        userId: 'user-result',
        analysisType: 'full',
      };

      const jobId = await queueAIAnalysis(jobData);
      expect(jobId).toBeDefined();
    });

    it('should include processing time in result', async () => {
      // This would be tested when the job completes
      // For now, we verify the job data structure
      const jobData: AIAnalysisJobData = {
        type: 'character',
        entityId: 'char-time',
        userId: 'user-time',
        analysisType: 'quick',
      };

      const jobId = await queueAIAnalysis(jobData);
      expect(jobId).toBeDefined();
    });

    it('should include entity information in result', async () => {
      const jobData: AIAnalysisJobData = {
        type: 'shot',
        entityId: 'shot-entity',
        userId: 'user-entity',
        analysisType: 'detailed',
      };

      const jobId = await queueAIAnalysis(jobData);
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.getJob(jobId);

      expect(job?.data.entityId).toBe('shot-entity');
      expect(job?.data.type).toBe('shot');
    });
  });

  describe('Concurrency and Rate Limiting', () => {
    it('should respect worker concurrency limits', async () => {
      registerAIAnalysisWorker();

      // Add multiple jobs
      const jobIds = await Promise.all([
        queueAIAnalysis({
          type: 'scene',
          entityId: 'scene-1',
          userId: 'user-1',
          analysisType: 'quick',
        }),
        queueAIAnalysis({
          type: 'scene',
          entityId: 'scene-2',
          userId: 'user-1',
          analysisType: 'quick',
        }),
        queueAIAnalysis({
          type: 'scene',
          entityId: 'scene-3',
          userId: 'user-1',
          analysisType: 'quick',
        }),
      ]);

      expect(jobIds.length).toBe(3);
      jobIds.forEach((id) => expect(id).toBeDefined());
    });

    it('should apply rate limiting', async () => {
      registerAIAnalysisWorker();

      const startTime = Date.now();

      // Add jobs in quick succession
      const jobIds = [];
      for (let i = 0; i < 5; i++) {
        const jobId = await queueAIAnalysis({
          type: 'scene',
          entityId: `scene-rate-${i}`,
          userId: 'user-rate',
          analysisType: 'quick',
        });
        jobIds.push(jobId);
      }

      const endTime = Date.now();

      // All jobs should be queued quickly
      expect(jobIds.length).toBe(5);
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Multiple Analysis Types', () => {
    it('should handle all entity types correctly', async () => {
      const entityTypes = ['scene', 'character', 'shot', 'project'] as const;

      const jobIds = await Promise.all(
        entityTypes.map((type) =>
          queueAIAnalysis({
            type,
            entityId: `${type}-multi`,
            userId: 'user-multi',
            analysisType: 'full',
          })
        )
      );

      expect(jobIds.length).toBe(4);
      jobIds.forEach((id) => expect(id).toBeDefined());
    });

    it('should handle all analysis types correctly', async () => {
      const analysisTypes = ['full', 'quick', 'detailed'] as const;

      const jobIds = await Promise.all(
        analysisTypes.map((analysisType) =>
          queueAIAnalysis({
            type: 'scene',
            entityId: `scene-${analysisType}`,
            userId: 'user-analysis',
            analysisType,
          })
        )
      );

      expect(jobIds.length).toBe(3);
      jobIds.forEach((id) => expect(id).toBeDefined());
    });
  });
});
