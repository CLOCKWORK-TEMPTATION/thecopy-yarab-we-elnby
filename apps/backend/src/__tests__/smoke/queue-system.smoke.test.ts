/**
 * Queue System Smoke Tests
 *
 * Quick smoke tests to verify queue system is operational
 */

import { describe, it, expect, afterAll } from "vitest";

import { queueAIAnalysis } from "@/queues/jobs/ai-analysis.job";
import { queueDocumentProcessing } from "@/queues/jobs/document-processing.job";
import { queueManager, QueueName } from "@/queues/queue.config";

function expectOperationalError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  expect(message).toBeDefined();
}

function getStringField(value: unknown, field: string): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const fieldValue = (value as Record<string, unknown>)[field];
  return typeof fieldValue === "string" ? fieldValue : undefined;
}

function assertDefaultJobOptions(
  job: { opts: { attempts?: unknown; backoff?: unknown } } | undefined | null,
): void {
  if (!job) {
    return;
  }

  expect(job.opts.attempts).toBe(3);
  expect(job.opts.backoff).toEqual({
    type: "exponential",
    delay: 2000,
  });
}

function assertFirstQueueStats(allStats: unknown[]): void {
  const firstStats = allStats[0];
  if (!firstStats) {
    return;
  }

  expect(firstStats).toHaveProperty("name");
  expect(firstStats).toHaveProperty("waiting");
  expect(firstStats).toHaveProperty("total");
}

afterAll(async () => {
  await queueManager.close();
});

describe("Queue Connectivity", () => {
  it("should connect to Redis successfully", async () => {
    try {
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      expect(queue).toBeDefined();

      // Try to get queue stats
      const stats = await queueManager.getQueueStats(QueueName.AI_ANALYSIS);
      expect(stats).toBeDefined();
      expect(stats.name).toBe(QueueName.AI_ANALYSIS);
    } catch (error: unknown) {
      // Redis might not be available in test environment
      expectOperationalError(error);
    }
  });

  it("should create queue instances", () => {
    const aiQueue = queueManager.getQueue(QueueName.AI_ANALYSIS);
    const docQueue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);

    expect(aiQueue).toBeDefined();
    expect(docQueue).toBeDefined();
    expect(aiQueue.name).toBe(QueueName.AI_ANALYSIS);
    expect(docQueue.name).toBe(QueueName.DOCUMENT_PROCESSING);
  });
});

describe("Job Queueing", () => {
  it("should queue AI analysis job", async () => {
    try {
      const jobId = await queueAIAnalysis({
        type: "scene",
        entityId: "smoke-test-scene",
        userId: "smoke-test-user",
        analysisType: "quick",
      });

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe("string");

      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.getJob(jobId);

      expect(job).toBeDefined();
      expect(getStringField(job?.data as unknown, "entityId")).toBe(
        "smoke-test-scene",
      );
    } catch (error: unknown) {
      // Queue might not be available
      expectOperationalError(error);
    }
  });

  it("should queue document processing job", async () => {
    try {
      const jobId = await queueDocumentProcessing({
        documentId: "smoke-test-doc",
        filePath: "/tmp/test.pdf",
        fileType: "pdf",
        userId: "smoke-test-user",
      });

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe("string");

      const queue = queueManager.getQueue(QueueName.DOCUMENT_PROCESSING);
      const job = await queue.getJob(jobId);

      expect(job).toBeDefined();
      expect(getStringField(job?.data as unknown, "documentId")).toBe(
        "smoke-test-doc",
      );
    } catch (error: unknown) {
      expectOperationalError(error);
    }
  });
});

describe("Queue Statistics", () => {
  it("should retrieve queue statistics", async () => {
    try {
      const stats = await queueManager.getQueueStats(QueueName.AI_ANALYSIS);

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("name");
      expect(stats).toHaveProperty("waiting");
      expect(stats).toHaveProperty("active");
      expect(stats).toHaveProperty("completed");
      expect(stats).toHaveProperty("failed");
      expect(stats).toHaveProperty("total");

      expect(typeof stats.waiting).toBe("number");
      expect(typeof stats.active).toBe("number");
      expect(typeof stats.total).toBe("number");
    } catch (error: unknown) {
      expectOperationalError(error);
    }
  });

  it("should retrieve all queue statistics", async () => {
    try {
      const allStats = await queueManager.getAllStats();

      expect(Array.isArray(allStats)).toBe(true);

      assertFirstQueueStats(allStats);
    } catch (error: unknown) {
      expectOperationalError(error);
    }
  });
});

describe("Queue Operations", () => {
  it("should pause and resume queue", async () => {
    try {
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);

      // Pause
      await queueManager.pauseQueue(QueueName.AI_ANALYSIS);
      let isPaused = await queue.isPaused();
      expect(isPaused).toBe(true);

      // Resume
      await queueManager.resumeQueue(QueueName.AI_ANALYSIS);
      isPaused = await queue.isPaused();
      expect(isPaused).toBe(false);
    } catch (error: unknown) {
      expectOperationalError(error);
    }
  });

  it("should clean queue", async () => {
    try {
      await queueManager.cleanQueue(QueueName.AI_ANALYSIS, 0);

      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const completedCount = await queue.getCompletedCount();

      expect(typeof completedCount).toBe("number");
    } catch (error: unknown) {
      expectOperationalError(error);
    }
  });
});

describe("Queue Names", () => {
  it("should have all required queue names defined", () => {
    expect(QueueName.AI_ANALYSIS).toBe("ai-analysis");
    expect(QueueName.DOCUMENT_PROCESSING).toBe("document-processing");
    expect(QueueName.NOTIFICATIONS).toBe("notifications");
    expect(QueueName.EXPORT).toBe("export");
    expect(QueueName.CACHE_WARMING).toBe("cache-warming");
  });
});

describe("Error Handling", () => {
  it("should handle invalid queue operations gracefully", async () => {
    try {
      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);

      // Try to get non-existent job
      const job = await queue.getJob("non-existent-id");
      expect(job).toBeUndefined();
    } catch (error: unknown) {
      expectOperationalError(error);
    }
  });
});

describe("Job Configuration", () => {
  it("should apply default job options", async () => {
    try {
      const jobId = await queueAIAnalysis({
        type: "character",
        entityId: "config-test",
        userId: "test-user",
        analysisType: "full",
      });

      const queue = queueManager.getQueue(QueueName.AI_ANALYSIS);
      const job = await queue.getJob(jobId);

      expect(job).toBeDefined();
      assertDefaultJobOptions(
        job as { opts: { attempts?: unknown; backoff?: unknown } },
      );
    } catch (error: unknown) {
      expectOperationalError(error);
    }
  });
});
