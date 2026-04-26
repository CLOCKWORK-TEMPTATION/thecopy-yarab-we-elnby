/**
 * Unified Logger — Web (Next.js)
 *
 * المصدر الموحَّد للتسجيل (Logging) في تطبيق Next.js.
 * يكتشف بيئة التشغيل تلقائياً ويستخدم التطبيق المناسب:
 *   - الـ server (Route Handlers, RSC, Server Actions): pino كامل عبر logger.server.ts
 *   - الـ client (Client Components, Browser): تطبيق آمن للحزمة عبر logger.client.ts
 *
 * كيفية الاستخدام:
 *   import { logger, createModuleLogger } from '@/lib/logger';
 *   logger.info({ requestId: 'abc' }, 'request received');
 *
 *   const moduleLogger = createModuleLogger('editor.shell');
 *   moduleLogger.warn({ userId: 123 }, 'rate limit hit');
 *
 * مستويات التسجيل المدعومة:
 *   trace → debug → info → warn → error → fatal
 *
 * ضمانات الأمان:
 *   - حقول الأسرار المعروفة (tokens, secrets, passwords, authorization, cookies, *_API_KEY) تُغطى تلقائياً.
 *   - في الـ client، تُحذف أي حقول حساسة قبل الإرسال للـ console.
 *   - متغيرات البيئة لا تُسجَّل مباشرة من الـ client.
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

const IS_BROWSER = typeof window !== "undefined";

/**
 * بناء الـ logger المناسب لبيئة التشغيل الحالية.
 * نستخدم استيراداً مشروطاً لـ logger.server حتى لا يدخل في bundle الـ client.
 */
function buildLogger(): UnifiedLogger {
  if (IS_BROWSER) {
    return buildClientLogger();
  }
  // استيراد ديناميكي على مستوى الـ module (يعمل في server فقط)
  // نسخة pino محمَّلة كسلوك server-only ومعزولة عن المتصفح بـ 'server-only' داخل ملفها.
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- مطلوب لتحميل سيرفر-only متأخر بدون كسر بناء الـ client
  const serverModule =
    require("./logger.server") as typeof import("./logger.server");
  return serverModule.buildServerLogger();
}

export const logger: UnifiedLogger = buildLogger();

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
