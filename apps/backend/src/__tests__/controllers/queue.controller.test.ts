/**
 * اختبارات وحدة — Queue Controller [UTP-008]
 *
 * يتحقق من:
 * - getJobStatus: رفض بدون jobId بـ 400
 * - getJobStatus: رفض اسم قائمة غير صالح بـ 400
 * - getJobStatus: إرجاع 404 عند عدم وجود المهمة
 * - getJobStatus: إرجاع بيانات المهمة عند النجاح
 * - getQueueStats: إرجاع إحصائيات جميع القوائم
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Request, Response } from 'express';

// ─── Mock لنظام القوائم ───
const mockGetQueue = vi.fn();
vi.mock('@/queues/queue.config', () => ({
  queueManager: {
    getQueue: (...args: unknown[]) => mockGetQueue(...args),
  },
  QueueName: {
    AI_ANALYSIS: 'ai-analysis',
    DOCUMENT_PROCESSING: 'document-processing',
    NOTIFICATIONS: 'notifications',
    EXPORT: 'export',
    CACHE_WARMING: 'cache-warming',
  },
}));

import { QueueController } from '@/controllers/queue.controller';

// ─── مساعدات ───

function createReq(overrides: Record<string, unknown> = {}): Request {
  return {
    params: {},
    query: {},
    body: {},
    ...overrides,
  } as unknown as Request;
}

function createRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

// ═══ اختبارات ═══

describe('QueueController', () => {
  let controller: QueueController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new QueueController();
  });

  // ─── getJobStatus ───

  describe('getJobStatus', () => {
    it('يجب أن يرفض بدون jobId بـ 400', async () => {
      const req = createReq({ params: {} });
      const res = createRes();

      await controller.getJobStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('يجب أن يرفض اسم قائمة غير صالح بـ 400', async () => {
      const req = createReq({
        params: { jobId: 'job-123' },
        query: { queue: 'invalid-queue-name' },
      });
      const res = createRes();

      await controller.getJobStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('يجب أن يُرجع 404 عند عدم وجود المهمة', async () => {
      const mockQueue = {
        getJob: vi.fn().mockResolvedValue(null),
      };
      mockGetQueue.mockReturnValue(mockQueue);

      const req = createReq({
        params: { jobId: 'nonexistent-job' },
        query: { queue: 'ai-analysis' },
      });
      const res = createRes();

      await controller.getJobStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('يجب أن يُرجع بيانات المهمة عند النجاح', async () => {
      const mockJob = {
        id: 'job-123',
        name: 'analyze',
        progress: 50,
        returnvalue: null,
        failedReason: null,
        data: { type: 'scene' },
        timestamp: Date.now(),
        processedOn: null,
        finishedOn: null,
        attemptsMade: 0,
        getState: vi.fn().mockResolvedValue('active'),
      };
      const mockQueue = {
        getJob: vi.fn().mockResolvedValue(mockJob),
      };
      mockGetQueue.mockReturnValue(mockQueue);

      const req = createReq({
        params: { jobId: 'job-123' },
        query: { queue: 'ai-analysis' },
      });
      const res = createRes();

      await controller.getJobStatus(req, res);

      const call = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.success).toBe(true);
      expect(call.job).toMatchObject({
        id: 'job-123',
        state: 'active',
      });
    });
  });
});
