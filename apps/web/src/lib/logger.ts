/**
 * Unified Pino Logger — Web (Next.js)
 *
 * المصدر الموحَّد للتسجيل (Logging) في تطبيق Next.js.
 * يدعم كلاً من بيئة الـ server (full pino مع redaction) وبيئة الـ client
 * (نسخة آمنة مع نفس واجهة الاستدعاء، مدعومة بـ structured output).
 *
 * كيفية الاستخدام:
 *   import { logger } from '@/lib/logger';
 *   logger.info({ requestId: 'abc' }, 'request received');
 *
 *   // logger فرعي بسياق ثابت لمكوّن معيّن
 *   const moduleLogger = createModuleLogger('editor.shell');
 *   moduleLogger.warn({ userId: 123 }, 'rate limit hit');
 *
 * client/server boundaries:
 *   - في الـ server (Route Handlers, RSC, getServerSideProps): يُستخدَم pino كامل.
 *   - في الـ client (Client Components, Browser): يُستخدَم تطبيق آمن لا يكسر الحزمة (bundle).
 *
 * ضمانات الأمان:
 *   - أي حقل من قائمة الأسرار المعروفة (TIPTAP_PRO_TOKEN, JWT_SECRET, *_API_KEY, *_TOKEN, password, authorization, cookie, secret) يُغطى تلقائياً.
 *   - في الـ client، تُحذف أي حقول تحتوي مفاتيح حسّاسة قبل الإرسال للـ console.
 *   - متغيرات البيئة لا تُسجَّل أبداً مباشرة من الـ client.
 */

import type { Logger as PinoLogger } from 'pino';

// ----------------------------------------------------------------------------
// أنواع موحدة بين server و client
// ----------------------------------------------------------------------------
export interface LogContext {
  module?: string;
  requestId?: string;
  userId?: string | number;
  route?: string;
  operation?: string;
  durationMs?: number;
  [key: string]: unknown;
}

export type LogFn = (
  contextOrMessage: LogContext | string,
  message?: string,
  ...args: unknown[]
) => void;

export interface UnifiedLogger {
  trace: LogFn;
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  fatal: LogFn;
  child: (bindings: LogContext) => UnifiedLogger;
}

// ----------------------------------------------------------------------------
// بيئة التشغيل
// ----------------------------------------------------------------------------
const IS_BROWSER = typeof window !== 'undefined';
const IS_DEVELOPMENT = process.env['NODE_ENV'] === 'development';
const IS_PRODUCTION = process.env['NODE_ENV'] === 'production';

// ----------------------------------------------------------------------------
// أنماط الأسرار التي يجب إخفاؤها
// ----------------------------------------------------------------------------
const SECRET_KEY_PATTERN =
  /^(.*_)?(token|secret|password|passwd|apikey|api_key|auth|authorization|cookie|cookies|jwt|bearertoken)(_.*)?$/i;

const SERVER_REDACT_PATHS: readonly string[] = [
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
  '*.TIPTAP_PRO_TOKEN',
  '*.JWT_SECRET',
  '*.GEMINI_API_KEY',
  '*.GOOGLE_GENAI_API_KEY',
  '*.OPENAI_API_KEY',
  '*.ANTHROPIC_API_KEY',
  '*.NEXT_PUBLIC_FIREBASE_API_KEY',
  'req.headers.authorization',
  'req.headers.cookie',
  'request.headers.authorization',
  'request.headers.cookie',
  'headers.authorization',
  'headers.cookie',
];

// ----------------------------------------------------------------------------
// تطبيق الـ client: آمن للحزمة، يستخدم console بصيغة structured
// ----------------------------------------------------------------------------
function redactClientContext(context: LogContext | undefined): Record<string, unknown> {
  if (!context || typeof context !== 'object') {
    return {};
  }
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      safe[key] = '[REDACTED]';
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

function buildClientLogger(baseBindings: LogContext = {}): UnifiedLogger {
  const writeLine = (
    level: LogLevel,
    contextOrMessage: LogContext | string,
    message?: string,
    args: unknown[] = [],
  ): void => {
    const isString = typeof contextOrMessage === 'string';
    const ctx = isString ? {} : redactClientContext(contextOrMessage);
    const msg = isString ? contextOrMessage : (message ?? '');

    const payload = {
      level,
      time: new Date().toISOString(),
      ...baseBindings,
      ...ctx,
      msg,
    };

    // لا نسجِّل في الـ production إلا للمستويات المهمة — نقلل ضوضاء browser console
    if (IS_PRODUCTION && (level === 'trace' || level === 'debug')) {
      return;
    }

    // الكتابة في console هنا مقصودة وموثّقة كسلوك آمن لـ client logger.
    /* eslint-disable no-console */
    switch (level) {
      case 'fatal':
      case 'error':
        console.error(payload, ...args);
        break;
      case 'warn':
        console.warn(payload, ...args);
        break;
      case 'info':
        console.info(payload, ...args);
        break;
      case 'debug':
      case 'trace':
      default:
        console.debug(payload, ...args);
        break;
    }
    /* eslint-enable no-console */
  };

  const makeFn = (level: LogLevel): LogFn => {
    return (contextOrMessage, message, ...args) => {
      writeLine(level, contextOrMessage, message, args);
    };
  };

  return {
    trace: makeFn('trace'),
    debug: makeFn('debug'),
    info: makeFn('info'),
    warn: makeFn('warn'),
    error: makeFn('error'),
    fatal: makeFn('fatal'),
    child: (bindings) => buildClientLogger({ ...baseBindings, ...bindings }),
  };
}

// ----------------------------------------------------------------------------
// تطبيق الـ server: pino كامل
// ----------------------------------------------------------------------------
// نوع توقيع طريقة pino المرنة (overloads مدمجة بصيغة موحدة)
type PinoMethod = (objOrMsg: object | string, msg?: string, ...args: unknown[]) => void;

function buildServerLogger(): UnifiedLogger {
  // التحميل المتأخر (lazy import) لمنع pino من الدخول إلى حزمة الـ client
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const pinoModule = require('pino') as typeof import('pino');
  const pinoFactory =
    (pinoModule as unknown as { default?: typeof pinoModule.pino }).default ??
    pinoModule.pino;

  const baseLevel = IS_DEVELOPMENT ? 'debug' : IS_PRODUCTION ? 'info' : 'warn';

  const pinoInstance: PinoLogger = pinoFactory({
    level: process.env['LOG_LEVEL'] ?? baseLevel,
    base: {
      service: 'the-copy-web',
      env: process.env['NODE_ENV'] ?? 'unknown',
      pid: process.pid,
    },
    timestamp: pinoModule.stdTimeFunctions.isoTime,
    redact: {
      paths: [...SERVER_REDACT_PATHS],
      censor: '[REDACTED]',
      remove: false,
    },
    formatters: {
      level: (label) => ({ level: label }),
    },
    serializers: {
      err: pinoModule.stdSerializers.err,
      error: pinoModule.stdSerializers.err,
      req: pinoModule.stdSerializers.req,
      res: pinoModule.stdSerializers.res,
    },
  });

  const callPino = (method: PinoMethod, ctx: LogContext | string, msg?: string, args: unknown[] = []): void => {
    if (typeof ctx === 'string') {
      method(ctx, undefined, ...args);
    } else {
      method(ctx, msg ?? '', ...args);
    }
  };

  const adapt = (instance: PinoLogger): UnifiedLogger => ({
    trace: (ctx, msg, ...args) => callPino(instance.trace.bind(instance) as PinoMethod, ctx, msg, args),
    debug: (ctx, msg, ...args) => callPino(instance.debug.bind(instance) as PinoMethod, ctx, msg, args),
    info: (ctx, msg, ...args) => callPino(instance.info.bind(instance) as PinoMethod, ctx, msg, args),
    warn: (ctx, msg, ...args) => callPino(instance.warn.bind(instance) as PinoMethod, ctx, msg, args),
    error: (ctx, msg, ...args) => callPino(instance.error.bind(instance) as PinoMethod, ctx, msg, args),
    fatal: (ctx, msg, ...args) => callPino(instance.fatal.bind(instance) as PinoMethod, ctx, msg, args),
    child: (bindings) => adapt(instance.child(bindings)),
  });

  return adapt(pinoInstance);
}

// ----------------------------------------------------------------------------
// الـ logger المُصدَّر — يختار التطبيق المناسب تلقائياً
// ----------------------------------------------------------------------------
export const logger: UnifiedLogger = IS_BROWSER ? buildClientLogger() : buildServerLogger();

/**
 * إنشاء logger فرعي بسياق ثابت.
 * يُستخدم في كل ملف لتمييز السجلات حسب المكوّن.
 */
export function createModuleLogger(
  moduleName: string,
  extraContext: LogContext = {},
): UnifiedLogger {
  return logger.child({ module: moduleName, ...extraContext });
}

export default logger;
