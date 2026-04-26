/**
 * Metrics Aggregator Service
 *
 * Aggregates metrics from all sources:
 * - Database metrics
 * - Redis metrics
 * - Queue metrics
 * - API latency
 * - Resource metrics
 * - Web Vitals
 */

import { logger } from '@/lib/logger';
import { register } from '@/middleware/metrics.middleware';
import { queueManager } from '@/queues/queue.config';

import { redisMetricsRegistry } from './redis-metrics.service';
import { resourceMonitor } from './resource-monitor.service';

interface PrometheusMetricValue {
  value?: number;
  metricName?: string;
  labels?: Record<string, string | number | undefined>;
}

interface PrometheusMetricJson {
  name: string;
  type?: string;
  help?: string;
  values?: PrometheusMetricValue[];
}

interface PrometheusRegistryLike {
  getMetricsAsJSON: () => Promise<unknown>;
}

interface ParsedPrometheusMetric {
  type?: string;
  help?: string;
  values: PrometheusMetricValue[];
}

type ParsedPrometheusMetrics = Record<string, ParsedPrometheusMetric>;

interface QueueMetricSummary {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

export interface MetricsSnapshot {
  timestamp: string;
  database: {
    totalQueries: number;
    avgQueryDuration: number;
    slowQueries: number;
    byTable: Record<string, { count: number; avgDuration: number }>;
  };
  redis: {
    hits: number;
    misses: number;
    hitRatio: number;
    avgLatency: number;
    memoryUsage: number;
    connectedClients: number;
  };
  queue: {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    throughput: number;
    avgProcessingTime: number;
    byQueue: Record<string, QueueMetricSummary>;
  };
  api: {
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    byEndpoint: Record<string, { count: number; avgDuration: number; errors: number }>;
  };
  resources: {
    cpu: { usage: number; status: string };
    memory: { used: number; total: number; percent: number; status: string };
    eventLoop: { lag: number; status: string };
    concurrentRequests: number;
    backpressureEvents: number;
  };
  gemini: {
    totalRequests: number;
    avgDuration: number;
    cacheHitRatio: number;
    errorRate: number;
  };
}

export interface PerformanceReport {
  period: {
    start: string;
    end: string;
    durationSeconds: number;
  };
  summary: {
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    cacheHitRatio: number;
    queueThroughput: number;
    systemHealth: 'healthy' | 'degraded' | 'critical';
  };
  recommendations: string[];
  alerts: {
    severity: 'info' | 'warning' | 'critical';
    message: string;
    metric: string;
    value: number;
    threshold: number;
  }[];
}

export class MetricsAggregatorService {
  private snapshots: MetricsSnapshot[] = [];
  private maxSnapshots = 1000; // Keep last 1000 snapshots (~8 hours at 30s interval)

  constructor() {}

  /**
   * Parse Prometheus metrics into structured data
   */
  private async parsePrometheusMetrics(
    registry: PrometheusRegistryLike
  ): Promise<ParsedPrometheusMetrics> {
    const metricsPayload = await registry.getMetricsAsJSON();
    const metrics = Array.isArray(metricsPayload) ? metricsPayload : [];
    const parsed: ParsedPrometheusMetrics = {};

    for (const metricPayload of metrics) {
      if (!this.isPrometheusMetricJson(metricPayload)) {
        continue;
      }

      const metric: ParsedPrometheusMetric = {
        values: metricPayload.values ?? [],
      };
      if (metricPayload.type !== undefined) {
        metric.type = metricPayload.type;
      }
      if (metricPayload.help !== undefined) {
        metric.help = metricPayload.help;
      }
      parsed[metricPayload.name] = metric;
    }

    return parsed;
  }

  private isPrometheusMetricJson(
    value: unknown
  ): value is PrometheusMetricJson {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { name?: unknown }).name === 'string'
    );
  }

  /**
   * Aggregate database metrics
   */
  private async aggregateDatabaseMetrics(
    parsed: ParsedPrometheusMetrics
  ): Promise<MetricsSnapshot['database']> {
    const dbMetrics = {
      totalQueries: 0,
      avgQueryDuration: 0,
      slowQueries: 0,
      byTable: {} as Record<string, { count: number; avgDuration: number }>,
    };

    // Get total queries
    const queriesMetric = parsed['the_copy_db_queries_total'];
    if (queriesMetric) {
      for (const value of queriesMetric.values) {
        dbMetrics.totalQueries += value.value ?? 0;

        const table = String(value.labels?.["table"] ?? 'unknown');
        if (!dbMetrics.byTable[table]) {
          dbMetrics.byTable[table] = { count: 0, avgDuration: 0 };
        }
        dbMetrics.byTable[table].count += value.value ?? 0;
      }
    }

    // Get query durations (from histogram)
    const durationMetric = parsed['the_copy_db_query_duration_ms'];
    if (durationMetric) {
      // Calculate average from histogram sum and count
      let totalDuration = 0;
      let totalCount = 0;

      for (const value of durationMetric.values) {
        if (value.metricName?.includes('sum')) {
          totalDuration += value.value ?? 0;
        }
        if (value.metricName?.includes('count')) {
          totalCount += value.value ?? 0;
        }
      }

      dbMetrics.avgQueryDuration = totalCount > 0 ? totalDuration / totalCount : 0;
    }

    return dbMetrics;
  }

  /**
   * Aggregate Redis metrics
   */
  private async aggregateRedisMetrics(): Promise<MetricsSnapshot['redis']> {
    const redisParsed = await this.parsePrometheusMetrics(redisMetricsRegistry);

    let hits = 0;
    let misses = 0;
    let memoryUsage = 0;
    let connectedClients = 0;

    const hitsMetric = redisParsed['the_copy_redis_cache_hits_total'];
    if (hitsMetric) {
      hits = hitsMetric.values.reduce((sum, val) => sum + (val.value ?? 0), 0);
    }

    const missesMetric = redisParsed['the_copy_redis_cache_misses_total'];
    if (missesMetric) {
      misses = missesMetric.values.reduce((sum, val) => sum + (val.value ?? 0), 0);
    }

    const memoryMetric = redisParsed['the_copy_redis_memory_usage_bytes'];
    if (memoryMetric?.values && memoryMetric.values.length > 0) {
      memoryUsage = memoryMetric.values[0]?.value ?? 0;
    }

    const clientsMetric = redisParsed['the_copy_redis_connected_clients'];
    if (clientsMetric?.values && clientsMetric.values.length > 0) {
      connectedClients = clientsMetric.values[0]?.value ?? 0;
    }

    const totalOperations = hits + misses;
    const hitRatio = totalOperations > 0 ? hits / totalOperations : 0;

    return {
      hits,
      misses,
      hitRatio,
      avgLatency: 0, // Would need to calculate from histogram
      memoryUsage,
      connectedClients,
    };
  }

  /**
   * Aggregate queue metrics
   */
  private async aggregateQueueMetrics(
    _parsed: ParsedPrometheusMetrics
  ): Promise<MetricsSnapshot['queue']> {
    const queueStats = await queueManager.getAllStats();

    let totalJobs = 0;
    let activeJobs = 0;
    let completedJobs = 0;
    let failedJobs = 0;

    const byQueue: Record<string, QueueMetricSummary> = {};

    for (const stats of queueStats) {
      totalJobs += stats.total;
      activeJobs += stats.active;
      completedJobs += stats.completed;
      failedJobs += stats.failed;

      byQueue[stats.name] = {
        waiting: stats.waiting,
        active: stats.active,
        completed: stats.completed,
        failed: stats.failed,
        delayed: stats.delayed,
        total: stats.total,
      };
    }

    return {
      totalJobs,
      activeJobs,
      completedJobs,
      failedJobs,
      throughput: 0, // Would need to calculate from time series
      avgProcessingTime: 0, // Would need to calculate from histogram
      byQueue,
    };
  }

  /**
   * Aggregate API metrics
   */
  private async aggregateApiMetrics(
    parsed: ParsedPrometheusMetrics
  ): Promise<MetricsSnapshot['api']> {
    const apiMetrics = {
      totalRequests: 0,
      avgResponseTime: 0,
      errorRate: 0,
      byEndpoint: {} as Record<string, { count: number; avgDuration: number; errors: number }>,
    };

    // Get HTTP requests
    const requestsMetric = parsed['the_copy_http_requests_total'];
    if (requestsMetric) {
      let totalErrors = 0;

      for (const value of requestsMetric.values) {
        apiMetrics.totalRequests += value.value ?? 0;

        const route = String(value.labels?.["route"] ?? 'unknown');
        const statusCode = parseInt(String(value.labels?.["status_code"] ?? '200'));

        if (!apiMetrics.byEndpoint[route]) {
          apiMetrics.byEndpoint[route] = { count: 0, avgDuration: 0, errors: 0 };
        }

        apiMetrics.byEndpoint[route].count += value.value ?? 0;

        if (statusCode >= 400) {
          apiMetrics.byEndpoint[route].errors += value.value ?? 0;
          totalErrors += value.value ?? 0;
        }
      }

      apiMetrics.errorRate = apiMetrics.totalRequests > 0 ? totalErrors / apiMetrics.totalRequests : 0;
    }

    // Get response time from histogram
    const durationMetric = parsed['the_copy_http_request_duration_ms'];
    if (durationMetric) {
      let totalDuration = 0;
      let totalCount = 0;

      for (const value of durationMetric.values) {
        if (value.metricName?.includes('sum')) {
          totalDuration += value.value ?? 0;
        }
        if (value.metricName?.includes('count')) {
          totalCount += value.value ?? 0;
        }
      }

      apiMetrics.avgResponseTime = totalCount > 0 ? totalDuration / totalCount : 0;
    }

    return apiMetrics;
  }

  /**
   * Aggregate Gemini API metrics
   */
  private async aggregateGeminiMetrics(
    parsed: ParsedPrometheusMetrics
  ): Promise<MetricsSnapshot['gemini']> {
    let totalRequests = 0;
    let cacheHits = 0;
    let cacheMisses = 0;
    let errors = 0;

    const requestsMetric = parsed['the_copy_gemini_requests_total'];
    if (requestsMetric) {
      for (const value of requestsMetric.values) {
        totalRequests += value.value ?? 0;
        if (value.labels?.["status"] === 'error') {
          errors += value.value ?? 0;
        }
      }
    }

    const cacheHitsMetric = parsed['the_copy_gemini_cache_hits_total'];
    if (cacheHitsMetric?.values && cacheHitsMetric.values.length > 0) {
      cacheHits = cacheHitsMetric.values[0]?.value ?? 0;
    }

    const cacheMissesMetric = parsed['the_copy_gemini_cache_misses_total'];
    if (cacheMissesMetric?.values && cacheMissesMetric.values.length > 0) {
      cacheMisses = cacheMissesMetric.values[0]?.value ?? 0;
    }

    const totalCacheOps = cacheHits + cacheMisses;
    const cacheHitRatio = totalCacheOps > 0 ? cacheHits / totalCacheOps : 0;

    const errorRate = totalRequests > 0 ? errors / totalRequests : 0;

    return {
      totalRequests,
      avgDuration: 0, // Would calculate from histogram
      cacheHitRatio,
      errorRate,
    };
  }

  /**
   * Take a snapshot of all metrics
   */
  async takeSnapshot(): Promise<MetricsSnapshot> {
    try {
      const parsed = await this.parsePrometheusMetrics(register);

      const [database, redis, queue, api, resources, gemini] = await Promise.all([
        this.aggregateDatabaseMetrics(parsed),
        this.aggregateRedisMetrics(),
        this.aggregateQueueMetrics(parsed),
        this.aggregateApiMetrics(parsed),
        resourceMonitor.getResourceStatus(),
        this.aggregateGeminiMetrics(parsed),
      ]);

      const snapshot: MetricsSnapshot = {
        timestamp: new Date().toISOString(),
        database,
        redis,
        queue,
        api,
        resources,
        gemini,
      };

      // Store snapshot
      this.snapshots.push(snapshot);

      // Trim old snapshots
      if (this.snapshots.length > this.maxSnapshots) {
        this.snapshots = this.snapshots.slice(-this.maxSnapshots);
      }

      return snapshot;
    } catch (error) {
      logger.error({ err: error }, 'Failed to take metrics snapshot');
      throw error;
    }
  }

  /**
   * Get latest snapshot
   */
  getLatestSnapshot(): MetricsSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] || null : null;
  }

  /**
   * Get snapshots for a time range
   */
  getSnapshotsInRange(startTime: Date, endTime: Date): MetricsSnapshot[] {
    return this.snapshots.filter((snapshot) => {
      const timestamp = new Date(snapshot.timestamp);
      return timestamp >= startTime && timestamp <= endTime;
    });
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(
    startTime: Date,
    endTime: Date
  ): Promise<PerformanceReport> {
    const snapshots = this.getSnapshotsInRange(startTime, endTime);

    if (snapshots.length === 0) {
      throw new Error('No metrics data available for the specified time range');
    }

    const latest = snapshots[snapshots.length - 1];

    if (!latest) {
      throw new Error('No valid metrics data available');
    }

    // Calculate summary
    const totalRequests = latest.api.totalRequests;
    const avgResponseTime = latest.api.avgResponseTime;
    const errorRate = latest.api.errorRate;
    const cacheHitRatio = latest.redis.hitRatio;
    const queueThroughput = latest.queue.throughput;

    // Determine system health
    let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (
      latest.resources.cpu.status === 'critical' ||
      latest.resources.memory.status === 'critical' ||
      errorRate > 0.1
    ) {
      systemHealth = 'critical';
    } else if (
      latest.resources.cpu.status === 'warning' ||
      latest.resources.memory.status === 'warning' ||
      errorRate > 0.05
    ) {
      systemHealth = 'degraded';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    const alerts: PerformanceReport['alerts'] = [];

    if (cacheHitRatio < 0.7) {
      recommendations.push('Consider increasing cache TTL or optimizing cache keys to improve hit ratio');
      alerts.push({
        severity: 'warning',
        message: 'Low cache hit ratio detected',
        metric: 'redis.hitRatio',
        value: cacheHitRatio,
        threshold: 0.7,
      });
    }

    if (avgResponseTime > 500) {
      recommendations.push('API response time is high. Consider optimizing database queries or adding caching');
      alerts.push({
        severity: 'warning',
        message: 'High API response time',
        metric: 'api.avgResponseTime',
        value: avgResponseTime,
        threshold: 500,
      });
    }

    if (latest.resources.cpu.usage > 70) {
      recommendations.push('High CPU usage detected. Consider scaling horizontally or optimizing CPU-intensive operations');
      alerts.push({
        severity: latest.resources.cpu.usage > 90 ? 'critical' : 'warning',
        message: 'High CPU usage',
        metric: 'resources.cpu.usage',
        value: latest.resources.cpu.usage,
        threshold: 70,
      });
    }

    if (latest.resources.memory.percent > 80) {
      recommendations.push('High memory usage. Consider optimizing memory usage or increasing server memory');
      alerts.push({
        severity: latest.resources.memory.percent > 95 ? 'critical' : 'warning',
        message: 'High memory usage',
        metric: 'resources.memory.percent',
        value: latest.resources.memory.percent,
        threshold: 80,
      });
    }

    if (latest.queue.failedJobs > latest.queue.completedJobs * 0.1) {
      recommendations.push('High queue failure rate. Review failed job logs and implement better error handling');
      alerts.push({
        severity: 'warning',
        message: 'High queue failure rate',
        metric: 'queue.failedJobs',
        value: latest.queue.failedJobs,
        threshold: latest.queue.completedJobs * 0.1,
      });
    }

    return {
      period: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        durationSeconds: (endTime.getTime() - startTime.getTime()) / 1000,
      },
      summary: {
        totalRequests,
        avgResponseTime,
        errorRate,
        cacheHitRatio,
        queueThroughput,
        systemHealth,
      },
      recommendations,
      alerts,
    };
  }
}

export const metricsAggregator = new MetricsAggregatorService();
export default metricsAggregator;
