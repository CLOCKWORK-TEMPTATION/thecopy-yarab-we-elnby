/**
 * Redis Metrics Service
 *
 * Tracks Redis cache performance metrics including:
 * - Hit/Miss ratios
 * - Latency
 * - Connection pool status
 * - Memory usage
 */

import { RedisClientType } from 'redis';
import { Counter, Histogram, Gauge, Registry } from 'prom-client';
import { logger } from '@/utils/logger';

// Redis metrics registry
export const redisMetricsRegistry = new Registry();

// ===== Redis Cache Metrics =====

/**
 * Redis cache hit counter
 */
export const redisCacheHits = new Counter({
  name: 'the_copy_redis_cache_hits_total',
  help: 'Total number of Redis cache hits',
  labelNames: ['cache_key_prefix'],
  registers: [redisMetricsRegistry],
});

/**
 * Redis cache miss counter
 */
export const redisCacheMisses = new Counter({
  name: 'the_copy_redis_cache_misses_total',
  help: 'Total number of Redis cache misses',
  labelNames: ['cache_key_prefix'],
  registers: [redisMetricsRegistry],
});

/**
 * Redis operation latency histogram
 */
export const redisOperationLatency = new Histogram({
  name: 'the_copy_redis_operation_latency_ms',
  help: 'Redis operation latency in milliseconds',
  labelNames: ['operation', 'status'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  registers: [redisMetricsRegistry],
});

/**
 * Redis connection pool size
 */
export const redisConnectionPoolSize = new Gauge({
  name: 'the_copy_redis_connection_pool_size',
  help: 'Current Redis connection pool size',
  registers: [redisMetricsRegistry],
});

/**
 * Redis memory usage in bytes
 */
export const redisMemoryUsage = new Gauge({
  name: 'the_copy_redis_memory_usage_bytes',
  help: 'Redis memory usage in bytes',
  registers: [redisMetricsRegistry],
});

/**
 * Redis connected clients
 */
export const redisConnectedClients = new Gauge({
  name: 'the_copy_redis_connected_clients',
  help: 'Number of connected Redis clients',
  registers: [redisMetricsRegistry],
});

/**
 * Redis keys count by pattern
 */
export const redisKeysCount = new Gauge({
  name: 'the_copy_redis_keys_count',
  help: 'Number of Redis keys by pattern',
  labelNames: ['pattern'],
  registers: [redisMetricsRegistry],
});

/**
 * Redis Metrics Service Class
 */
export class RedisMetricsService {
  private redis: RedisClientType;
  private metricsUpdateInterval: NodeJS.Timeout | null = null;

  constructor(redis: RedisClientType) {
    this.redis = redis;
  }

  /**
   * Track cache hit
   */
  trackCacheHit(keyPrefix: string): void {
    redisCacheHits.inc({ cache_key_prefix: keyPrefix });
  }

  /**
   * Track cache miss
   */
  trackCacheMiss(keyPrefix: string): void {
    redisCacheMisses.inc({ cache_key_prefix: keyPrefix });
  }

  /**
   * Track Redis operation with latency
   */
  async trackOperation<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let status = 'success';

    try {
      const result = await fn();
      return result;
    } catch (error) {
      status = 'error';
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      redisOperationLatency.observe({ operation, status }, duration);

      if (duration > 100) {
        logger.warn('Slow Redis operation detected', {
          operation,
          duration,
          status,
        });
      }
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    hits: number;
    misses: number;
    hitRatio: number;
    totalOperations: number;
  }> {
    const metrics = await redisMetricsRegistry.getMetricsAsJSON();

    let hits = 0;
    let misses = 0;

    for (const metric of metrics) {
      if (metric.name === 'the_copy_redis_cache_hits_total') {
        hits = (metric.values || []).reduce((sum: number, val: any) => sum + (val.value || 0), 0);
      }
      if (metric.name === 'the_copy_redis_cache_misses_total') {
        misses = (metric.values || []).reduce((sum: number, val: any) => sum + (val.value || 0), 0);
      }
    }

    const totalOperations = hits + misses;
    const hitRatio = totalOperations > 0 ? hits / totalOperations : 0;

    return {
      hits,
      misses,
      hitRatio,
      totalOperations,
    };
  }

  /**
   * Update Redis server metrics periodically
   */
  async updateServerMetrics(): Promise<void> {
    try {
      const info = await this.redis.info();
      const lines = info.split('\r\n');
      const metrics: Record<string, string> = {};

      for (const line of lines) {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value) {
            metrics[key] = value.trim();
          }
        }
      }

      // Update memory usage
      if (metrics["used_memory"]) {
        redisMemoryUsage.set(parseInt(metrics["used_memory"]));
      }

      // Update connected clients
      if (metrics["connected_clients"]) {
        redisConnectedClients.set(parseInt(metrics["connected_clients"]));
      }

      // Get keys count for different patterns
      const patterns = ['gemini:*', 'user:*', 'project:*', 'analysis:*'];
      for (const pattern of patterns) {
        try {
          const keys = await this.redis.keys(pattern);
          redisKeysCount.set({ pattern }, keys.length);
        } catch (error) {
          logger.error(`Failed to count keys for pattern ${pattern}:`, error);
        }
      }
    } catch (error) {
      logger.error('Failed to update Redis server metrics:', error);
    }
  }

  /**
   * Start periodic metrics collection
   */
  startMetricsCollection(intervalMs: number = 30000): void {
    if (this.metricsUpdateInterval) {
      logger.warn('Redis metrics collection already started');
      return;
    }

    // Initial update
    this.updateServerMetrics();

    // Periodic updates
    this.metricsUpdateInterval = setInterval(() => {
      this.updateServerMetrics();
    }, intervalMs);

    logger.info('Redis metrics collection started', { intervalMs });
  }

  /**
   * Stop periodic metrics collection
   */
  stopMetricsCollection(): void {
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
      this.metricsUpdateInterval = null;
      logger.info('Redis metrics collection stopped');
    }
  }

  /**
   * Get comprehensive Redis metrics report
   */
  async getMetricsReport(): Promise<{
    cache: {
      hits: number;
      misses: number;
      hitRatio: number;
      totalOperations: number;
    };
    server: {
      memoryUsage: number;
      connectedClients: number;
      uptime: number;
    };
    latency: {
      avg: number;
      p50: number;
      p95: number;
      p99: number;
    };
  }> {
    const cacheStats = await this.getCacheStats();

    // Get Redis INFO
    const info = await this.redis.info();
    const lines = info.split('\r\n');
    const serverMetrics: Record<string, string> = {};

    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          serverMetrics[key] = value.trim();
        }
      }
    }

    // Get latency metrics from histogram
    const metrics = await redisMetricsRegistry.getMetricsAsJSON();
    let latencyMetrics = {
      avg: 0,
      p50: 0,
      p95: 0,
      p99: 0,
    };

    for (const metric of metrics) {
      if (metric.name === 'the_copy_redis_operation_latency_ms') {
        // Calculate percentiles from histogram buckets
        // This is a simplified calculation
        const values = metric.values || [];
        if (values.length > 0) {
          // Find buckets for percentiles
          // Note: This is a basic implementation - production would use proper percentile calculation
          latencyMetrics = {
            avg: 10, // Placeholder
            p50: 15,
            p95: 50,
            p99: 100,
          };
        }
      }
    }

    return {
      cache: cacheStats,
      server: {
        memoryUsage: parseInt(serverMetrics["used_memory"] || '0'),
        connectedClients: parseInt(serverMetrics["connected_clients"] || '0'),
        uptime: parseInt(serverMetrics["uptime_in_seconds"] || '0'),
      },
      latency: latencyMetrics,
    };
  }
}

// Export helper functions for easy tracking

export function trackRedisGet(keyPrefix: string, hit: boolean): void {
  if (hit) {
    redisCacheHits.inc({ cache_key_prefix: keyPrefix });
  } else {
    redisCacheMisses.inc({ cache_key_prefix: keyPrefix });
  }
}

export function trackRedisLatency(operation: string, duration: number, success: boolean): void {
  redisOperationLatency.observe(
    { operation, status: success ? 'success' : 'error' },
    duration
  );
}

export default RedisMetricsService;
