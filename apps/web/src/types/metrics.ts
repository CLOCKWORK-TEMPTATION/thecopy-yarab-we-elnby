/**
 * System Metrics Types
 *
 * Types for system performance metrics dashboard
 */

export interface MetricsSnapshot {
  timestamp: string;
  database: DatabaseMetrics;
  redis: RedisMetrics;
  queue: QueueMetrics;
  api: ApiMetrics;
  resources: ResourceMetrics;
  gemini: GeminiMetrics;
}

export interface DatabaseMetrics {
  totalQueries: number;
  avgQueryDuration: number;
  slowQueries: number;
  byTable: Record<string, { count: number; avgDuration: number }>;
}

export interface RedisMetrics {
  hits: number;
  misses: number;
  hitRatio: number;
  avgLatency: number;
  memoryUsage: number;
  connectedClients: number;
}

export interface QueueMetrics {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  throughput: number;
  avgProcessingTime: number;
  byQueue: Record<string, QueueStats>;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

export interface ApiMetrics {
  totalRequests: number;
  avgResponseTime: number;
  errorRate: number;
  byEndpoint: Record<string, EndpointMetrics>;
}

export interface EndpointMetrics {
  count: number;
  avgDuration: number;
  errors: number;
}

export interface ResourceMetrics {
  cpu: { usage: number; status: string };
  memory: { used: number; total: number; percent: number; status: string };
  eventLoop: { lag: number; status: string };
  concurrentRequests: number;
  backpressureEvents: number;
}

export interface GeminiMetrics {
  totalRequests: number;
  avgDuration: number;
  cacheHitRatio: number;
  errorRate: number;
}

export interface DashboardSummary {
  timestamp: string;
  overview: {
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    activeJobs: number;
    cacheHitRatio: number;
  };
  database: {
    totalQueries: number;
    avgDuration: number;
    slowQueries: number;
  };
  redis: {
    hitRatio: number;
    hits: number;
    misses: number;
    memoryUsage: number;
  };
  queue: {
    total: number;
    active: number;
    completed: number;
    failed: number;
  };
  resources: {
    cpu: { usage: number; status: string };
    memory: { used: number; total: number; percent: number; status: string };
    concurrentRequests: number;
  };
  gemini: {
    totalRequests: number;
    avgDuration: number;
    cacheHitRatio: number;
    errorRate: number;
  };
}

export interface HealthStatus {
  status: "healthy" | "degraded" | "critical";
  isUnderPressure: boolean;
  timestamp: string;
  resources: ResourceMetrics;
  metrics: {
    errorRate: number;
    avgResponseTime: number;
    cacheHitRatio: number;
    activeJobs: number;
  } | null;
}

export interface PerformanceAlert {
  severity: "info" | "warning" | "critical";
  message: string;
  metric: string;
  value: number;
  threshold: number;
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
    systemHealth: "healthy" | "degraded" | "critical";
  };
  recommendations: string[];
  alerts: PerformanceAlert[];
}
