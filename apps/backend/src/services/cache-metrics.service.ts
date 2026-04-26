/**
 * Cache Metrics Service
 *
 * Provides advanced metrics and monitoring for cache performance
 * Works with both Redis and memory cache layers
 */

import { cacheService } from './cache.service';
import { getGeminiCacheStats } from './gemini-cache.strategy';
import { logger } from '@/lib/logger';

export interface CacheMetricsSnapshot {
  timestamp: Date;
  overall: {
    hitRate: number;
    totalHits: number;
    totalMisses: number;
    totalRequests: number;
    l1HitRate: number;
    l2HitRate: number;
  };
  memory: {
    size: number;
    maxSize: number;
    utilizationPercent: number;
  };
  redis: {
    status: string;
    connectionHealth: {
      status: string;
      lastCheck: number;
      consecutiveFailures: number;
    };
  };
  gemini: {
    hitRate: number;
    totalHits: number;
    totalMisses: number;
  };
  performance: {
    avgGetLatency: number;
    avgSetLatency: number;
    errors: number;
  };
}

export interface CachePerformanceReport {
  startTime: Date;
  endTime: Date;
  duration: number;
  snapshots: CacheMetricsSnapshot[];
  summary: {
    avgHitRate: number;
    peakHitRate: number;
    lowestHitRate: number;
    totalRequests: number;
    totalErrors: number;
    redisUptime: number;
  };
}

class CacheMetricsService {
  private snapshots: CacheMetricsSnapshot[] = [];
  private readonly MAX_SNAPSHOTS = 1000; // Keep last 1000 snapshots
  private latencyTracking = {
    get: [] as number[],
    set: [] as number[],
  };
  private readonly MAX_LATENCY_SAMPLES = 100;

  /**
   * Take a snapshot of current cache metrics
   */
  async takeSnapshot(): Promise<CacheMetricsSnapshot> {
    const stats = cacheService.getStats();
    const geminiStats = await getGeminiCacheStats();

    const totalRequests = stats.metrics.hits.total + stats.metrics.misses;
    const hitRate = totalRequests > 0 ? (stats.metrics.hits.total / totalRequests) * 100 : 0;

    const l1HitRate = totalRequests > 0 ? (stats.metrics.hits.l1 / totalRequests) * 100 : 0;
    const l2HitRate = totalRequests > 0 ? (stats.metrics.hits.l2 / totalRequests) * 100 : 0;

    const snapshot: CacheMetricsSnapshot = {
      timestamp: new Date(),
      overall: {
        hitRate: Math.round(hitRate * 100) / 100,
        totalHits: stats.metrics.hits.total,
        totalMisses: stats.metrics.misses,
        totalRequests,
        l1HitRate: Math.round(l1HitRate * 100) / 100,
        l2HitRate: Math.round(l2HitRate * 100) / 100,
      },
      memory: {
        size: stats.memorySize,
        maxSize: 100, // From CacheService.MAX_MEMORY_CACHE_SIZE
        utilizationPercent: Math.round((stats.memorySize / 100) * 100),
      },
      redis: {
        status: stats.redisStatus,
        connectionHealth: stats.metrics.redisConnectionHealth,
      },
      gemini: {
        hitRate: geminiStats.hitRate,
        totalHits: geminiStats.totalHits,
        totalMisses: geminiStats.totalMisses,
      },
      performance: {
        avgGetLatency: this.calculateAvgLatency('get'),
        avgSetLatency: this.calculateAvgLatency('set'),
        errors: stats.metrics.errors,
      },
    };

    // Store snapshot
    this.snapshots.push(snapshot);

    // Keep only last MAX_SNAPSHOTS
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Get latest snapshot
   */
  getLatestSnapshot(): CacheMetricsSnapshot | null {
    return this.snapshots.length === 0 ? null : this.snapshots[this.snapshots.length - 1] || null;
  }

  /**
   * Get snapshots within a time range
   */
  getSnapshotsInRange(startTime: Date, endTime: Date): CacheMetricsSnapshot[] {
    return this.snapshots.filter(
      (snapshot) =>
        snapshot.timestamp >= startTime && snapshot.timestamp <= endTime
    );
  }

  /**
   * Generate performance report for a time range
   */
  async generatePerformanceReport(
    startTime: Date,
    endTime: Date
  ): Promise<CachePerformanceReport> {
    const snapshots = this.getSnapshotsInRange(startTime, endTime);

    if (snapshots.length === 0) {
      // Take a snapshot now if no data in range
      const snapshot = await this.takeSnapshot();
      snapshots.push(snapshot);
    }

    const hitRates = snapshots.map((s) => s.overall.hitRate);
    const avgHitRate =
      hitRates.reduce((sum, rate) => sum + rate, 0) / hitRates.length;
    const peakHitRate = Math.max(...hitRates);
    const lowestHitRate = Math.min(...hitRates);

    const totalRequests = snapshots.reduce(
      (sum, s) => sum + s.overall.totalRequests,
      0
    );
    const totalErrors = snapshots.reduce(
      (sum, s) => sum + s.performance.errors,
      0
    );

    // Calculate Redis uptime percentage
    const redisConnectedSnapshots = snapshots.filter(
      (s) => s.redis["status"] === 'ready' || s.redis["status"] === 'connected'
    );
    const redisUptime =
      snapshots.length > 0
        ? (redisConnectedSnapshots.length / snapshots.length) * 100
        : 0;

    return {
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      snapshots,
      summary: {
        avgHitRate: Math.round(avgHitRate * 100) / 100,
        peakHitRate: Math.round(peakHitRate * 100) / 100,
        lowestHitRate: Math.round(lowestHitRate * 100) / 100,
        totalRequests,
        totalErrors,
        redisUptime: Math.round(redisUptime * 100) / 100,
      },
    };
  }

  /**
   * Track latency for cache operations
   */
  trackLatency(operation: 'get' | 'set', latency: number): void {
    this.latencyTracking[operation].push(latency);

    // Keep only last MAX_LATENCY_SAMPLES
    if (this.latencyTracking[operation].length > this.MAX_LATENCY_SAMPLES) {
      this.latencyTracking[operation].shift();
    }
  }

  /**
   * Calculate average latency for an operation
   */
  private calculateAvgLatency(operation: 'get' | 'set'): number {
    const samples = this.latencyTracking[operation];
    if (samples.length === 0) {
      return 0;
    }

    const sum = samples.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / samples.length) * 100) / 100;
  }

  /**
   * Get cache health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    const snapshot = await this.takeSnapshot();
    const issues: string[] = [];
    const recommendations: string[] = [];

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

    // Check hit rate
    if (snapshot.overall.hitRate < 30) {
      status = 'critical';
      issues.push('Hit rate is critically low (< 30%)');
      recommendations.push('Review cache TTL settings and cache warming strategies');
    } else if (snapshot.overall.hitRate < 50) {
      status = 'degraded';
      issues.push('Hit rate is below optimal (< 50%)');
      recommendations.push('Consider adjusting cache TTL or warming frequently accessed data');
    }

    // Check Redis connection
    if (snapshot.redis["status"] !== 'ready' && snapshot.redis["status"] !== 'connected') {
      if (status !== 'critical') {
        status = 'degraded';
      }
      issues.push('Redis connection is not healthy');
      recommendations.push('Check Redis server status and connection settings');
    }

    // Check consecutive failures
    if (snapshot.redis.connectionHealth.consecutiveFailures > 5) {
      status = 'critical';
      issues.push('Redis has consecutive connection failures');
      recommendations.push('Investigate Redis server issues or network connectivity');
    }

    // Check memory utilization
    if (snapshot.memory.utilizationPercent > 90) {
      if (status !== 'critical') {
        status = 'degraded';
      }
      issues.push('Memory cache is near capacity');
      recommendations.push('Consider increasing MAX_MEMORY_CACHE_SIZE or implementing more aggressive eviction');
    }

    // Check error rate
    if (snapshot.performance.errors > 100) {
      status = 'critical';
      issues.push('High number of cache errors detected');
      recommendations.push('Review logs for error patterns and resolve underlying issues');
    }

    return { status, issues, recommendations };
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.snapshots = [];
    this.latencyTracking = {
      get: [],
      set: [],
    };
    cacheService.resetMetrics();
    logger.info('Cache metrics reset');
  }

  /**
   * Get real-time cache statistics
   */
  getRealTimeStats(): {
    memorySize: number;
    redisStatus: string;
    hitRate: number;
    metrics: {
      hits: { l1: number; l2: number; total: number };
      misses: number;
      sets: number;
      deletes: number;
      errors: number;
      redisConnectionHealth: {
        status: 'connected' | 'disconnected' | 'error';
        lastCheck: number;
        consecutiveFailures: number;
      };
    };
  } {
    const stats = cacheService.getStats();
    return {
      memorySize: stats.memorySize,
      redisStatus: stats.redisStatus,
      hitRate: stats.hitRate,
      metrics: stats.metrics,
    };
  }
}

// Export singleton instance
export const cacheMetricsService = new CacheMetricsService();
