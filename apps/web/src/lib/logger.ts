/**
 * Bundle-safe logger for shared Next.js code.
 *
 * The pino implementation lives in logger.server.ts and must only be imported
 * by modules that cannot enter client or pages bundles. This universal entry
 * point intentionally uses the console adapter so error boundaries, client
 * modules, and shared utilities can import it safely.
 */

import { buildClientLogger } from "./logger.client";

import type { LogContext, UnifiedLogger } from "./logger.types";

// إعادة تصدير الأنواع للاستهلاك المباشر
export type {
  LogContext,
  LogFn,
  LogLevel,
  UnifiedLogger,
} from "./logger.types";

export const logger: UnifiedLogger = buildClientLogger();

/**
 * إنشاء logger فرعي بسياق ثابت.
 * يُستخدم في كل ملف لتمييز السجلات حسب المكوّن.
 */
export function createModuleLogger(
  moduleName: string,
  extraContext: LogContext = {}
): UnifiedLogger {
  return logger.child({ module: moduleName, ...extraContext });
}

export default logger;
