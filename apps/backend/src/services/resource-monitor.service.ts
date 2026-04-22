/**
 * Resource Monitor Service
 *
 * Monitors system resources and detects backpressure, rate limits, and bottlenecks
 */

import { Gauge, Counter, Histogram } from 'prom-client';
import { logger } from '@/utils/logger';
import { register } from '@/middleware/metrics.middleware';
import os from 'os';

// ===== Resource Monitoring Metrics =====

/**
 * System CPU usage percentage
 */
export const systemCpuUsage = new Gauge({
  name: 'the_copy_system_cpu_usage_percent',
  help: 'System CPU usage percentage',
  registers: [register],
});

/**
 * System memory usage
 */
export const systemMemoryUsage = new Gauge({
  name: 'the_copy_system_memory_usage_bytes',
  help: 'System memory usage in bytes',
  labelNames: ['type'],
  registers: [register],
});

/**
 * Node.js event loop lag
 */
export const eventLoopLag = new Histogram({
  name: 'the_copy_event_loop_lag_ms',
  help: 'Node.js event loop lag in milliseconds',
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  registers: [register],
});

/**
 * Active connections gauge
 */
export const activeConnectionsGauge = new Gauge({
  name: 'the_copy_active_connections',
  help: 'Number of active connections',
  labelNames: ['type'],
  registers: [register],
});

/**
 * Request queue size (backpressure indicator)
 */
export const requestQueueSize = new Gauge({
  name: 'the_copy_request_queue_size',
  help: 'Number of requests in queue (backpressure indicator)',
  registers: [register],
});

/**
 * Rate limit hits counter
 */
export const rateLimitHits = new Counter({
  name: 'the_copy_rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint', 'user'],
  registers: [register],
});

/**
 * Backpressure events counter
 */
export const backpressureEvents = new Counter({
  name: 'the_copy_backpressure_events_total',
  help: 'Total number of backpressure events',
  labelNames: ['type'],
  registers: [register],
});

/**
 * Resource threshold breaches counter
 */
export const resourceThresholdBreaches = new Counter({
  name: 'the_copy_resource_threshold_breaches_total',
  help: 'Total number of resource threshold breaches',
  labelNames: ['resource', 'threshold'],
  registers: [register],
});

/**
 * Concurrent requests gauge
 */
export const concurrentRequests = new Gauge({
  name: 'the_copy_concurrent_requests',
  help: 'Current number of concurrent requests being processed',
  registers: [register],
});

/**
 * Resource Monitor Service Class
 */
export class ResourceMonitorService {
  private monitorInterval: NodeJS.Timeout | null = null;
  private eventLoopMonitor: NodeJS.Timeout | null = null;
  private lastCpuUsage = process.cpuUsage();
  private lastUpdateTime = Date.now();

  // Thresholds
  private readonly thresholds = {
    cpu: {
      warning: 70,
      critical: 90,
    },
    memory: {
      warning: 80,
      critical: 95,
    },
    eventLoopLag: {
      warning: 100,
      critical: 500,
    },
    concurrentRequests: {
      warning: 100,
      critical: 200,
    },
  };

  constructor() {}

  /**
   * Calculate CPU usage percentage
   */
  private calculateCpuUsage(): number {
    const currentCpuUsage = process.cpuUsage();
    const currentTime = Date.now();

    const userUsed = currentCpuUsage.user - this.lastCpuUsage.user;
    const systemUsed = currentCpuUsage.system - this.lastCpuUsage.system;
    const totalUsed = userUsed + systemUsed;

    const timeDiff = (currentTime - this.lastUpdateTime) * 1000; // Convert to microseconds
    const cpuPercent = (totalUsed / timeDiff) * 100;

    this.lastCpuUsage = currentCpuUsage;
    this.lastUpdateTime = currentTime;

    return Math.min(cpuPercent, 100);
  }

  /**
   * Monitor event loop lag
   */
  private startEventLoopMonitoring(): void {
    const checkInterval = 1000;
    let lastCheck = Date.now();

    this.eventLoopMonitor = setInterval(() => {
      const now = Date.now();
      const lag = now - lastCheck - checkInterval;

      eventLoopLag.observe(Math.max(0, lag));

      if (lag > this.thresholds.eventLoopLag.critical) {
        logger.error('Critical event loop lag detected', { lag });
        backpressureEvents.inc({ type: 'event_loop_lag_critical' });
        resourceThresholdBreaches.inc({ resource: 'event_loop', threshold: 'critical' });
      } else if (lag > this.thresholds.eventLoopLag.warning) {
        logger.warn('Event loop lag warning', { lag });
        resourceThresholdBreaches.inc({ resource: 'event_loop', threshold: 'warning' });
      }

      lastCheck = Date.now();
    }, checkInterval);
  }

  /**
   * Update system metrics
   */
  private updateSystemMetrics(): void {
    try {
      // CPU Usage
      const cpuUsage = this.calculateCpuUsage();
      systemCpuUsage.set(cpuUsage);

      if (cpuUsage > this.thresholds.cpu.critical) {
        logger.error('Critical CPU usage', { cpuUsage });
        backpressureEvents.inc({ type: 'cpu_critical' });
        resourceThresholdBreaches.inc({ resource: 'cpu', threshold: 'critical' });
      } else if (cpuUsage > this.thresholds.cpu.warning) {
        logger.warn('High CPU usage', { cpuUsage });
        resourceThresholdBreaches.inc({ resource: 'cpu', threshold: 'warning' });
      }

      // Memory Usage
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryPercent = (usedMemory / totalMemory) * 100;

      systemMemoryUsage.set({ type: 'used' }, usedMemory);
      systemMemoryUsage.set({ type: 'free' }, freeMemory);
      systemMemoryUsage.set({ type: 'total' }, totalMemory);

      if (memoryPercent > this.thresholds.memory.critical) {
        logger.error('Critical memory usage', { memoryPercent, usedMemory, totalMemory });
        backpressureEvents.inc({ type: 'memory_critical' });
        resourceThresholdBreaches.inc({ resource: 'memory', threshold: 'critical' });
      } else if (memoryPercent > this.thresholds.memory.warning) {
        logger.warn('High memory usage', { memoryPercent, usedMemory, totalMemory });
        resourceThresholdBreaches.inc({ resource: 'memory', threshold: 'warning' });
      }

      // Process Memory
      const processMemory = process.memoryUsage();
      systemMemoryUsage.set({ type: 'heap_used' }, processMemory.heapUsed);
      systemMemoryUsage.set({ type: 'heap_total' }, processMemory.heapTotal);
      systemMemoryUsage.set({ type: 'external' }, processMemory.external);
      systemMemoryUsage.set({ type: 'rss' }, processMemory.rss);
    } catch (error) {
      logger.error('Failed to update system metrics:', error);
    }
  }

  /**
   * Track rate limit hit
   */
  trackRateLimitHit(endpoint: string, user: string = 'anonymous'): void {
    rateLimitHits.inc({ endpoint, user });
    logger.warn('Rate limit hit', { endpoint, user });
  }

  /**
   * Track backpressure event
   */
  trackBackpressure(type: string, details?: Record<string, any>): void {
    backpressureEvents.inc({ type });
    logger.warn('Backpressure event', { type, ...details });
  }

  /**
   * Track concurrent request
   */
  incrementConcurrentRequests(): void {
    concurrentRequests.inc();

    const current = (concurrentRequests as any)?.hashMap?.['']?.value || 0;
    if (current > this.thresholds.concurrentRequests.critical) {
      this.trackBackpressure('concurrent_requests_critical', { count: current });
      resourceThresholdBreaches.inc({ resource: 'concurrent_requests', threshold: 'critical' });
    } else if (current > this.thresholds.concurrentRequests.warning) {
      resourceThresholdBreaches.inc({ resource: 'concurrent_requests', threshold: 'warning' });
    }
  }

  /**
   * Decrement concurrent request
   */
  decrementConcurrentRequests(): void {
    concurrentRequests.dec();
  }

  /**
   * Update request queue size
   */
  updateRequestQueueSize(size: number): void {
    requestQueueSize.set(size);

    if (size > 50) {
      this.trackBackpressure('request_queue_high', { size });
    }
  }

  /**
   * Get current resource status
   */
  async getResourceStatus(): Promise<{
    cpu: { usage: number; status: 'ok' | 'warning' | 'critical' };
    memory: {
      used: number;
      total: number;
      percent: number;
      status: 'ok' | 'warning' | 'critical';
    };
    eventLoop: { lag: number; status: 'ok' | 'warning' | 'critical' };
    connections: number;
    concurrentRequests: number;
    backpressureEvents: number;
  }> {
    const cpuUsage = this.calculateCpuUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryPercent = (usedMemory / totalMemory) * 100;

    const getCpuStatus = (usage: number) => {
      if (usage > this.thresholds.cpu.critical) return 'critical';
      if (usage > this.thresholds.cpu.warning) return 'warning';
      return 'ok';
    };

    const getMemoryStatus = (percent: number) => {
      if (percent > this.thresholds.memory.critical) return 'critical';
      if (percent > this.thresholds.memory.warning) return 'warning';
      return 'ok';
    };

    // Get metrics from registry
    const metrics = await register.getMetricsAsJSON();
    let backpressureCount = 0;
    let concurrentReqs = 0;

    for (const metric of metrics) {
      if (metric.name === 'the_copy_backpressure_events_total') {
        backpressureCount = (metric.values || []).reduce((sum: number, val: any) => sum + (val.value || 0), 0);
      }
      if (metric.name === 'the_copy_concurrent_requests') {
        concurrentReqs = (metric.values && metric.values[0])?.value || 0;
      }
    }

    return {
      cpu: {
        usage: cpuUsage,
        status: getCpuStatus(cpuUsage),
      },
      memory: {
        used: usedMemory,
        total: totalMemory,
        percent: memoryPercent,
        status: getMemoryStatus(memoryPercent),
      },
      eventLoop: {
        lag: 0, // Would need to track this separately
        status: 'ok',
      },
      connections: 0, // Would be tracked by HTTP middleware
      concurrentRequests: concurrentReqs,
      backpressureEvents: backpressureCount,
    };
  }

  /**
   * Start resource monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitorInterval) {
      logger.warn('Resource monitoring already started');
      return;
    }

    // Initial update
    this.updateSystemMetrics();

    // Periodic updates
    this.monitorInterval = setInterval(() => {
      this.updateSystemMetrics();
    }, intervalMs);

    // Start event loop monitoring
    this.startEventLoopMonitoring();

    logger.info('Resource monitoring started', { intervalMs });
  }

  /**
   * Stop resource monitoring
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    if (this.eventLoopMonitor) {
      clearInterval(this.eventLoopMonitor);
      this.eventLoopMonitor = null;
    }

    logger.info('Resource monitoring stopped');
  }

  /**
   * Check if system is under pressure
   */
  isUnderPressure(): boolean {
    const cpuUsage = (systemCpuUsage as any)?.hashMap?.['']?.value || 0;
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryPercent = ((totalMemory - freeMemory) / totalMemory) * 100;

    return (
      cpuUsage > this.thresholds.cpu.warning ||
      memoryPercent > this.thresholds.memory.warning
    );
  }
}

export const resourceMonitor = new ResourceMonitorService();
export default resourceMonitor;
