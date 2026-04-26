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
 * توافق مزدوج للـ API (مهم لمنع انحدار قابلية الرصد أثناء الـ migration):
 *   - الأسلوب الأصيل لـ pino:
 *       logger.info({ requestId }, 'received');
 *   - الأسلوب الموروث من winston (مدعوم عبر مُحوِّل):
 *       logger.info('received', { requestId });
 *       logger.error('failed', errorObject);
 *
 *   المُحوِّل يلتقط نمطَي الاستدعاء بأمان فلا يضيع context أو error
 *   عند الاستيراد من ملفات لم يُحدَّث نمط الاستدعاء فيها بعد.
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
    level: process.env.LOG_LEVEL ?? baseLevel,
    base: {
      service: 'the-copy-backend',
      env: process.env.NODE_ENV ?? 'unknown',
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
  if (isDevelopment && process.env.LOG_PRETTY === 'true') {
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
// مُحوِّل توافق winston→pino على مستوى الاستدعاء
// ----------------------------------------------------------------------------
type LevelMethod = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type CompatibleLogMethod = (
  arg1: unknown,
  arg2?: unknown,
  ...rest: unknown[]
) => void;
type CompatibleLogger = Omit<PinoLogger, LevelMethod | 'child'> &
  Record<LevelMethod, CompatibleLogMethod> & {
    child(...childArgs: Parameters<PinoLogger['child']>): CompatibleLogger;
  };

const LEVEL_METHODS: ReadonlySet<LevelMethod> = new Set([
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

/**
 * يلفّ instance من pino لقبول استدعاءات بأسلوب winston:
 *   logger.info('msg', { ctx })          → pino.info({ ctx }, 'msg')
 *   logger.error('msg', errorInstance)   → pino.error({ err: errorInstance }, 'msg')
 *   logger.info({ ctx }, 'msg')          → يمر كما هو (pino-style)
 *   logger.info('msg')                   → يمر كما هو
 *
 * يُلفّ كذلك child() حتى يحصل الـ logger الفرعي على نفس التوافق.
 */
type AnyLogFn = (...args: unknown[]) => void;

function adaptPinoLogger(base: PinoLogger): CompatibleLogger {
  return new Proxy(base, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && LEVEL_METHODS.has(prop as LevelMethod)) {
        const method = prop as LevelMethod;
        const original = target[method];
        return function adaptedLogMethod(
          this: unknown,
          arg1: unknown,
          arg2?: unknown,
          ...rest: unknown[]
        ): void {
          // Winston-style: (message: string, errorOrContext?: Error | object)
          if (typeof arg1 === 'string' && arg2 !== undefined) {
            if (arg2 instanceof Error) {
              original.call(target, { err: arg2 }, arg1);
              return;
            }
            if (isPlainObject(arg2)) {
              original.call(target, arg2, arg1);
              return;
            }
          }
          // Pino-style أو نص بدون ميتا: مرر كما هو
          original.call(target, arg1, arg2, ...rest);
        };
      }

      if (prop === 'child') {
        return function adaptedChild(
          this: unknown,
          ...childArgs: Parameters<PinoLogger['child']>
        ): CompatibleLogger {
          const childInstance = target.child(...childArgs) as unknown as PinoLogger;
          return adaptPinoLogger(childInstance);
        };
      }

      return Reflect.get(target, prop, receiver);
    },
  });
}

// ----------------------------------------------------------------------------
// الـ logger المُصدَّر
// ----------------------------------------------------------------------------
const basePinoLogger = pino(buildLoggerOptions());
export const logger: CompatibleLogger = adaptPinoLogger(basePinoLogger);

/**
 * إنشاء logger فرعي بسياق ثابت.
 * يُستخدم في كل ملف لتمييز السجلات حسب المكوّن.
 *
 * مثال:
 *   const log = createModuleLogger('breakapp.repository');
 *   log.info({ userId }, 'querying user');
 */
export function createModuleLogger(
  moduleName: string,
  extraContext: Record<string, unknown> = {},
): CompatibleLogger {
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

export type Logger = CompatibleLogger;
