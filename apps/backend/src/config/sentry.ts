/** Sentry Configuration — lazy-loads packages only when DSN is configured. */
import { createRequire } from 'node:module';

import { logger } from '@/lib/logger';

type SentryModule = typeof import('@sentry/node');
export type SeverityLevel = import('@sentry/node').SeverityLevel;
const loadRuntimeModule = createRequire(__filename);
let sentryModule: SentryModule | null = null;

function isSentryEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN?.trim());
}

function getSentryModule(): SentryModule {
  sentryModule ??= loadRuntimeModule('@sentry/node') as SentryModule;
  return sentryModule;
}

export const APM_CONFIG = {
  tracesSampleRate: parseFloat(process.env['SENTRY_TRACES_SAMPLE_RATE'] ?? '0.1'),
  profilesSampleRate: parseFloat(process.env['SENTRY_PROFILES_SAMPLE_RATE'] ?? '0.1'),
  thresholds: { apiResponse: 2000, geminiCall: 30000, dbQuery: 1000, redisOperation: 100 },
  errorRateThreshold: 5,
};

function buildTracePropagationTargets(): (string | RegExp)[] {
  // Distributed tracing عبر حدود web↔backend. نضيف أهداف ثابتة + أي host قادم من env.
  const targets: (string | RegExp)[] = [
    'localhost',
    /^https:\/\/www\.thecopy\.app/,
    /^https:\/\/.*\.vercel\.app/,
    /^https:\/\/.*\.railway\.app/,
  ];

  const frontendUrl = process.env.FRONTEND_URL?.trim();
  if (frontendUrl) targets.push(frontendUrl);

  return targets;
}

function buildSentryInitConfig(dsn: string, isProduction: boolean) {
  const profilingIntegration =
    isProduction
      ? (loadRuntimeModule('@sentry/profiling-node') as typeof import('@sentry/profiling-node')).nodeProfilingIntegration
      : null;

  return {
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release:
      process.env['SENTRY_RELEASE'] ??
      (process.env['RAILWAY_GIT_COMMIT_SHA']
        ? `the-copy-backend@${process.env['RAILWAY_GIT_COMMIT_SHA'].slice(0, 12)}`
        : `the-copy-backend@${process.env.npm_package_version ?? '1.0.0'}`),
    serverName:
      (process.env['HOSTNAME'] ?? process.env['SENTRY_SERVER_NAME']) ?? 'backend-server',
    tracesSampleRate: isProduction ? APM_CONFIG.tracesSampleRate : 1.0,
    tracePropagationTargets: buildTracePropagationTargets(),
    profilesSampleRate: isProduction ? APM_CONFIG.profilesSampleRate : 1.0,
    sendDefaultPii: false,
    integrations: profilingIntegration ? [profilingIntegration()] : [],
    initialScope: {
      tags: {
        'app.name': 'the-copy',
        'app.component': 'backend',
        'node.version': process.version,
      },
    },
    beforeSendTransaction: filterSlowTransactions,
    beforeSend: filterTransientErrors,
    beforeBreadcrumb: enrichBreadcrumbs,
  };
}

function filterSlowTransactions(
  event: import('@sentry/core').TransactionEvent,
  _hint: import('@sentry/core').EventHint
): import('@sentry/core').TransactionEvent | null {
  if (event.timestamp && event.start_timestamp) {
    const duration = (event.timestamp - event.start_timestamp) * 1000;
    if (duration > APM_CONFIG.thresholds.apiResponse) {
      event.tags = {
        ...event.tags,
        'performance.slow': 'true',
        'performance.duration_ms': String(Math.round(duration)),
      };
    }
  }
  return event;
}

function filterTransientErrors(
  event: import('@sentry/node').ErrorEvent,
  hint: import('@sentry/node').EventHint
): import('@sentry/node').ErrorEvent | null {
  const error = hint.originalException;
  if (
    error instanceof Error &&
    (error.message.includes('ECONNREFUSED') ||
      error.message.includes('timeout') ||
      error.message.includes('ENOTFOUND'))
  ) {
    return null;
  }
  return event;
}

function enrichBreadcrumbs(breadcrumb: { category?: string; data?: Record<string, unknown> }) {
  if (breadcrumb.category === 'http') {
    breadcrumb.data = {
      ...breadcrumb.data,
      timestamp: new Date().toISOString(),
    };
  }
  return breadcrumb;
}

export function initializeSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.warn('[Sentry] DSN not configured, monitoring disabled');
    return;
  }

  const Sentry = getSentryModule();
  const isProduction = process.env.NODE_ENV === 'production';

  Sentry.init(buildSentryInitConfig(dsn, isProduction));

  logger.info('[Sentry] APM initialized', {
    environment: process.env.NODE_ENV,
    tracesSampleRate: isProduction ? APM_CONFIG.tracesSampleRate : 1.0,
    profilesSampleRate: isProduction ? APM_CONFIG.profilesSampleRate : 1.0,
  });
}

export function captureException(error: Error, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production' && isSentryEnabled()) {
    const Sentry = getSentryModule();
    if (context) {
      Sentry.withScope((scope) => {
        scope.setContext('custom', context);
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
    return;
  }

  logger.error('[Sentry] Exception:', error, context);
}

export function captureMessage(
  message: string,
  level: SeverityLevel = 'info',
  context?: Record<string, unknown>
) {
  if (process.env.NODE_ENV === 'production' && isSentryEnabled()) {
    const Sentry = getSentryModule();
    if (context) {
      Sentry.withScope((scope) => {
        scope.setContext('custom', context);
        Sentry.captureMessage(message, level);
      });
    } else {
      Sentry.captureMessage(message, level);
    }
    return;
  }

  // التراجع للـ logger الموحَّد عند غياب Sentry أو خارج بيئة الإنتاج
  logger.info({ ...(context ?? {}), level }, message);
}

export function trackMetric(name: string, value: number, unit = 'ms') {
  if (isSentryEnabled()) {
    const Sentry = getSentryModule();
    Sentry.metrics.gauge(name, value, {
      unit,
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    logger.debug(`[Metric] ${name}: ${value}${unit}`);
  }
}

export enum OperationType {
  GEMINI_API = 'gemini.api',
  DB_QUERY = 'db.query',
  REDIS_OPERATION = 'redis.operation',
  QUEUE_JOB = 'queue.job',
  FILE_UPLOAD = 'file.upload',
  EXTERNAL_API = 'external.api',
}

export function startTransaction(
  operation: OperationType,
  name: string,
  data?: Record<string, string | number | boolean>
): (endData?: Record<string, unknown>) => void {
  const startTime = performance.now();
  const Sentry = isSentryEnabled() ? getSentryModule() : null;
  const span = Sentry?.startInactiveSpan({
    name: `${operation}:${name}`,
    op: operation,
    ...(data ? { attributes: data } : {}),
  });

  return (endData?: Record<string, unknown>) => {
    const duration = performance.now() - startTime;

    if (span) {
      if (endData) {
        Object.entries(endData).forEach(([key, value]) => {
          span.setAttribute(key, String(value));
        });
      }
      span.setAttribute('duration_ms', duration);
      span.end();
    }

    trackMetric(`${operation}.duration`, duration, 'ms');

    const threshold = getThresholdForOperation(operation);
    if (threshold && duration > threshold) {
      logger.warn('Slow operation detected', {
        operation,
        name,
        duration: Math.round(duration),
        threshold,
        ...endData,
      });

      captureMessage(`Slow ${operation}: ${name}`, 'warning', {
        duration,
        threshold,
        ...data,
        ...endData,
      });
    }
  };
}

const OPERATION_THRESHOLDS: Record<string, number> = {
  [OperationType.GEMINI_API]: APM_CONFIG.thresholds.geminiCall,
  [OperationType.DB_QUERY]: APM_CONFIG.thresholds.dbQuery,
  [OperationType.REDIS_OPERATION]: APM_CONFIG.thresholds.redisOperation,
};

function getThresholdForOperation(operation: OperationType): number {
  return OPERATION_THRESHOLDS[operation] ?? APM_CONFIG.thresholds.apiResponse;
}

export function withTransaction<T extends (...args: unknown[]) => Promise<unknown>>(
  operation: OperationType,
  name: string,
  fn: T
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const finish = startTransaction(operation, name, {
      args_count: args.length,
    });

    try {
      const result = await fn(...args);
      finish({ status: 'ok' });
      return result as ReturnType<T>;
    } catch (error) {
      finish({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }) as T;
}

async function trackOperation<T>(
  type: OperationType,
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const finish = startTransaction(type, name);
  try {
    const result = await fn();
    finish({ status: 'ok' });
    return result;
  } catch (error) {
    finish({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export function trackDbQuery<T>(queryName: string, queryFn: () => Promise<T>): Promise<T> {
  return trackOperation(OperationType.DB_QUERY, queryName, queryFn);
}

export function trackRedisOp<T>(opName: string, opFn: () => Promise<T>): Promise<T> {
  return trackOperation(OperationType.REDIS_OPERATION, opName, opFn);
}

export function trackGeminiCall<T>(callName: string, callFn: () => Promise<T>): Promise<T> {
  return trackOperation(OperationType.GEMINI_API, callName, callFn);
}

export {
  recordRequest,
  recordOperation,
  getPerformanceDashboard,
  resetPerformanceMetrics,
} from './sentry-metrics';
