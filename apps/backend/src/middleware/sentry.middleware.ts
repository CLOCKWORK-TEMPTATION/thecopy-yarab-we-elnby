/**
 * Sentry Middleware for Express
 *
 * Avoid loading Sentry packages unless a DSN is configured.
 */

import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

type SentryModule = typeof import('@sentry/node');

let sentryModule: SentryModule | null = null;
let cachedErrorHandler: ErrorRequestHandler | null = null;

function isSentryEnabled(): boolean {
  return Boolean(process.env['SENTRY_DSN']?.trim());
}

function getSentryModule(): SentryModule {
  sentryModule ??= require('@sentry/node') as SentryModule;
  return sentryModule;
}

function getSentryErrorHandler(): ErrorRequestHandler {
  if (!isSentryEnabled()) {
    return (error, _req, _res, next) => next(error);
  }

  cachedErrorHandler ??=
    (require('@sentry/node') as typeof import('@sentry/node')).expressErrorHandler();
  return cachedErrorHandler;
}

export const sentryRequestHandler = (
  _req: Request,
  _res: Response,
  next: NextFunction
) => {
  next();
};

export const sentryTracingHandler = (
  _req: Request,
  _res: Response,
  next: NextFunction
) => {
  next();
};

export const sentryErrorHandler: ErrorRequestHandler = (error, req, res, next) =>
  getSentryErrorHandler()(error, req, res, next);

export function trackError(req: Request, res: Response, next: NextFunction) {
  if (!isSentryEnabled()) {
    next();
    return;
  }

  const Sentry = getSentryModule();

  if (req.user) {
    Sentry.setUser({
      id: req.user.id,
      email: req.user.email,
      ip_address: req.ip || req.socket.remoteAddress || null,
    });
  }

  const originalSend = res.send;

  res.send = function (data: unknown) {
    if (res.statusCode >= 400) {
      Sentry.addBreadcrumb({
        message: `HTTP ${res.statusCode} on ${req.method} ${req.path}`,
        level: res.statusCode >= 500 ? 'error' : 'warning',
        data: {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          userId: req.user?.id,
        },
      });
    }

    return originalSend.call(this, data);
  };

  next();
}

export function trackPerformance(req: Request, res: Response, next: NextFunction) {
  if (!isSentryEnabled()) {
    next();
    return;
  }

  const Sentry = getSentryModule();
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    if (duration > 1000) {
      Sentry.addBreadcrumb({
        message: `Slow request: ${req.method} ${req.path}`,
        level: 'warning',
        data: {
          duration,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
        },
      });
    }

    Sentry.metrics.distribution('http.request.duration', duration, {
      unit: 'millisecond',
    });
  });

  next();
}
