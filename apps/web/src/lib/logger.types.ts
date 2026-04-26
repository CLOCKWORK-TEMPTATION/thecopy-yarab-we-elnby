/**
 * أنواع موحَّدة بين تطبيقَي client و server للـ logger.
 * هذا الملف خالٍ من الاعتماديات على pino لتجنّب سحبه إلى bundle المتصفح.
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

export type LogFn = (
  contextOrMessage: LogContext | string,
  messageOrMeta?: unknown,
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

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";
