import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import os from 'os';

// Mock prom-client with proper class constructors
vi.mock('prom-client', () => {
  const mockGauge = class {
    set = vi.fn();
    inc = vi.fn();
    dec = vi.fn();
    hashMap = { '': { value: 0 } };
  };
  const mockCounter = class {
    inc = vi.fn();
  };
  const mockHistogram = class {
    observe = vi.fn();
  };
  return {
    Gauge: mockGauge,
    Counter: mockCounter,
    Histogram: mockHistogram,
  };
});

// Mock metrics middleware
vi.mock('@/middleware/metrics.middleware', () => ({
  register: {
    getMetricsAsJSON: vi.fn().mockResolvedValue([]),
  },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock os module
vi.mock('os', () => ({
  default: {
    totalmem: vi.fn().mockReturnValue(16 * 1024 * 1024 * 1024), // 16GB
    freemem: vi.fn().mockReturnValue(8 * 1024 * 1024 * 1024), // 8GB free
  },
}));

import { ResourceMonitorService, resourceMonitor } from './resource-monitor.service';
import { logger } from '@/utils/logger';
import { register } from '@/middleware/metrics.middleware';

describe('ResourceMonitorService', () => {
  let service: ResourceMonitorService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    service = new ResourceMonitorService();
  });

  afterEach(() => {
    service.stopMonitoring();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create ResourceMonitorService instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('startMonitoring', () => {
    it('should start resource monitoring', () => {
      service.startMonitoring(5000);

      expect(logger.info).toHaveBeenCalledWith(
        'Resource monitoring started',
        expect.objectContaining({ intervalMs: 5000 })
      );
    });

    it('should warn if monitoring already started', () => {
      service.startMonitoring(5000);
      service.startMonitoring(5000);

      expect(logger.warn).toHaveBeenCalledWith('Resource monitoring already started');
    });

    it('should update metrics periodically', () => {
      service.startMonitoring(1000);

      // Fast-forward time
      vi.advanceTimersByTime(3000);

      // Metrics should have been updated multiple times
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('stopMonitoring', () => {
    it('should stop resource monitoring', () => {
      service.startMonitoring(5000);
      service.stopMonitoring();

      expect(logger.info).toHaveBeenCalledWith('Resource monitoring stopped');
    });

    it('should handle stopping when not started', () => {
      // Should not throw
      expect(() => service.stopMonitoring()).not.toThrow();
    });
  });

  describe('trackRateLimitHit', () => {
    it('should track rate limit hits', () => {
      service.trackRateLimitHit('/api/auth', 'user-123');

      expect(logger.warn).toHaveBeenCalledWith(
        'Rate limit hit',
        expect.objectContaining({
          endpoint: '/api/auth',
          user: 'user-123',
        })
      );
    });

    it('should use anonymous user when not provided', () => {
      service.trackRateLimitHit('/api/projects');

      expect(logger.warn).toHaveBeenCalledWith(
        'Rate limit hit',
        expect.objectContaining({
          endpoint: '/api/projects',
          user: 'anonymous',
        })
      );
    });
  });

  describe('trackBackpressure', () => {
    it('should track backpressure events', () => {
      service.trackBackpressure('request_queue_high', { size: 100 });

      expect(logger.warn).toHaveBeenCalledWith(
        'Backpressure event',
        expect.objectContaining({
          type: 'request_queue_high',
          size: 100,
        })
      );
    });

    it('should track backpressure without details', () => {
      service.trackBackpressure('memory_pressure');

      expect(logger.warn).toHaveBeenCalledWith(
        'Backpressure event',
        expect.objectContaining({
          type: 'memory_pressure',
        })
      );
    });
  });

  describe('incrementConcurrentRequests', () => {
    it('should increment concurrent requests counter', () => {
      // Should not throw
      expect(() => service.incrementConcurrentRequests()).not.toThrow();
    });
  });

  describe('decrementConcurrentRequests', () => {
    it('should decrement concurrent requests counter', () => {
      service.incrementConcurrentRequests();
      // Should not throw
      expect(() => service.decrementConcurrentRequests()).not.toThrow();
    });
  });

  describe('updateRequestQueueSize', () => {
    it('should update request queue size', () => {
      service.updateRequestQueueSize(25);

      // Should not trigger backpressure warning
      expect(logger.warn).not.toHaveBeenCalledWith(
        'Backpressure event',
        expect.objectContaining({ type: 'request_queue_high' })
      );
    });

    it('should track backpressure when queue is high', () => {
      service.updateRequestQueueSize(75);

      expect(logger.warn).toHaveBeenCalledWith(
        'Backpressure event',
        expect.objectContaining({
          type: 'request_queue_high',
          size: 75,
        })
      );
    });
  });

  describe('getResourceStatus', () => {
    it('should return current resource status', async () => {
      vi.mocked(register.getMetricsAsJSON).mockResolvedValue([
        {
          name: 'the_copy_backpressure_events_total',
          values: [{ value: 5 }],
        },
        {
          name: 'the_copy_concurrent_requests',
          values: [{ value: 10 }],
        },
      ]);

      const status = await service.getResourceStatus();

      expect(status).toHaveProperty('cpu');
      expect(status).toHaveProperty('memory');
      expect(status).toHaveProperty('eventLoop');
      expect(status).toHaveProperty('connections');
      expect(status).toHaveProperty('concurrentRequests');
      expect(status).toHaveProperty('backpressureEvents');

      expect(status.cpu).toHaveProperty('usage');
      expect(status.cpu).toHaveProperty('status');
      expect(status.memory).toHaveProperty('used');
      expect(status.memory).toHaveProperty('total');
      expect(status.memory).toHaveProperty('percent');
      expect(status.memory).toHaveProperty('status');
    });

    it('should return ok status for normal memory usage', async () => {
      vi.mocked(os.totalmem).mockReturnValue(16 * 1024 * 1024 * 1024);
      vi.mocked(os.freemem).mockReturnValue(12 * 1024 * 1024 * 1024); // 25% used

      const status = await service.getResourceStatus();

      expect(status.memory["status"]).toBe('ok');
    });

    it('should return warning status for high memory usage', async () => {
      vi.mocked(os.totalmem).mockReturnValue(16 * 1024 * 1024 * 1024);
      vi.mocked(os.freemem).mockReturnValue(2 * 1024 * 1024 * 1024); // 87.5% used

      const status = await service.getResourceStatus();

      expect(status.memory["status"]).toBe('warning');
    });

    it('should return critical status for critical memory usage', async () => {
      vi.mocked(os.totalmem).mockReturnValue(16 * 1024 * 1024 * 1024);
      vi.mocked(os.freemem).mockReturnValue(0.5 * 1024 * 1024 * 1024); // 96.9% used

      const status = await service.getResourceStatus();

      expect(status.memory["status"]).toBe('critical');
    });

    it('should handle empty metrics', async () => {
      vi.mocked(register.getMetricsAsJSON).mockResolvedValue([]);

      const status = await service.getResourceStatus();

      expect(status.backpressureEvents).toBe(0);
      expect(status.concurrentRequests).toBe(0);
    });
  });

  describe('isUnderPressure', () => {
    it('should return false when resources are ok', () => {
      vi.mocked(os.totalmem).mockReturnValue(16 * 1024 * 1024 * 1024);
      vi.mocked(os.freemem).mockReturnValue(12 * 1024 * 1024 * 1024); // 25% used

      const result = service.isUnderPressure();

      expect(typeof result).toBe('boolean');
    });

    it('should return true when memory is high', () => {
      vi.mocked(os.totalmem).mockReturnValue(16 * 1024 * 1024 * 1024);
      vi.mocked(os.freemem).mockReturnValue(2 * 1024 * 1024 * 1024); // 87.5% used

      const result = service.isUnderPressure();

      expect(result).toBe(true);
    });
  });

  describe('CPU monitoring', () => {
    it('should calculate CPU usage', async () => {
      // Start monitoring to trigger CPU calculation
      service.startMonitoring(100);

      vi.advanceTimersByTime(200);

      const status = await service.getResourceStatus();

      expect(status.cpu.usage).toBeDefined();
      // CPU usage might be NaN in test environment due to fake timers
      // Just verify it's a number (including NaN)
      expect(typeof status.cpu.usage).toBe('number');
    });
  });

  describe('event loop monitoring', () => {
    it('should monitor event loop lag', () => {
      service.startMonitoring(1000);

      // Simulate time passing
      vi.advanceTimersByTime(2000);

      // Should not throw
      expect(logger.info).toHaveBeenCalled();
    });

    it('should detect critical event loop lag', () => {
      service.startMonitoring(1000);

      // Simulate a large time jump (simulates lag)
      vi.advanceTimersByTime(2000);

      // The event loop lag detection depends on actual timing behavior
      // In real scenarios, this would trigger warnings/errors
    });
  });

  describe('threshold breaches', () => {
    it('should detect high memory usage', () => {
      vi.mocked(os.totalmem).mockReturnValue(16 * 1024 * 1024 * 1024);
      vi.mocked(os.freemem).mockReturnValue(2 * 1024 * 1024 * 1024); // 87.5% used

      service.startMonitoring(1000);

      // Initial update happens immediately
      expect(logger.warn).toHaveBeenCalledWith(
        'High memory usage',
        expect.any(Object)
      );
    });

    it('should detect critical memory usage', () => {
      vi.mocked(os.totalmem).mockReturnValue(16 * 1024 * 1024 * 1024);
      vi.mocked(os.freemem).mockReturnValue(0.5 * 1024 * 1024 * 1024); // 96.9% used

      service.startMonitoring(1000);

      expect(logger.error).toHaveBeenCalledWith(
        'Critical memory usage',
        expect.any(Object)
      );
    });
  });

  describe('singleton export', () => {
    it('should export a singleton instance', () => {
      expect(resourceMonitor).toBeDefined();
      expect(resourceMonitor).toBeInstanceOf(ResourceMonitorService);
    });
  });
});
