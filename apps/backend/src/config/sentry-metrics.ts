import { logger } from '@/lib/logger';

import { APM_CONFIG } from './sentry';

function isSentryEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN?.trim());
}

function getSentryMetrics() {
  if (!isSentryEnabled()) return null;
  const Sentry = require('@sentry/node') as typeof import('@sentry/node');
  return Sentry.metrics;
}

interface PerformanceMetrics {
  requests: {
    total: number;
    errors: number;
    latencies: number[];
  };
  operations: Record<
    string,
    {
      count: number;
      errors: number;
      totalDuration: number;
      latencies: number[];
    }
  >;
  lastReset: Date;
}

const metrics: PerformanceMetrics = {
  requests: { total: 0, errors: 0, latencies: [] },
  operations: {},
  lastReset: new Date(),
};

const MAX_LATENCY_SAMPLES = 1000;

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] || 0;
}

export function recordRequest(duration: number, isError = false) {
  metrics.requests.total++;
  if (isError) metrics.requests.errors++;

  metrics.requests.latencies.push(duration);
  if (metrics.requests.latencies.length > MAX_LATENCY_SAMPLES) {
    metrics.requests.latencies.shift();
  }

  const sentryMetrics = getSentryMetrics();
  if (sentryMetrics) {
    sentryMetrics.gauge('requests.total', metrics.requests.total);
    if (isError) {
      sentryMetrics.gauge('requests.errors', metrics.requests.errors);
    }
    sentryMetrics.distribution('requests.latency', duration, { unit: 'millisecond' });
  }
}

export function recordOperation(
  operation: string,
  duration: number,
  isError = false
) {
  if (!metrics.operations[operation]) {
    metrics.operations[operation] = {
      count: 0,
      errors: 0,
      totalDuration: 0,
      latencies: [],
    };
  }

  const op = metrics.operations[operation];
  op.count++;
  if (isError) op.errors++;
  op.totalDuration += duration;

  op.latencies.push(duration);
  if (op.latencies.length > MAX_LATENCY_SAMPLES) {
    op.latencies.shift();
  }
}

function buildSummary() {
  return {
    totalRequests: metrics.requests.total,
    totalErrors: metrics.requests.errors,
    errorRate:
      metrics.requests.total > 0
        ? ((metrics.requests.errors / metrics.requests.total) * 100).toFixed(2) + '%'
        : '0%',
    uptime: Date.now() - metrics.lastReset.getTime(),
  };
}

function buildLatencies(requestLatencies: number[]) {
  return {
    p50: Math.round(percentile(requestLatencies, 50)),
    p95: Math.round(percentile(requestLatencies, 95)),
    p99: Math.round(percentile(requestLatencies, 99)),
    avg:
      requestLatencies.length > 0
        ? Math.round(
            requestLatencies.reduce((a, b) => a + b, 0) / requestLatencies.length
          )
        : 0,
  };
}

export function getPerformanceDashboard() {
  const requestLatencies = metrics.requests.latencies;

  return {
    summary: buildSummary(),
    latencies: buildLatencies(requestLatencies),
    throughput: {
      requestsPerSecond:
        metrics.requests.total > 0
          ? (
              metrics.requests.total /
              ((Date.now() - metrics.lastReset.getTime()) / 1000)
            ).toFixed(2)
          : '0',
    },
    operations: Object.entries(metrics.operations).map(([name, data]) => ({
      name,
      count: data.count,
      errors: data.errors,
      errorRate:
        data.count > 0 ? ((data.errors / data.count) * 100).toFixed(2) + '%' : '0%',
      avgDuration: data.count > 0 ? Math.round(data.totalDuration / data.count) : 0,
      p95: Math.round(percentile(data.latencies, 95)),
    })),
    thresholds: APM_CONFIG.thresholds,
    alerts: {
      p95AboveThreshold:
        percentile(requestLatencies, 95) > APM_CONFIG.thresholds.apiResponse,
      errorRateAboveThreshold:
        metrics.requests.total > 0 &&
        (metrics.requests.errors / metrics.requests.total) * 100 >
          APM_CONFIG.errorRateThreshold,
    },
    lastReset: metrics.lastReset.toISOString(),
  };
}

export function resetPerformanceMetrics() {
  metrics.requests = { total: 0, errors: 0, latencies: [] };
  metrics.operations = {};
  metrics.lastReset = new Date();
  logger.info('Performance metrics reset');
}
