/**
 * Prometheus Metrics for Performance Monitoring
 *
 * Tracks custom application metrics
 */

import { Request, Response, NextFunction } from "express";
import {
  Counter,
  Histogram,
  Gauge,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

import { logger } from "@/lib/logger";

// Create a custom registry
export const register = new Registry();

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({
  register,
  prefix: "the_copy_",
  labels: { app: "the-copy-backend" },
});

// ===== HTTP Metrics =====

/**
 * HTTP request counter
 */
export const httpRequestsTotal = new Counter({
  name: "the_copy_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

/**
 * HTTP request duration histogram
 */
export const httpRequestDurationMs = new Histogram({
  name: "the_copy_http_request_duration_ms",
  help: "Duration of HTTP requests in milliseconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000],
  registers: [register],
});

/**
 * Active HTTP connections
 */
export const httpActiveConnections = new Gauge({
  name: "the_copy_http_active_connections",
  help: "Number of active HTTP connections",
  registers: [register],
});

// ===== Gemini AI Metrics =====

/**
 * Gemini API request counter
 */
export const geminiRequestsTotal = new Counter({
  name: "the_copy_gemini_requests_total",
  help: "Total number of Gemini API requests",
  labelNames: ["status", "analysis_type"],
  registers: [register],
});

/**
 * Gemini API request duration
 */
export const geminiRequestDurationMs = new Histogram({
  name: "the_copy_gemini_request_duration_ms",
  help: "Duration of Gemini API requests in milliseconds",
  labelNames: ["analysis_type"],
  buckets: [500, 1000, 2000, 5000, 10000, 30000, 60000],
  registers: [register],
});

/**
 * Gemini cache hit rate
 */
export const geminiCacheHits = new Counter({
  name: "the_copy_gemini_cache_hits_total",
  help: "Total number of Gemini cache hits",
  registers: [register],
});

export const geminiCacheMisses = new Counter({
  name: "the_copy_gemini_cache_misses_total",
  help: "Total number of Gemini cache misses",
  registers: [register],
});

// ===== Database Metrics =====

/**
 * Database query counter
 */
export const dbQueriesTotal = new Counter({
  name: "the_copy_db_queries_total",
  help: "Total number of database queries",
  labelNames: ["operation", "table"],
  registers: [register],
});

/**
 * Database query duration
 */
export const dbQueryDurationMs = new Histogram({
  name: "the_copy_db_query_duration_ms",
  help: "Duration of database queries in milliseconds",
  labelNames: ["operation", "table"],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  registers: [register],
});

/**
 * Database connection pool size
 */
export const dbConnectionPoolSize = new Gauge({
  name: "the_copy_db_connection_pool_size",
  help: "Current database connection pool size",
  registers: [register],
});

// ===== Queue Metrics =====

/**
 * Queue job counter
 */
export const queueJobsTotal = new Counter({
  name: "the_copy_queue_jobs_total",
  help: "Total number of queue jobs",
  labelNames: ["queue", "status"],
  registers: [register],
});

/**
 * Queue job duration
 */
export const queueJobDurationMs = new Histogram({
  name: "the_copy_queue_job_duration_ms",
  help: "Duration of queue jobs in milliseconds",
  labelNames: ["queue"],
  buckets: [100, 500, 1000, 5000, 10000, 30000, 60000, 120000],
  registers: [register],
});

/**
 * Queue size gauge
 */
export const queueSize = new Gauge({
  name: "the_copy_queue_size",
  help: "Number of jobs in queue",
  labelNames: ["queue", "state"],
  registers: [register],
});

// ===== Redis Cache Metrics =====

/**
 * Redis connection status
 */
export const redisConnectionStatus = new Gauge({
  name: "the_copy_redis_connection_status",
  help: "Redis connection status (1 = connected, 0 = disconnected)",
  registers: [register],
});

/**
 * Redis cache operations counter
 */
export const redisCacheOpsTotal = new Counter({
  name: "the_copy_redis_cache_ops_total",
  help: "Total number of Redis cache operations",
  labelNames: ["operation", "layer"],
  registers: [register],
});

/**
 * Redis cache hit rate
 */
export const redisCacheHitRate = new Gauge({
  name: "the_copy_redis_cache_hit_rate",
  help: "Redis cache hit rate percentage",
  registers: [register],
});

/**
 * Redis operation latency
 */
export const redisOperationLatencyMs = new Histogram({
  name: "the_copy_redis_operation_latency_ms",
  help: "Redis operation latency in milliseconds",
  labelNames: ["operation"],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  registers: [register],
});

/**
 * Redis memory usage (if available)
 */
export const redisMemoryUsageBytes = new Gauge({
  name: "the_copy_redis_memory_usage_bytes",
  help: "Redis memory usage in bytes",
  registers: [register],
});

/**
 * Cache size (L1 memory cache)
 */
export const cacheMemorySize = new Gauge({
  name: "the_copy_cache_memory_size",
  help: "Number of items in L1 memory cache",
  registers: [register],
});

// ===== Application Metrics =====

/**
 * Active users gauge
 */
export const activeUsers = new Gauge({
  name: "the_copy_active_users",
  help: "Number of currently active users",
  registers: [register],
});

/**
 * Projects created counter
 */
export const projectsCreated = new Counter({
  name: "the_copy_projects_created_total",
  help: "Total number of projects created",
  registers: [register],
});

/**
 * Scenes analyzed counter
 */
export const scenesAnalyzed = new Counter({
  name: "the_copy_scenes_analyzed_total",
  help: "Total number of scenes analyzed",
  registers: [register],
});

// ===== Middleware =====

const LONG_RUNNING_API_PATHS = new Set([
  "/health/ready",
  "/health/detailed",
  "/api/export/pdfa",
  "/api/file-extract",
  "/api/files/extract",
  "/api/text-extract",
  "/api/final-review",
  "/api/suspicion-review",
]);

function getSlowRequestThresholdMs(path: string): number {
  return LONG_RUNNING_API_PATHS.has(path) ? 30_000 : 1_000;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getRoutePath(req: Request): string {
  const route: unknown = (req as { route?: unknown }).route;
  if (!isRecord(route)) {
    return req.path;
  }
  const routePath = route["path"];
  return typeof routePath === "string" ? routePath : req.path;
}

/**
 * Middleware to track HTTP metrics
 */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const startTime = Date.now();

  // Increment active connections
  httpActiveConnections.inc();

  // Track response
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const route = getRoutePath(req);
    const method = req.method;
    const statusCode = res.statusCode.toString();

    // Decrement active connections
    httpActiveConnections.dec();

    // Record metrics
    httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode,
    });

    httpRequestDurationMs.observe(
      {
        method,
        route,
        status_code: statusCode,
      },
      duration,
    );

    // Log slow requests
    const slowRequestThresholdMs = getSlowRequestThresholdMs(route);
    if (duration > slowRequestThresholdMs) {
      logger.warn("Slow request detected", {
        method,
        route,
        duration,
        statusCode,
        slowRequestThresholdMs,
      });
    }
  });

  next();
}

/**
 * Endpoint to expose metrics
 */
export async function metricsEndpoint(_req: Request, res: Response) {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error("Failed to collect metrics:", error);
    res.status(500).end("Failed to collect metrics");
  }
}

/**
 * Track Gemini API call
 */
export function trackGeminiRequest(
  analysisType: string,
  duration: number,
  success: boolean,
) {
  geminiRequestsTotal.inc({
    status: success ? "success" : "error",
    analysis_type: analysisType,
  });

  geminiRequestDurationMs.observe(
    {
      analysis_type: analysisType,
    },
    duration,
  );
}

/**
 * Track Gemini cache hit/miss
 */
export function trackGeminiCache(hit: boolean) {
  if (hit) {
    geminiCacheHits.inc();
  } else {
    geminiCacheMisses.inc();
  }
}

/**
 * Track database query
 */
export function trackDbQuery(
  operation: string,
  table: string,
  duration: number,
) {
  dbQueriesTotal.inc({
    operation,
    table,
  });

  dbQueryDurationMs.observe(
    {
      operation,
      table,
    },
    duration,
  );
}

/**
 * Track queue job
 */
export function trackQueueJob(
  queue: string,
  status: "completed" | "failed",
  duration: number,
) {
  queueJobsTotal.inc({
    queue,
    status,
  });

  queueJobDurationMs.observe(
    {
      queue,
    },
    duration,
  );
}

/**
 * Update queue size
 */
export function updateQueueSize(queue: string, state: string, size: number) {
  queueSize.set(
    {
      queue,
      state,
    },
    size,
  );
}

/**
 * Track Redis cache operation
 */
export function trackRedisCacheOp(
  operation: "get" | "set" | "delete" | "clear",
  layer: "l1" | "l2",
  latency?: number,
) {
  redisCacheOpsTotal.inc({
    operation,
    layer,
  });

  if (latency !== undefined) {
    redisOperationLatencyMs.observe(
      {
        operation,
      },
      latency,
    );
  }
}

/**
 * Update Redis connection status
 */
export function updateRedisConnectionStatus(connected: boolean) {
  redisConnectionStatus.set(connected ? 1 : 0);
}

/**
 * Update Redis cache hit rate
 */
export function updateRedisCacheHitRate(hitRate: number) {
  redisCacheHitRate.set(hitRate);
}

/**
 * Update cache memory size
 */
export function updateCacheMemorySize(size: number) {
  cacheMemorySize.set(size);
}

/**
 * Update Redis memory usage (if available from INFO command)
 */
export function updateRedisMemoryUsage(bytes: number) {
  redisMemoryUsageBytes.set(bytes);
}

export const metricsBundle = {
  register,
  metricsMiddleware,
  metricsEndpoint,
  trackGeminiRequest,
  trackGeminiCache,
  trackDbQuery,
  trackQueueJob,
  updateQueueSize,
  trackRedisCacheOp,
  updateRedisConnectionStatus,
  updateRedisCacheHitRate,
  updateCacheMemorySize,
  updateRedisMemoryUsage,
};
