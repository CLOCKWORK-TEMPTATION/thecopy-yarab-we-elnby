import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('@/middleware/metrics.middleware', () => ({
  register: {
    getMetricsAsJSON: vi.fn(),
  },
}));

vi.mock('./redis-metrics.service', () => ({
  redisMetricsRegistry: {
    getMetricsAsJSON: vi.fn(),
  },
}));

vi.mock('@/queues/queue.config', () => ({
  queueManager: {
    getAllStats: vi.fn(),
  },
}));

vi.mock('./resource-monitor.service', () => ({
  resourceMonitor: {
    getResourceStatus: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { logger } from '@/lib/logger';
import { register } from '@/middleware/metrics.middleware';
import { queueManager } from '@/queues/queue.config';

import { MetricsAggregatorService, metricsAggregator } from './metrics-aggregator.service';
import { redisMetricsRegistry } from './redis-metrics.service';
import { resourceMonitor } from './resource-monitor.service';


describe('MetricsAggregatorService', () => {
  let service: MetricsAggregatorService;

  const mockPrometheusMetrics = [
    {
      name: 'the_copy_db_queries_total',
      type: 'counter',
      values: [
        { value: 100, labels: { table: 'users' } },
        { value: 50, labels: { table: 'projects' } },
      ],
    },
    {
      name: 'the_copy_http_requests_total',
      type: 'counter',
      values: [
        { value: 500, labels: { route: '/api/projects', status_code: '200' } },
        { value: 20, labels: { route: '/api/auth', status_code: '401' } },
      ],
    },
    {
      name: 'the_copy_gemini_requests_total',
      type: 'counter',
      values: [
        { value: 100, labels: { status: 'success' } },
        { value: 5, labels: { status: 'error' } },
      ],
    },
    {
      name: 'the_copy_gemini_cache_hits_total',
      type: 'counter',
      values: [{ value: 80 }],
    },
    {
      name: 'the_copy_gemini_cache_misses_total',
      type: 'counter',
      values: [{ value: 20 }],
    },
  ];

  const mockRedisMetrics = [
    {
      name: 'the_copy_redis_cache_hits_total',
      type: 'counter',
      values: [{ value: 1000 }],
    },
    {
      name: 'the_copy_redis_cache_misses_total',
      type: 'counter',
      values: [{ value: 200 }],
    },
    {
      name: 'the_copy_redis_memory_usage_bytes',
      type: 'gauge',
      values: [{ value: 1048576 }],
    },
    {
      name: 'the_copy_redis_connected_clients',
      type: 'gauge',
      values: [{ value: 5 }],
    },
  ];

  const mockQueueStats = [
    {
      name: 'analysis',
      waiting: 10,
      active: 5,
      completed: 100,
      failed: 3,
      delayed: 2,
      total: 120,
    },
    {
      name: 'notifications',
      waiting: 0,
      active: 1,
      completed: 50,
      failed: 1,
      delayed: 0,
      total: 52,
    },
  ];

  const mockResourceStatus = {
    cpu: { usage: 45, status: 'normal' },
    memory: { used: 512000000, total: 1024000000, percent: 50, status: 'normal' },
    eventLoop: { lag: 5, status: 'normal' },
    concurrentRequests: 10,
    backpressureEvents: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MetricsAggregatorService();

    // Setup default mocks
    vi.mocked(register.getMetricsAsJSON).mockResolvedValue(mockPrometheusMetrics);
    vi.mocked(redisMetricsRegistry.getMetricsAsJSON).mockResolvedValue(mockRedisMetrics);
    vi.mocked(queueManager.getAllStats).mockResolvedValue(mockQueueStats);
    vi.mocked(resourceMonitor.getResourceStatus).mockResolvedValue(mockResourceStatus);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('takeSnapshot', () => {
    it('should take a complete metrics snapshot', async () => {
      const snapshot = await service.takeSnapshot();

      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('database');
      expect(snapshot).toHaveProperty('redis');
      expect(snapshot).toHaveProperty('queue');
      expect(snapshot).toHaveProperty('api');
      expect(snapshot).toHaveProperty('resources');
      expect(snapshot).toHaveProperty('gemini');
    });

    it('should aggregate database metrics correctly', async () => {
      const snapshot = await service.takeSnapshot();

      expect(snapshot.database.totalQueries).toBe(150); // 100 + 50
      expect(snapshot.database.byTable).toHaveProperty('users');
      expect(snapshot.database.byTable).toHaveProperty('projects');
    });

    it('should aggregate Redis metrics correctly', async () => {
      const snapshot = await service.takeSnapshot();

      expect(snapshot.redis.hits).toBe(1000);
      expect(snapshot.redis.misses).toBe(200);
      expect(snapshot.redis.hitRatio).toBeCloseTo(1000 / 1200, 2);
      expect(snapshot.redis.memoryUsage).toBe(1048576);
      expect(snapshot.redis.connectedClients).toBe(5);
    });

    it('should aggregate queue metrics correctly', async () => {
      const snapshot = await service.takeSnapshot();

      expect(snapshot.queue.totalJobs).toBe(172); // 120 + 52
      expect(snapshot.queue.activeJobs).toBe(6); // 5 + 1
      expect(snapshot.queue.completedJobs).toBe(150); // 100 + 50
      expect(snapshot.queue.failedJobs).toBe(4); // 3 + 1
      expect(snapshot.queue.byQueue).toHaveProperty('analysis');
      expect(snapshot.queue.byQueue).toHaveProperty('notifications');
    });

    it('should aggregate API metrics correctly', async () => {
      const snapshot = await service.takeSnapshot();

      expect(snapshot.api.totalRequests).toBe(520); // 500 + 20
      expect(snapshot.api.byEndpoint).toHaveProperty('/api/projects');
      expect(snapshot.api.byEndpoint).toHaveProperty('/api/auth');
      expect(snapshot.api.byEndpoint['/api/auth'].errors).toBe(20);
    });

    it('should aggregate Gemini metrics correctly', async () => {
      const snapshot = await service.takeSnapshot();

      expect(snapshot.gemini.totalRequests).toBe(105); // 100 + 5
      expect(snapshot.gemini.cacheHitRatio).toBeCloseTo(80 / 100, 2);
      expect(snapshot.gemini.errorRate).toBeCloseTo(5 / 105, 3);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(register.getMetricsAsJSON).mockRejectedValue(new Error('Metrics error'));

      await expect(service.takeSnapshot()).rejects.toThrow('Metrics error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getLatestSnapshot', () => {
    it('should return null when no snapshots exist', () => {
      const result = service.getLatestSnapshot();
      expect(result).toBeNull();
    });

    it('should return the latest snapshot', async () => {
      await service.takeSnapshot();
      await service.takeSnapshot();

      const latest = service.getLatestSnapshot();

      expect(latest).toBeDefined();
      expect(latest?.timestamp).toBeDefined();
    });
  });

  describe('getSnapshotsInRange', () => {
    it('should return snapshots within time range', async () => {
      const startTime = new Date();

      await service.takeSnapshot();

      // Wait a bit and take another snapshot
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.takeSnapshot();

      const endTime = new Date();

      const snapshots = service.getSnapshotsInRange(startTime, endTime);

      expect(snapshots.length).toBe(2);
    });

    it('should return empty array for range with no snapshots', async () => {
      await service.takeSnapshot();

      const futureStart = new Date(Date.now() + 1000000);
      const futureEnd = new Date(Date.now() + 2000000);

      const snapshots = service.getSnapshotsInRange(futureStart, futureEnd);

      expect(snapshots.length).toBe(0);
    });
  });

  describe('generatePerformanceReport', () => {
    it('should generate performance report from snapshots', async () => {
      const startTime = new Date();
      await service.takeSnapshot();
      const endTime = new Date();

      const report = await service.generatePerformanceReport(startTime, endTime);

      expect(report).toHaveProperty('period');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('alerts');

      expect(report.period.start).toBeDefined();
      expect(report.period.end).toBeDefined();
      expect(report.summary.systemHealth).toBe('healthy');
    });

    it('should throw error when no snapshots in range', async () => {
      const pastStart = new Date(Date.now() - 2000000);
      const pastEnd = new Date(Date.now() - 1000000);

      await expect(service.generatePerformanceReport(pastStart, pastEnd)).rejects.toThrow(
        'No metrics data available for the specified time range'
      );
    });

    it('should detect critical system health', async () => {
      vi.mocked(resourceMonitor.getResourceStatus).mockResolvedValue({
        cpu: { usage: 95, status: 'critical' },
        memory: { used: 900000000, total: 1024000000, percent: 88, status: 'warning' },
        eventLoop: { lag: 50, status: 'warning' },
        concurrentRequests: 100,
        backpressureEvents: 5,
      });

      const startTime = new Date();
      await service.takeSnapshot();
      const endTime = new Date();

      const report = await service.generatePerformanceReport(startTime, endTime);

      expect(report.summary.systemHealth).toBe('critical');
    });

    it('should detect degraded system health', async () => {
      vi.mocked(resourceMonitor.getResourceStatus).mockResolvedValue({
        cpu: { usage: 75, status: 'warning' },
        memory: { used: 700000000, total: 1024000000, percent: 68, status: 'normal' },
        eventLoop: { lag: 20, status: 'normal' },
        concurrentRequests: 50,
        backpressureEvents: 1,
      });

      const startTime = new Date();
      await service.takeSnapshot();
      const endTime = new Date();

      const report = await service.generatePerformanceReport(startTime, endTime);

      expect(report.summary.systemHealth).toBe('degraded');
    });

    it('should generate recommendations for low cache hit ratio', async () => {
      vi.mocked(redisMetricsRegistry.getMetricsAsJSON).mockResolvedValue([
        { name: 'the_copy_redis_cache_hits_total', type: 'counter', values: [{ value: 100 }] },
        { name: 'the_copy_redis_cache_misses_total', type: 'counter', values: [{ value: 100 }] },
        { name: 'the_copy_redis_memory_usage_bytes', type: 'gauge', values: [{ value: 1048576 }] },
        { name: 'the_copy_redis_connected_clients', type: 'gauge', values: [{ value: 5 }] },
      ]);

      const startTime = new Date();
      await service.takeSnapshot();
      const endTime = new Date();

      const report = await service.generatePerformanceReport(startTime, endTime);

      // Check if cache recommendation exists (case insensitive)
      const hasCacheRecommendation = report.recommendations.some(r =>
        r.toLowerCase().includes('cache')
      );
      expect(hasCacheRecommendation).toBe(true);
      expect(report.alerts.some(a => a.metric === 'redis.hitRatio')).toBe(true);
    });

    it('should generate alerts for high CPU usage', async () => {
      vi.mocked(resourceMonitor.getResourceStatus).mockResolvedValue({
        cpu: { usage: 85, status: 'warning' },
        memory: { used: 512000000, total: 1024000000, percent: 50, status: 'normal' },
        eventLoop: { lag: 5, status: 'normal' },
        concurrentRequests: 10,
        backpressureEvents: 0,
      });

      const startTime = new Date();
      await service.takeSnapshot();
      const endTime = new Date();

      const report = await service.generatePerformanceReport(startTime, endTime);

      expect(report.alerts.some(a => a.metric === 'resources.cpu.usage')).toBe(true);
    });

    it('should generate alerts for high memory usage', async () => {
      vi.mocked(resourceMonitor.getResourceStatus).mockResolvedValue({
        cpu: { usage: 45, status: 'normal' },
        memory: { used: 900000000, total: 1024000000, percent: 88, status: 'warning' },
        eventLoop: { lag: 5, status: 'normal' },
        concurrentRequests: 10,
        backpressureEvents: 0,
      });

      const startTime = new Date();
      await service.takeSnapshot();
      const endTime = new Date();

      const report = await service.generatePerformanceReport(startTime, endTime);

      expect(report.alerts.some(a => a.metric === 'resources.memory.percent')).toBe(true);
    });

    it('should generate alerts for high queue failure rate', async () => {
      vi.mocked(queueManager.getAllStats).mockResolvedValue([
        {
          name: 'analysis',
          waiting: 10,
          active: 5,
          completed: 50,
          failed: 20, // 40% failure rate
          delayed: 2,
          total: 87,
        },
      ]);

      const startTime = new Date();
      await service.takeSnapshot();
      const endTime = new Date();

      const report = await service.generatePerformanceReport(startTime, endTime);

      expect(report.alerts.some(a => a.metric === 'queue.failedJobs')).toBe(true);
    });
  });

  describe('snapshot storage', () => {
    it('should limit stored snapshots to maxSnapshots', async () => {
      // Create a new service with lower maxSnapshots for testing
      const testService = new MetricsAggregatorService();
      (testService as any).maxSnapshots = 3;

      await testService.takeSnapshot();
      await testService.takeSnapshot();
      await testService.takeSnapshot();
      await testService.takeSnapshot();
      await testService.takeSnapshot();

      expect((testService as any).snapshots.length).toBe(3);
    });
  });

  describe('singleton export', () => {
    it('should export a singleton instance', () => {
      expect(metricsAggregator).toBeDefined();
      expect(metricsAggregator).toBeInstanceOf(MetricsAggregatorService);
    });
  });
});
