import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";
import {
  logSecurityEvent,
  SecurityEventType,
} from "./security-logger.middleware";
import { sanitizeRequestLogs } from "./log-sanitization.middleware";
import { sloMetricsMiddleware } from "./slo-metrics.middleware";

/**
 * Rate Limiting Strategy Notes:
 *
 * Current implementation uses in-memory store which works for single-server deployments.
 * For distributed deployments (multiple servers), install 'rate-limit-redis' package
 * and configure a Redis store:
 *
 * npm install rate-limit-redis
 *
 * Then update the rate limiters to use:
 * store: new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) })
 */

const EDITOR_RUNTIME_PATHS = new Set([
  '/api/file-extract',
  '/api/files/extract',
  '/api/text-extract',
  '/api/suspicion-review',
  '/api/final-review',
  '/api/ai/context-enhance',
  '/api/export/pdfa',
]);

function isEditorRuntimePath(path: string): boolean {
  return EDITOR_RUNTIME_PATHS.has(path);
}

function buildEffectiveWhitelist(): string[] {
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) =>
    origin.trim()
  );
  const devWhitelist = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
  ];
  return env.NODE_ENV === "development"
    ? [...allowedOrigins, ...devWhitelist]
    : allowedOrigins;
}

function setupCors(app: express.Application): void {
  const effectiveWhitelist = buildEffectiveWhitelist();
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }
        if (effectiveWhitelist.includes(origin)) {
          return callback(null, true);
        }
        logSecurityEvent(SecurityEventType.CORS_VIOLATION, {} as express.Request, {
          blockedOrigin: origin,
          allowedOrigins: effectiveWhitelist,
        });
        const error = new Error("CORS policy violation") as Error & {
          code?: string;
          statusCode?: number;
        };
        error.code = "CORS_POLICY_VIOLATION";
        error.statusCode = 403;
        return callback(error);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-XSRF-TOKEN"],
      exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining"],
      maxAge: 86400,
    })
  );
}

function setupSecurity(app: express.Application): void {
  const isProduction = env.NODE_ENV === "production";
  const scriptSrc = isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"];
  const styleSrc = isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"];

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc,
          styleSrc,
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://o*.ingest.sentry.io", process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ? new URL(process.env['OTEL_EXPORTER_OTLP_ENDPOINT']).origin : ""].filter(Boolean),
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: isProduction ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: "same-site" },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: "deny" },
      hidePoweredBy: true,
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      ieNoOpen: true,
      noSniff: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xssFilter: true,
    })
  );
}

function setupBodyParsing(app: express.Application): void {
  app.use(compression() as unknown as express.RequestHandler);

  const jsonParser = express.json({ limit: "10mb" });
  const urlEncodedParser = express.urlencoded({ extended: true, limit: "10mb" });

  app.use((req, res, next) => {
    if (isEditorRuntimePath(req.path)) { next(); return; }
    jsonParser(req, res, next);
  });

  app.use((req, res, next) => {
    if (isEditorRuntimePath(req.path)) { next(); return; }
    urlEncodedParser(req, res, next);
  });

  app.use(sanitizeRequestLogs as unknown as express.RequestHandler);
  app.use(sloMetricsMiddleware);
}

function setupRateLimiting(app: express.Application): void {
  const generalLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    skip: (req) => isEditorRuntimePath(req.path),
    message: {
      success: false,
      error: "تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة لاحقاً",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: false,
    message: {
      success: false,
      error: "تم تجاوز عدد محاولات تسجيل الدخول، يرجى المحاولة بعد 15 دقيقة",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: {
      success: false,
      error: "تم تجاوز الحد المسموح من طلبات التحليل بالذكاء الاصطناعي، يرجى المحاولة لاحقاً",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use("/api/", generalLimiter as unknown as express.RequestHandler);
  app.use("/api/auth/login", authLimiter as unknown as express.RequestHandler);
  app.use("/api/auth/signup", authLimiter as unknown as express.RequestHandler);
  app.use("/api/analysis/", aiLimiter as unknown as express.RequestHandler);
  app.use("/api/projects/:id/analyze", aiLimiter as unknown as express.RequestHandler);
}

/**
 * مصنع Rate limiter مرتبط بمُعرّف المستخدم (userId) لا فقط بالـ IP
 *
 * @description
 * يُستخدم على المسارات المصادَق عليها بعد authMiddleware بحيث يصبح req.userId متاحًا.
 * عند غياب userId (طلب غير مُصادَق بعد) يسقط إلى تحديد الحد بعنوان IP كاحتياط
 * حتى لا نسمح بتخطي الحد قبل المصادقة.
 *
 * @param options - إعدادات النافذة والحد لكل مستخدم
 */
export function createPerUserLimiter(options: {
  windowMs: number;
  max: number;
  errorMessage: string;
}): express.RequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const userId = (req as express.Request & { userId?: string }).userId;
      if (userId && userId.length > 0) {
        return `user:${userId}`;
      }
      // احتياطي: استخدم IP المعتمد بعد trust proxy مع تطبيع IPv6 الرسمي
      return `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
    },
    message: {
      success: false,
      error: options.errorMessage,
    },
  }) as unknown as express.RequestHandler;
}

/**
 * Rate limiter افتراضي لكل مستخدم لمسارات الذكاء الاصطناعي المكلفة
 * 30 طلب لكل ساعة لكل معرف مستخدم
 */
export const perUserAiLimiter = createPerUserLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  errorMessage: 'تم تجاوز حدّك الخاص لطلبات الذكاء الاصطناعي لهذه الساعة',
});

/**
 * Rate limiter افتراضي لكل مستخدم لعمليات الكتابة الحساسة
 * 60 عملية لكل دقيقة لكل معرف مستخدم
 */
export const perUserWriteLimiter = createPerUserLimiter({
  windowMs: 60 * 1000,
  max: 60,
  errorMessage: 'تم تجاوز حدّك الخاص لعمليات الكتابة لهذه الدقيقة',
});

function setupRequestLogging(app: express.Application): void {
  app.use((req, _res, next) => {
    logger.info("Request received", {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
    next();
  });
}

export const setupMiddleware = (app: express.Application): void => {
  setupCors(app);
  setupSecurity(app);
  setupBodyParsing(app);
  setupRateLimiting(app);
  setupRequestLogging(app);
};

// Export validation utilities
export {
  validateBody,
  validateQuery,
  validateParams,
  commonSchemas,
  detectAttacks,
} from "./validation.middleware";

// Export SLO metrics utilities
export {
  sloMetricsMiddleware,
  trackAPIRequest,
  trackAuthAttempt,
  trackGeminiCall,
  trackDatabaseQuery,
  getSLOStatus,
  SLO_TARGETS,
  ERROR_BUDGETS,
} from "./slo-metrics.middleware";

type PublicError = Error & {
  code?: unknown;
  statusCode?: unknown;
};

function getErrorStatusCode(error: Error): number {
  const statusCode = (error as PublicError).statusCode;
  return typeof statusCode === "number" && statusCode >= 400 && statusCode < 500
    ? statusCode
    : 500;
}

function getErrorCode(error: Error): string | undefined {
  const code = (error as PublicError).code;
  return typeof code === "string" ? code : undefined;
}

function getPublicErrorMessage(statusCode: number): string {
  return statusCode === 500
    ? "حدث خطأ داخلي في الخادم"
    : "طلب غير مصرح به";
}

// Error handling middleware - must be registered separately in server.ts after all routes
export const errorHandler = (
  error: Error,
  req: express.Request,
  res: express.Response,
  _next: express.NextFunction
): void => {
  const statusCode = getErrorStatusCode(error);
  const errorCode = getErrorCode(error);

  // Sanitize error details before logging - remove sensitive data
  const sanitizedError = {
    message: error.message,
    name: error.name,
    // Only include stack trace in development
    ...(env.NODE_ENV === "development" && { stack: error.stack }),
  };

  const logPayload = {
    error: sanitizedError,
    path: req.path,
    method: req.method,
    // Don't log request body as it may contain sensitive data
  };

  if (statusCode >= 500) {
    logger.error("Unhandled error:", logPayload);
  } else {
    logger.warn("Request rejected:", {
      ...logPayload,
      statusCode,
      code: errorCode,
    });
  }

  // Never expose internal error details to client in production
  res["status"](statusCode).json({
    success: false,
    error: getPublicErrorMessage(statusCode),
    ...(errorCode && { code: errorCode }),
    // Only include error details in development
    ...(env.NODE_ENV === "development" && statusCode === 500 && {
      details: error.message,
    }),
  });
};
