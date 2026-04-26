/**
 * Client-safe logger للـ web (يعمل داخل المتصفح).
 * يكتب لـ console بصيغة structured مع إخفاء الأسرار، ولا يستخدم pino مطلقاً.
 */

import type {
  LogContext,
  LogFn,
  LogLevel,
  UnifiedLogger,
} from "./logger.types";

const SECRET_KEY_PATTERN =
  /^(.*_)?(token|secret|password|passwd|apikey|api_key|auth|authorization|cookie|cookies|jwt|bearertoken)(_.*)?$/i;

const IS_PRODUCTION = process.env.NODE_ENV === "production";

function redactClientContext(
  context: LogContext | undefined
): Record<string, unknown> {
  if (!context || typeof context !== "object") {
    return {};
  }
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      safe[key] = "[REDACTED]";
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

function isLogContext(value: unknown): value is LogContext {
  return (
    typeof value === "object" &&
    value !== null &&
    !(value instanceof Error) &&
    !Array.isArray(value)
  );
}

function contextFromMeta(value: unknown): LogContext | undefined {
  if (value instanceof Error) {
    return { err: value };
  }
  if (isLogContext(value)) {
    return value;
  }
  return undefined;
}

export function buildClientLogger(
  baseBindings: LogContext = {}
): UnifiedLogger {
  const writeLine = (
    level: LogLevel,
    contextOrMessage: LogContext | string,
    messageOrMeta?: unknown,
    args: unknown[] = []
  ): void => {
    const isString = typeof contextOrMessage === "string";
    const passthroughArgs = [...args];
    let ctx = isString ? {} : redactClientContext(contextOrMessage);
    let msg = isString ? contextOrMessage : "";

    if (isString) {
      const metaContext = contextFromMeta(messageOrMeta);
      if (metaContext) {
        ctx = redactClientContext(metaContext);
      } else if (messageOrMeta !== undefined) {
        passthroughArgs.unshift(messageOrMeta);
      }
    } else if (typeof messageOrMeta === "string") {
      msg = messageOrMeta;
    } else if (messageOrMeta !== undefined) {
      passthroughArgs.unshift(messageOrMeta);
    }

    const payload = {
      level,
      time: new Date().toISOString(),
      ...baseBindings,
      ...ctx,
      msg,
    };

    // تقليل الضوضاء في الإنتاج: لا نسجِّل المستويات المنخفضة
    if (IS_PRODUCTION && (level === "trace" || level === "debug")) {
      return;
    }

    const formatted = `[${level.toUpperCase()}] ${msg}`;

    // الكتابة في console هنا مقصودة وموثَّقة كسلوك آمن لـ client logger.
    // يتم منع no-console في باقي قاعدة الكود لكنه مسموح في هذا الملف
    // لأنه التطبيق الفعلي للوغر يكون في المتصفح حيث لا توجد بدائل.
    /* eslint-disable no-console */
    switch (level) {
      case "fatal":
      case "error":
        console.error(formatted, payload, ...passthroughArgs);
        break;
      case "warn":
        console.warn(formatted, payload, ...passthroughArgs);
        break;
      case "info":
        console.info(formatted, payload, ...passthroughArgs);
        break;
      case "debug":
      case "trace":
      default:
        console.debug(formatted, payload, ...passthroughArgs);
        break;
    }
    /* eslint-enable no-console */
  };

  const makeFn = (level: LogLevel): LogFn => {
    return (contextOrMessage, messageOrMeta, ...args) => {
      writeLine(level, contextOrMessage, messageOrMeta, args);
    };
  };

  return {
    trace: makeFn("trace"),
    debug: makeFn("debug"),
    info: makeFn("info"),
    warn: makeFn("warn"),
    error: makeFn("error"),
    fatal: makeFn("fatal"),
    child: (bindings) => buildClientLogger({ ...baseBindings, ...bindings }),
  };
}
