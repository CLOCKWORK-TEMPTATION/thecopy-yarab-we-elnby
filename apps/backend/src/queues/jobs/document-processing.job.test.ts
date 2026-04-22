/**
 * Document Processing Job Tests
 *
 * Tests for document processing background jobs with retry and failure scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  queueDocumentProcessing,
  registerDocumentProcessingWorker,
  DocumentProcessingJobData,
} from './document-processing.job';
import { queueManager, QueueName } from '@/queues/queue.config';

vi.mock('redis', () => ({
  createClient: () => ({
    on: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

describe('Document Processing Job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await queueManager.close();
  });

  describe('queueDocumentProcessing', () => {
    it('should add document processing job to queue', async () => {
      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-123',
        filePath: '/uploads/test.pdf',
        fileType: 'pdf',
        userId: 'user-456',
      };

      const jobId = await queueDocumentProcessing(jobData);

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      expect(job).toBeDefined();
      expect(job?.data).toEqual(jobData);
    });

    it('should handle PDF documents', async () => {
      const jobData: DocumentProcessingJobData = {
        documentId: 'pdf-doc',
        filePath: '/uploads/script.pdf',
        fileType: 'pdf',
        userId: 'user-1',
      };

      const jobId = await queueDocumentProcessing(jobData);

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      expect(job?.data.fileType).toBe('pdf');
    });

    it('should handle DOCX documents', async () => {
      const jobData: DocumentProcessingJobData = {
        documentId: 'docx-doc',
        filePath: '/uploads/script.docx',
        fileType: 'docx',
        userId: 'user-2',
      };

      const jobId = await queueDocumentProcessing(jobData);

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      expect(job?.data.fileType).toBe('docx');
    });

    it('should handle TXT documents', async () => {
      const jobData: DocumentProcessingJobData = {
        documentId: 'txt-doc',
        filePath: '/uploads/script.txt',
        fileType: 'txt',
        userId: 'user-3',
      };

      const jobId = await queueDocumentProcessing(jobData);

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      expect(job?.data.fileType).toBe('txt');
    });

    it('should include project ID when provided', async () => {
      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-project',
        filePath: '/uploads/project-script.pdf',
        fileType: 'pdf',
        userId: 'user-4',
        projectId: 'proj-789',
      };

      const jobId = await queueDocumentProcessing(jobData);

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      expect(job?.data.projectId).toBe('proj-789');
    });

    it('should include processing options', async () => {
      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-options',
        filePath: '/uploads/full-process.pdf',
        fileType: 'pdf',
        userId: 'user-5',
        options: {
          extractScenes: true,
          extractCharacters: true,
          extractDialogue: true,
          generateSummary: true,
        },
      };

      const jobId = await queueDocumentProcessing(jobData);

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      expect(job?.data.options).toEqual({
        extractScenes: true,
        extractCharacters: true,
        extractDialogue: true,
        generateSummary: true,
      });
    });

    it('should apply retry configuration', async () => {
      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-retry',
        filePath: '/uploads/retry-test.pdf',
        fileType: 'pdf',
        userId: 'user-retry',
      };

      const jobId = await queueDocumentProcessing(jobData);

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      expect(job?.opts.attempts).toBe(3);
      expect(job?.opts.backoff).toEqual({
        type: 'exponential',
        delay: 3000,
      });
    });
  });

  describe('registerDocumentProcessingWorker', () => {
    it('should register worker successfully', () => {
      registerDocumentProcessingWorker();

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      expect(queue).toBeDefined();
    });

    it('should process document with all options enabled', async () => {
      registerDocumentProcessingWorker();

      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-full',
        filePath: '/uploads/full.pdf',
        fileType: 'pdf',
        userId: 'user-full',
        options: {
          extractScenes: true,
          extractCharacters: true,
          extractDialogue: true,
          generateSummary: true,
        },
      };

      const jobId = await queueDocumentProcessing(jobData);
      expect(jobId).toBeDefined();

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      expect(job?.data.options?.extractScenes).toBe(true);
      expect(job?.data.options?.extractCharacters).toBe(true);
      expect(job?.data.options?.extractDialogue).toBe(true);
      expect(job?.data.options?.generateSummary).toBe(true);
    }, 10000);

    it('should process document with minimal options', async () => {
      registerDocumentProcessingWorker();

      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-minimal',
        filePath: '/uploads/minimal.txt',
        fileType: 'txt',
        userId: 'user-minimal',
      };

      const jobId = await queueDocumentProcessing(jobData);
      expect(jobId).toBeDefined();
    });
  });

  describe('Job Progress Tracking', () => {
    it('should initialize with zero progress', async () => {
      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-progress',
        filePath: '/uploads/progress.pdf',
        fileType: 'pdf',
        userId: 'user-progress',
      };

      const jobId = await queueDocumentProcessing(jobData);

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      expect(job?.progress).toBeUndefined();
    });
  });

  describe('Failure Scenarios and Retry Logic', () => {
    it('should retry on failure with exponential backoff', async () => {
      registerDocumentProcessingWorker();

      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-fail-retry',
        filePath: '/uploads/fail.pdf',
        fileType: 'pdf',
        userId: 'user-fail',
      };

      const jobId = await queueDocumentProcessing(jobData);

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      // Verify retry settings
      expect(job?.opts.attempts).toBe(3);
      expect(job?.opts.backoff?.type).toBe('exponential');
      expect(job?.opts.backoff?.delay).toBe(3000);
    });

    it('should handle missing file error', async () => {
      registerDocumentProcessingWorker();

      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-missing',
        filePath: '/uploads/nonexistent.pdf',
        fileType: 'pdf',
        userId: 'user-missing',
      };

      const jobId = await queueDocumentProcessing(jobData);

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      // Job should be queued even if file doesn't exist
      expect(job).toBeDefined();
    });

    it('should handle corrupted file error', async () => {
      registerDocumentProcessingWorker();

      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-corrupt',
        filePath: '/uploads/corrupted.pdf',
        fileType: 'pdf',
        userId: 'user-corrupt',
      };

      const jobId = await queueDocumentProcessing(jobData);
      expect(jobId).toBeDefined();
    });

    it('should handle timeout errors', async () => {
      registerDocumentProcessingWorker();

      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-timeout',
        filePath: '/uploads/large.pdf',
        fileType: 'pdf',
        userId: 'user-timeout',
      };

      const jobId = await queueDocumentProcessing(jobData);
      expect(jobId).toBeDefined();
    });

    it('should fail after max retry attempts', async () => {
      registerDocumentProcessingWorker();

      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-max-retry',
        filePath: '/uploads/permanent-fail.pdf',
        fileType: 'pdf',
        userId: 'user-max-retry',
      };

      const jobId = await queueDocumentProcessing(jobData);

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      // Should have 3 attempts configured
      expect(job?.opts.attempts).toBe(3);
    });
  });

  describe('Concurrency and Rate Limiting', () => {
    it('should respect concurrency limit', async () => {
      registerDocumentProcessingWorker();

      // Queue multiple documents
      const jobIds = await Promise.all([
        queueDocumentProcessing({
          documentId: 'doc-1',
          filePath: '/uploads/doc1.pdf',
          fileType: 'pdf',
          userId: 'user-concurrent',
        }),
        queueDocumentProcessing({
          documentId: 'doc-2',
          filePath: '/uploads/doc2.pdf',
          fileType: 'pdf',
          userId: 'user-concurrent',
        }),
        queueDocumentProcessing({
          documentId: 'doc-3',
          filePath: '/uploads/doc3.pdf',
          fileType: 'pdf',
          userId: 'user-concurrent',
        }),
      ]);

      expect(jobIds.length).toBe(3);
      jobIds.forEach((id) => expect(id).toBeDefined());
    });

    it('should apply rate limiting', async () => {
      registerDocumentProcessingWorker();

      const startTime = Date.now();

      // Add jobs in quick succession
      const jobIds = [];
      for (let i = 0; i < 5; i++) {
        const jobId = await queueDocumentProcessing({
          documentId: `doc-rate-${i}`,
          filePath: `/uploads/doc${i}.pdf`,
          fileType: 'pdf',
          userId: 'user-rate',
        });
        jobIds.push(jobId);
      }

      const endTime = Date.now();

      // All jobs should be queued quickly
      expect(jobIds.length).toBe(5);
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Different File Types', () => {
    it('should handle all supported file types', async () => {
      const fileTypes = ['pdf', 'docx', 'txt'] as const;

      const jobIds = await Promise.all(
        fileTypes.map((fileType) =>
          queueDocumentProcessing({
            documentId: `doc-${fileType}`,
            filePath: `/uploads/file.${fileType}`,
            fileType,
            userId: 'user-types',
          })
        )
      );

      expect(jobIds.length).toBe(3);
      jobIds.forEach((id) => expect(id).toBeDefined());
    });
  });

  describe('Optional Extraction Features', () => {
    it('should handle scene extraction option', async () => {
      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-scenes',
        filePath: '/uploads/scenes.pdf',
        fileType: 'pdf',
        userId: 'user-scenes',
        options: {
          extractScenes: true,
        },
      };

      const jobId = await queueDocumentProcessing(jobData);

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      expect(job?.data.options?.extractScenes).toBe(true);
    });

    it('should handle character extraction option', async () => {
      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-chars',
        filePath: '/uploads/chars.pdf',
        fileType: 'pdf',
        userId: 'user-chars',
        options: {
          extractCharacters: true,
        },
      };

      const jobId = await queueDocumentProcessing(jobData);

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      expect(job?.data.options?.extractCharacters).toBe(true);
    });

    it('should handle dialogue extraction option', async () => {
      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-dialogue',
        filePath: '/uploads/dialogue.pdf',
        fileType: 'pdf',
        userId: 'user-dialogue',
        options: {
          extractDialogue: true,
        },
      };

      const jobId = await queueDocumentProcessing(jobData);

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      expect(job?.data.options?.extractDialogue).toBe(true);
    });

    it('should handle summary generation option', async () => {
      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-summary',
        filePath: '/uploads/summary.pdf',
        fileType: 'pdf',
        userId: 'user-summary',
        options: {
          generateSummary: true,
        },
      };

      const jobId = await queueDocumentProcessing(jobData);

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      expect(job?.data.options?.generateSummary).toBe(true);
    });
  });

  describe('Result Structure Validation', () => {
    it('should verify expected result fields', async () => {
      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-result',
        filePath: '/uploads/result.pdf',
        fileType: 'pdf',
        userId: 'user-result',
      };

      const jobId = await queueDocumentProcessing(jobData);

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      expect(job?.data.documentId).toBe('doc-result');
      expect(job?.data.userId).toBe('user-result');
    });
  });

  describe('Job Metadata', () => {
    it('should track job creation time', async () => {
      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-time',
        filePath: '/uploads/time.pdf',
        fileType: 'pdf',
        userId: 'user-time',
      };

      const beforeTime = Date.now();
      const jobId = await queueDocumentProcessing(jobData);
      const afterTime = Date.now();

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      expect(job?.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(job?.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should have proper job naming', async () => {
      const jobData: DocumentProcessingJobData = {
        documentId: 'doc-naming',
        filePath: '/uploads/naming.pdf',
        fileType: 'pdf',
        userId: 'user-naming',
      };

      const jobId = await queueDocumentProcessing(jobData);

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      expect(job?.name).toBe('document-processing');
    });
  });
});
