/**
 * اختبارات وحدة — Metrics Controller [UTP-008]
 *
 * يتحقق من:
 * - getSnapshot: إرجاع لقطة المقاييس بنجاح
 * - getSnapshot: معالجة خطأ بـ 500
 * - getLatest: إرجاع آخر المقاييس
 * - getRange: رفض بدون start/end بـ 400
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

// ─── Mock للخدمات ───
const mockTakeSnapshot = vi.fn();
vi.mock('@/services/metrics-aggregator.service', () => ({
  metricsAggregator: {
    takeSnapshot: (...args: unknown[]) => mockTakeSnapshot(...args),
    getHistory: vi.fn().mockReturnValue([]),
  },
}));

vi.mock('@/services/resource-monitor.service', () => ({
  resourceMonitor: {
    getSystemMetrics: vi.fn().mockReturnValue({}),
    trackRateLimitHit: vi.fn(),
  },
}));

vi.mock('@/services/cache-metrics.service', () => ({
  cacheMetricsService: {
    getCacheStats: vi.fn().mockReturnValue({}),
  },
}));

vi.mock('@/controllers/metrics.helpers.js', () => ({
  getSnapshotData: vi.fn().mockResolvedValue({ cpu: 50, memory: 60 }),
  parseDateRange: vi.fn((start: unknown, end: unknown) => {
    if (!start || !end) return { error: 'missing' };
    return { start: new Date(start as string), end: new Date(end as string) };
  }),
  defaultDateRange: vi.fn().mockReturnValue({ start: new Date(), end: new Date() }),
  buildDashboardSummary: vi.fn().mockReturnValue({}),
  buildHealthData: vi.fn().mockReturnValue({}),
  buildApmAlerts: vi.fn().mockReturnValue([]),
  buildApmConfig: vi.fn().mockReturnValue({}),
  generateCacheReport: vi.fn().mockResolvedValue({}),
  generateMetricsReport: vi.fn().mockResolvedValue({}),
  getPerformanceDashboard: vi.fn().mockResolvedValue({}),
  resetPerformanceMetrics: vi.fn(),
}));

import { MetricsController } from '@/controllers/metrics.controller';

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

describe('MetricsController', () => {
  let controller: MetricsController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new MetricsController();
  });

  describe('getSnapshot', () => {
    it('يجب أن يُرجع لقطة المقاييس بنجاح', async () => {
      mockTakeSnapshot.mockResolvedValue({
        timestamp: Date.now(),
        api: { totalRequests: 100 },
      });

      const req = createReq();
      const res = createRes();

      await controller.getSnapshot(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Object) })
      );
    });

    it('يجب أن يتعامل مع خطأ بـ 500', async () => {
      mockTakeSnapshot.mockRejectedValue(new Error('Metrics error'));

      const req = createReq();
      const res = createRes();

      await controller.getSnapshot(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getLatest', () => {
    it('يجب أن يُرجع آخر المقاييس', async () => {
      const req = createReq();
      const res = createRes();

      await controller.getLatest(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('getRange', () => {
    it('يجب أن يرفض بدون start/end بـ 400', async () => {
      const req = createReq({ query: {} });
      const res = createRes();

      await controller.getRange(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
