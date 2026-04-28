/**
 * Metrics Controller Helpers
 *
 * Extracted from metrics.controller.ts to reduce file size.
 * Contains dashboard summary builder, health status determination,
 * snapshot helpers, date range parsing, and APM alert building.
 */

import {
  getPerformanceDashboard,
  resetPerformanceMetrics,
  APM_CONFIG,
} from "@/config/sentry";
import { cacheMetricsService } from "@/services/cache-metrics.service";
import { metricsAggregator } from "@/services/metrics-aggregator.service";
import { resourceMonitor } from "@/services/resource-monitor.service";

// Re-export APM items so the controller can import from one place
export { getPerformanceDashboard, resetPerformanceMetrics, APM_CONFIG };

/**
 * Determine overall health status from resource status and snapshot.
 * Extracted to reduce cyclomatic complexity of getHealth.
 */
export function determineHealthStatus(
  resources: { cpu: { status: string }; memory: { status: string } },
  snapshot: { api: { errorRate: number } } | null,
): "healthy" | "degraded" | "critical" {
  if (
    resources.cpu.status === "critical" ||
    resources.memory.status === "critical"
  ) {
    return "critical";
  }

  const resourceDegraded =
    resources.cpu.status === "warning" || resources.memory.status === "warning";

  if (snapshot && snapshot.api.errorRate > 0.1) {
    return "critical";
  }

  if (snapshot && snapshot.api.errorRate > 0.05) {
    return "degraded";
  }

  return resourceDegraded ? "degraded" : "healthy";
}

/**
 * Build the dashboard summary object.
 */
export async function buildDashboardSummary() {
  const snapshot = await metricsAggregator.takeSnapshot();
  const resources = await resourceMonitor.getResourceStatus();

  return {
    timestamp: snapshot.timestamp,
    overview: {
      totalRequests: snapshot.api.totalRequests,
      avgResponseTime: snapshot.api.avgResponseTime,
      errorRate: snapshot.api.errorRate,
      activeJobs: snapshot.queue.activeJobs,
      cacheHitRatio: snapshot.redis.hitRatio,
    },
    database: {
      totalQueries: snapshot.database.totalQueries,
      avgDuration: snapshot.database.avgQueryDuration,
      slowQueries: snapshot.database.slowQueries,
    },
    redis: {
      hitRatio: snapshot.redis.hitRatio,
      hits: snapshot.redis.hits,
      misses: snapshot.redis.misses,
      memoryUsage: snapshot.redis.memoryUsage,
    },
    queue: {
      total: snapshot.queue.totalJobs,
      active: snapshot.queue.activeJobs,
      completed: snapshot.queue.completedJobs,
      failed: snapshot.queue.failedJobs,
    },
    resources: {
      cpu: resources.cpu,
      memory: resources.memory,
      concurrentRequests: resources.concurrentRequests,
    },
    gemini: {
      totalRequests: snapshot.gemini.totalRequests,
      avgDuration: snapshot.gemini.avgDuration,
      cacheHitRatio: snapshot.gemini.cacheHitRatio,
      errorRate: snapshot.gemini.errorRate,
    },
  };
}

/**
 * Get a snapshot property, falling back to a new snapshot when none exists.
 * Eliminates repeated pattern across multiple endpoints.
 */
export async function getSnapshotData<K extends string>(key?: K) {
  const snapshot = metricsAggregator.getLatestSnapshot();

  if (!snapshot) {
    const newSnapshot = await metricsAggregator.takeSnapshot();
    return key
      ? (newSnapshot as unknown as Record<string, unknown>)[key]
      : newSnapshot;
  }

  return key ? (snapshot as unknown as Record<string, unknown>)[key] : snapshot;
}

/**
 * Parse start/end query params into Date objects.
 * Returns null when inputs are absent or invalid.
 */
export function parseDateRange(
  start: unknown,
  end: unknown,
):
  | { startTime: Date; endTime: Date }
  | { error: "missing" }
  | { error: "invalid" } {
  if (!start || !end) {
    return { error: "missing" };
  }

  const startTime = new Date(start as string);
  const endTime = new Date(end as string);

  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return { error: "invalid" };
  }

  return { startTime, endTime };
}

/**
 * Default date range (last hour) for reports.
 */
export function defaultDateRange(): { startTime: Date; endTime: Date } {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
  return { startTime, endTime };
}

/**
 * Build health data payload.
 */
export async function buildHealthData() {
  const resources = await resourceMonitor.getResourceStatus();
  const snapshot = metricsAggregator.getLatestSnapshot();
  const status = determineHealthStatus(resources, snapshot);
  const isUnderPressure = resourceMonitor.isUnderPressure();

  return {
    status,
    isUnderPressure,
    timestamp: new Date().toISOString(),
    resources,
    metrics: snapshot
      ? {
          errorRate: snapshot.api.errorRate,
          avgResponseTime: snapshot.api.avgResponseTime,
          cacheHitRatio: snapshot.redis.hitRatio,
          activeJobs: snapshot.queue.activeJobs,
        }
      : null,
  };
}

/**
 * Build APM alerts payload.
 */
export function buildApmAlerts() {
  const dashboard = getPerformanceDashboard();

  return {
    current: dashboard.alerts,
    thresholds: {
      p95Latency: APM_CONFIG.thresholds.apiResponse,
      errorRate: APM_CONFIG.errorRateThreshold,
      geminiLatency: APM_CONFIG.thresholds.geminiCall,
      dbLatency: APM_CONFIG.thresholds.dbQuery,
      redisLatency: APM_CONFIG.thresholds.redisOperation,
    },
    metrics: {
      p95Latency: dashboard.latencies.p95,
      errorRate: dashboard.summary.errorRate,
    },
    status:
      dashboard.alerts.p95AboveThreshold ||
      dashboard.alerts.errorRateAboveThreshold
        ? ("warning" as const)
        : ("ok" as const),
  };
}

/**
 * Build APM config payload.
 */
export function buildApmConfig() {
  return {
    thresholds: APM_CONFIG.thresholds,
    errorRateThreshold: APM_CONFIG.errorRateThreshold,
    sampleRates: {
      traces: APM_CONFIG.tracesSampleRate,
      profiles: APM_CONFIG.profilesSampleRate,
    },
  };
}

/**
 * Generate a cache performance report for the given date range.
 */
export function generateCacheReport(startTime: Date, endTime: Date) {
  return cacheMetricsService.generatePerformanceReport(startTime, endTime);
}

/**
 * Generate a metrics performance report for the given date range.
 */
export async function generateMetricsReport(startTime: Date, endTime: Date) {
  return metricsAggregator.generatePerformanceReport(startTime, endTime);
}
