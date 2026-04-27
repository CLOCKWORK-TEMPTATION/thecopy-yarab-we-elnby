import { logger } from "@/lib/logger";
/**
 * @module utils/logger
 * @description مسجّل أحداث مركزي بأربعة مستويات (info, warn, error, debug).
 * مستوى debug مقيّد ببيئة التطوير فقط عبر
 * `process.env["NODE_ENV"]`.
 * يدعم نطاقات (scopes) لتسهيل تتبّع مصدر الرسالة.
 */

/**
 * مستويات التسجيل المتاحة.
 * - `info` — رسائل إعلامية عامة
 * - `warn` — تحذيرات غير حرجة
 * - `error` — أخطاء تتطلب انتباهاً
 * - `debug` — تفاصيل تصحيح (بيئة التطوير فقط)
 */
export type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * سياق إضافي يُمرّر مع كل رسالة تسجيل.
 * @property scope - اسم الوحدة أو النطاق (يُعرض بين أقواس مربعة)
 * @property data - بيانات تشخيصية إضافية تُطبع بجوار الرسالة
 */
export interface LogContext {
  scope?: string;
  data?: unknown;
  tags?: string[];
}

/** يسمح بتسجيل debug فقط في بيئة التطوير */
const canDebug = (): boolean => process.env.NODE_ENV === "development";

const TEST_QUIET_INFO_SCOPES = new Set([
  "paste.final-review",
  "MemoryManager",
  "document-context-graph",
  "retroactive-corrector",
  "self-reflection",
  "sequence-optimizer",
  "reverse-pass",
  "pipeline.telemetry",
  "ingestion-orchestrator",
  "editor-insertion",
  "import-state",
  "production-self-check",
  "command-engine",
  "pipeline.sanitized-import",
]);

const shouldSuppressTestDiagnosticInfo = (
  level: LogLevel,
  message: string,
  context?: LogContext
): boolean => {
  if (process.env.NODE_ENV !== "test") return false;
  if (process.env["ENABLE_TEST_DIAGNOSTIC_LOGS"] === "true") return false;
  if (level !== "info") return false;
  const scope = context?.scope ?? "";

  if (message.startsWith("diag:")) {
    return true;
  }

  if (message.startsWith("telemetry:") && TEST_QUIET_INFO_SCOPES.has(scope)) {
    return true;
  }

  return TEST_QUIET_INFO_SCOPES.has(scope);
};

/** يُضيف النطاق كبادئة `[scope]` للرسالة */
const withScope = (message: string, scope?: string): string => {
  if (!scope) return message;
  return `[${scope}] ${message}`;
};

const normalizeLogData = (data: unknown): unknown => {
  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: data.stack,
    };
  }
  return data;
};

const normalizeTags = (tags?: string[]): string =>
  Array.isArray(tags) && tags.length > 0 ? ` tags=${tags.join(",")}` : "";

const writeLog = (
  level: Exclude<LogLevel, "debug"> | "debug",
  message: string,
  context?: LogContext
): void => {
  if (shouldSuppressTestDiagnosticInfo(level, message, context)) {
    return;
  }

  const formatted = `${new Date().toISOString()} ${withScope(message, context?.scope)}${normalizeTags(context?.tags)}`;
  const payload = normalizeLogData(context?.data);

  if (level === "info") {
    logger.info(formatted, payload ?? "");
    return;
  }
  if (level === "warn") {
    logger.warn(formatted, payload ?? "");
    return;
  }
  if (level === "error") {
    logger.error(formatted, payload ?? "");
    return;
  }
  if (canDebug()) {
    console.debug(formatted, payload ?? "");
  }
};

/**
 * كائن المسجّل المركزي — يُستخدم بدلاً من `console.*` مباشرة.
 *
 * @example
 * ```ts
 * logger.info('تم تحميل الملف', { scope: 'file-import' })
 * logger.error('فشل الاستخراج', { scope: 'extract', data: err })
 * ```
 */
export const logger = {
  info(message: string, context?: LogContext): void {
    writeLog("info", message, context);
  },

  warn(message: string, context?: LogContext): void {
    writeLog("warn", message, context);
  },

  error(message: string, context?: LogContext): void {
    writeLog("error", message, context);
  },

  debug(message: string, context?: LogContext): void {
    writeLog("debug", message, context);
  },

  telemetry(
    event: string,
    data?: unknown,
    context?: Omit<LogContext, "data">
  ): void {
    const logContext: LogContext = { data };
    if (context?.scope !== undefined) logContext.scope = context.scope;
    if (context?.tags !== undefined) logContext.tags = context.tags;
    writeLog("info", `telemetry:${event}`, logContext);
  },

  createScope(scope: string) {
    return {
      info: (message: string, data?: unknown): void =>
        logger.info(message, { scope, data }),
      warn: (message: string, data?: unknown): void =>
        logger.warn(message, { scope, data }),
      error: (message: string, data?: unknown): void =>
        logger.error(message, { scope, data }),
      debug: (message: string, data?: unknown): void =>
        logger.debug(message, { scope, data }),
      telemetry: (event: string, data?: unknown): void =>
        logger.telemetry(event, data, { scope }),
    };
  },
};
