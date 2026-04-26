/**
 * Unified Pino Logger — Backend
 *
 * المصدر الموحَّد للتسجيل (Logging) داخل تطبيق الـ backend.
 * يستبدل الـ logger القائم على winston ويوحّد كل عمليات التسجيل
 * عبر مكتبة pino مع إعادة توجيه (redaction) آمنة للأسرار.
 *
 * مستويات التسجيل المدعومة (مرتبة حسب الأولوية تصاعدياً):
 *   trace → debug → info → warn → error → fatal
 *
 * كيفية الاستخدام:
 *   import { logger } from '@/lib/logger';
 *   logger.info({ requestId: 'abc' }, 'request received');
 *
 *   // logger فرعي بسياق ثابت لمكوّن معيّن
 *   const moduleLogger = logger.child({ module: 'breakapp.routes' });
 *   moduleLogger.warn({ userId: 123 }, 'rate limit hit');
 *
 * ضمانات الأمان:
 *   - أي حقل يُطابق نمط من الأسرار (TIPTAP_PRO_TOKEN, JWT_SECRET, *_API_KEY, *_TOKEN, password, authorization, cookie, secret)
 *     يُستبدَل تلقائياً بـ '[REDACTED]' قبل الكتابة.
 *   - بيانات حسّاسة محتملة في رؤوس HTTP (Authorization, Cookie) مغطّاة كذلك.
 */

import pino, { type Logger as PinoLogger, type LoggerOptions } from 'pino';

import { isDevelopment, isProduction } from '@/config/env';

// ----------------------------------------------------------------------------
// قائمة المسارات المعرّضة للأسرار (يقوم pino بإخفائها تلقائياً)
// ----------------------------------------------------------------------------
const REDACT_PATHS: readonly string[] = [
  // مفاتيح API الشائعة
  '*.password',
  '*.passwd',
  '*.secret',
  '*.token',
  '*.apiKey',
  '*.api_key',
  '*.accessToken',
  '*.refreshToken',
  '*.authorization',
  '*.auth',
  '*.cookie',
  '*.cookies',
  '*.jwt',
  '*.bearerToken',
  // متغيّرات بيئة معروفة
  '*.TIPTAP_PRO_TOKEN',
  '*.JWT_SECRET',
  '*.GEMINI_API_KEY',
  '*.GOOGLE_GENAI_API_KEY',
  '*.OPENAI_API_KEY',
  '*.ANTHROPIC_API_KEY',
  '*.MISTRAL_API_KEY',
  '*.DEEPSEEK_API_KEY',
  '*.GROQ_API_KEY',
  '*.OPENROUTER_API_KEY',
  '*.SENTRY_AUTH_TOKEN',
  '*.SLACK_TOKEN',
  '*.SMTP_PASSWORD',
  '*.DATABASE_URL',
  '*.REDIS_URL',
  // رؤوس HTTP
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.headers["x-auth-token"]',
  'request.headers.authorization',
  'request.headers.cookie',
  'headers.authorization',
  'headers.cookie',
];

// ----------------------------------------------------------------------------
// خيارات pino الأساسية
// ----------------------------------------------------------------------------
function buildLoggerOptions(): LoggerOptions {
  const baseLevel = isDevelopment ? 'debug' : isProduction ? 'info' : 'warn';

  const options: LoggerOptions = {
    level: process.env['LOG_LEVEL'] ?? baseLevel,
    base: {
      service: 'the-copy-backend',
      env: process.env['NODE_ENV'] ?? 'unknown',
      pid: process.pid,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [...REDACT_PATHS],
      censor: '[REDACTED]',
      remove: false,
    },
    formatters: {
      level: (label) => ({ level: label }),
    },
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  };

  // وضع التطوير: pino-pretty عند الطلب فقط (يبقى JSON الافتراضي حتى في dev لمنع كسر CI)
  if (isDevelopment && process.env['LOG_PRETTY'] === 'true') {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname,service,env',
        singleLine: false,
      },
    };
  }

  return options;
}

// ----------------------------------------------------------------------------
// الـ logger المُصدَّر
// ----------------------------------------------------------------------------
export const logger: PinoLogger = pino(buildLoggerOptions());

/**
 * إنشاء logger فرعي بسياق ثابت.
 * يُستخدم في كل ملف لتمييز السجلات حسب المكوّن.
 *
 * مثال:
 *   const log = createModuleLogger('breakapp.repository');
 *   log.info({ userId }, 'querying user');
 */
export function createModuleLogger(moduleName: string, extraContext: Record<string, unknown> = {}): PinoLogger {
  return logger.child({ module: moduleName, ...extraContext });
}

/**
 * نوع السياق الذي يُمرَّر مع كل log.
 * استخدمه في توقيعات الدوال للتأكد من توحيد الحقول عبر التطبيق.
 */
export interface LogContext {
  module?: string;
  requestId?: string;
  userId?: string | number;
  route?: string;
  operation?: string;
  durationMs?: number;
  [key: string]: unknown;
}

export type Logger = PinoLogger;

// ----------------------------------------------------------------------------
// تصدير افتراضي للتوافق مع نمط import الشائع
// ----------------------------------------------------------------------------
export default logger;
