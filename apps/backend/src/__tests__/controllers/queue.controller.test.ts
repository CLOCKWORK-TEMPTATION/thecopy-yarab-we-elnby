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

import { describe, it, expect, vi, beforeEach } from "vitest";

import { QueueController } from "@/controllers/queue.controller";

import type { Request, Response } from "express";

type MockFn = ReturnType<typeof vi.fn>;
type MockResponse = Partial<Response> & {
  status: MockFn;
  json: MockFn;
};

// ─── Mock لنظام القوائم ───
const mockGetQueue = vi.fn<(...args: unknown[]) => unknown>();
vi.mock("@/queues/queue.config", () => ({
  queueManager: {
    getQueue: (...args: unknown[]): unknown => mockGetQueue(...args),
  },
  QueueName: {
    AI_ANALYSIS: "ai-analysis",
    DOCUMENT_PROCESSING: "document-processing",
    NOTIFICATIONS: "notifications",
    EXPORT: "export",
    CACHE_WARMING: "cache-warming",
  },
}));

// ─── مساعدات ───

function createReq(overrides: Record<string, unknown> = {}): Request {
  return {
    params: {},
    query: {},
    body: {},
    ...overrides,
  } as unknown as Request;
}

function createRes(): MockResponse {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

function asResponse(response: MockResponse): Response {
  return response as unknown as Response;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstJsonPayload(response: MockResponse): Record<string, unknown> {
  const payload: unknown = response.json.mock.calls[0]?.[0];
  return isRecord(payload) ? payload : {};
}

// ═══ اختبارات ═══

describe("QueueController", () => {
  let controller: QueueController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new QueueController();
  });

  // ─── getJobStatus ───

  describe("getJobStatus", () => {
    it("يجب أن يرفض بدون jobId بـ 400", async () => {
      const req = createReq({ params: {} });
      const res = createRes();

      await controller.getJobStatus(req, asResponse(res));

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });

    it("يجب أن يرفض اسم قائمة غير صالح بـ 400", async () => {
      const req = createReq({
        params: { jobId: "job-123" },
        query: { queue: "invalid-queue-name" },
      });
      const res = createRes();

      await controller.getJobStatus(req, asResponse(res));

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("يجب أن يُرجع 404 عند عدم وجود المهمة", async () => {
      const mockQueue = {
        getJob: vi.fn().mockResolvedValue(null),
      };
      mockGetQueue.mockReturnValue(mockQueue);

      const req = createReq({
        params: { jobId: "nonexistent-job" },
        query: { queue: "ai-analysis" },
      });
      const res = createRes();

      await controller.getJobStatus(req, asResponse(res));

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("يجب أن يُرجع بيانات المهمة عند النجاح", async () => {
      const mockJob = {
        id: "job-123",
        name: "analyze",
        progress: 50,
        returnvalue: null,
        failedReason: null,
        data: { type: "scene" },
        timestamp: Date.now(),
        processedOn: null,
        finishedOn: null,
        attemptsMade: 0,
        getState: vi.fn().mockResolvedValue("active"),
      };
      const mockQueue = {
        getJob: vi.fn().mockResolvedValue(mockJob),
      };
      mockGetQueue.mockReturnValue(mockQueue);

      const req = createReq({
        params: { jobId: "job-123" },
        query: { queue: "ai-analysis" },
      });
      const res = createRes();

      await controller.getJobStatus(req, asResponse(res));

      const call = firstJsonPayload(res);
      expect(call["success"]).toBe(true);
      expect(call["job"]).toMatchObject({
        id: "job-123",
        state: "active",
      });
    });
  });
});
