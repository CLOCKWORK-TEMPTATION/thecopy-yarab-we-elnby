import { logger } from '@/lib/logger';

type WebSocketAuthEvent =
  | 'ws:auth:middleware_success'
  | 'ws:auth:event_success'
  | 'ws:auth:timeout'
  | 'ws:auth:denied'
  | 'ws:auth:dev_fallback';

interface WebSocketAuthPayload {
  socketId: string;
  userId?: string;
  authMethod?: 'middleware' | 'event' | 'dev-fallback';
  reason?: string;
}

interface AnalyticsHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastSuccess: string | null;
  failureCount: number;
}

// لا نعلن "صحة" قبل أي نجاح فعلي. الحالة الافتراضية "degraded" حتى تثبيت
// أول كتابة تحليلات ناجحة، لتجنّب تقرير صحة شكلي كاذب على نظام لم يُمارَس بعد.
const analyticsHealth: AnalyticsHealth = {
  status: 'degraded',
  lastSuccess: null,
  failureCount: 0,
};

export function trackWebSocketAuth(event: WebSocketAuthEvent, payload: WebSocketAuthPayload): void {
  logger.info({
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

export function trackAnalyticsPersistence(event: 'analytics:persistence:success' | 'analytics:persistence:failure', payload: {
  category: 'voice' | 'webcam' | 'memorization';
  id?: string;
  reason?: string;
}): void {
  if (event === 'analytics:persistence:success') {
    analyticsHealth["status"] = 'healthy';
    analyticsHealth.lastSuccess = new Date().toISOString();
    analyticsHealth.failureCount = 0;
  } else {
    analyticsHealth.failureCount += 1;
    analyticsHealth["status"] = analyticsHealth.failureCount > 3 ? 'unhealthy' : 'degraded';
  }

  logger.info({
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

export function trackRoutingHealth(event: 'routing:breakapp:proxy_ok' | 'routing:breakapp:proxy_error', payload: {
  path: string;
  status?: number;
  reason?: string;
}): void {
  logger.info({
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

export function getAnalyticsHealth(): AnalyticsHealth {
  return { ...analyticsHealth };
}
