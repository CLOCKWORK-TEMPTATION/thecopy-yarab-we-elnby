/**
 * Safe Logging Middleware
 * منع تسريب المحتوى الحساس في Logs
 * 
 * المبادئ:
 * 1. لا logging للـ request/response bodies
 * 2. لا logging لأي محتوى نصي من السيناريوهات
 * 3. فقط metadata للأخطاء (بدون stack traces تحتوي محتوى)
 */

import { logger } from '../utils/logger';

import type { Request, Response, NextFunction } from 'express';

/**
 * Sensitive fields to sanitize
 */
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'authVerifier',
  'apiKey',
  'token',
  'refreshToken',
  'mfaSecret',
  'kek',
  'dek',
  'wrappedDEK',
  'ciphertext',
  'content',
  'scriptContent',
  'text',
  'description',
  'notes',
  'title',
];

/**
 * Paths that should not log bodies
 */
const NO_BODY_LOG_PATHS = [
  '/api/docs',
  '/api/auth/zk-signup',
  '/api/auth/zk-login',
  '/api/projects',
];

const BLOCKED_PROPERTY_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function sanitizeLogKey(key: string): string {
  if (BLOCKED_PROPERTY_KEYS.has(key)) {
    return '_blocked_property';
  }

  const normalized = key.replace(/[^\w.-]/g, '_').slice(0, 128);
  return normalized || '_empty';
}

/**
 * تنظيف object من الحقول الحساسة
 */
function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const sanitizedEntries = Object.entries(obj).map(([key, value]) => {
      const safeKey = sanitizeLogKey(key);
      // استبدال الحقول الحساسة
      if (SENSITIVE_FIELDS.includes(key)) {
        return [safeKey, '[REDACTED]'] as const;
      }
      if (typeof value === 'object' && value !== null) {
        return [safeKey, sanitizeObject(value)] as const;
      }
      return [safeKey, value] as const;
    });

    return Object.fromEntries(sanitizedEntries);
  }

  return obj;
}

/**
 * التحقق من المسار الحساس
 */
function isSensitivePath(path: string): boolean {
  return NO_BODY_LOG_PATHS.some((p) => path.startsWith(p));
}

/**
 * Safe Request Logging Middleware
 */
export function safeRequestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();

  // Log basic request info (safe)
  const requestInfo = {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };

  logger.info('Request received', requestInfo);

  // Override res.json to intercept response
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    const duration = Date.now() - startTime;

    // Log response metadata (without body)
    const responseInfo = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
    };

    if (res.statusCode >= 400) {
      // Log errors with sanitized info
      logger.error('Request failed', {
        ...responseInfo,
        error: typeof body === 'object' && body !== null
          ? (body as { error?: string }).error
          : undefined,
      });
    } else {
      logger.info('Request completed', responseInfo);
    }

    return originalJson(body);
  };

  next();
}

/**
 * Sanitize Error Middleware
 */
export function sanitizeErrorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Log error without sensitive data
  const errorInfo = {
    message: error.message,
    name: error.name,
    method: req.method,
    path: req.path,
    status: res.statusCode || 500,
  };

  logger.error('Error occurred', errorInfo);

  // لا نرسل stack trace للعميل
  res.status(res.statusCode || 500).json({
    success: false,
    error: error.message || 'حدث خطأ في الخادم',
  });
}

/**
 * Body Sanitization Middleware
 * (للاستخدام في development فقط)
 */
export function bodySanitizationMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (process.env.NODE_ENV === 'development' && req.body) {
    // في development، نسمح بـ logging محدود
    if (!isSensitivePath(req.path)) {
      const sanitizedBody = sanitizeObject(req.body);
      logger.debug('Request body (sanitized)', {
        path: req.path,
        body: sanitizedBody,
      });
    } else {
      logger.debug('Request body redacted (sensitive path)', {
        path: req.path,
      });
    }
  }

  next();
}

/**
 * منع console.log في الإنتاج
 */
export function preventConsoleLogsInProduction() {
  if (process.env.NODE_ENV === 'production') {
    // Override console methods
    const noop = () => {};

    // eslint-disable-next-line no-console
    console.log = noop;
    // eslint-disable-next-line no-console
    console.debug = noop;
    // eslint-disable-next-line no-console
    console.info = logger.info.bind(logger);
    // eslint-disable-next-line no-console
    console.warn = logger.warn.bind(logger);
    // eslint-disable-next-line no-console
    console.error = logger.error.bind(logger);
  }
}

/**
 * Analytics Event Logger (safe events only)
 */
export function logAnalyticsEvent(
  event: string,
  metadata?: Record<string, unknown>
) {
  // فقط أحداث UI عامة
  const allowedEvents = [
    'page_view',
    'document_opened',
    'document_saved',
    'document_deleted',
    'export_started',
    'export_completed',
    'search_performed',
    'error_occurred',
  ];

  if (!allowedEvents.includes(event)) {
    logger.warn('Attempted to log non-allowed analytics event', { event });
    return;
  }

  // تنظيف metadata
  const sanitizedMetadata = sanitizeObject(metadata);

  logger.info('Analytics event', {
    event,
    metadata: sanitizedMetadata,
    timestamp: new Date().toISOString(),
  });
}
