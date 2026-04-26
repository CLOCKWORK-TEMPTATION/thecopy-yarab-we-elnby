/**
 * @deprecated استخدم `@/lib/logger` مباشرة في الكود الجديد.
 *
 * هذا الملف shim للتوافق العكسي:
 * كان يحتوي تطبيق Logger مستقل قائم على console.* مع شعار [TIMESTAMP] LEVEL: msg.
 * حُوِّل ليعيد تصدير الـ pino-based unified logger من `@/lib/logger`.
 *
 * كل الاستدعاءات الموجودة بصيغة `logger.info('msg', meta)` تظل تعمل بفضل
 * مُحوِّل الاستدعاء (Proxy adapter) داخل `@/lib/logger` الذي يدعم نمطَي winston و pino.
 *
 * يُحتفَظ بصِنف Logger القديم وواجهة LogLevel للتوافق مع أي استهلاك خارجي،
 * لكنهما يفوّضان للوغر الموحَّد بدلاً من الكتابة المباشرة في console.
 */

import { createModuleLogger, logger as unifiedLogger } from '@/lib/logger';

import type { UnifiedLogger } from '@/lib/logger';

// إعادة تصدير الـ logger الموحَّد كاسم متوافق
export const logger: UnifiedLogger = unifiedLogger;
export default logger;

// واجهة LogLevel القديمة للحفاظ على التوافق
export interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

const LEVEL_MAP: Record<keyof LogLevel, 'error' | 'warn' | 'info' | 'debug'> = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

const LEVEL_PRIORITY: Record<keyof LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * صِنف Logger القديم — يُفوِّض للوغر الموحَّد عبر child logger.
 * يحافظ على واجهة `setLevel` رغم أن pino لا يدعم تغيير المستوى لكل instance بنفس الطريقة؛
 * يتم تجاهل سجلات أقل من المستوى المضبوط في هذا الـ shim بدلاً من تمريرها.
 */
export class Logger {
  private readonly child: UnifiedLogger;
  private logLevel: keyof LogLevel = 'INFO';

  constructor(scope = 'legacy-logger') {
    this.child = createModuleLogger(scope);
  }

  setLevel(level: keyof LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: keyof LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.logLevel];
  }

  error(message: string, meta?: unknown): void {
    if (!this.shouldLog('ERROR')) return;
    this.child.error(this.coerceMeta(meta), message);
  }

  warn(message: string, meta?: unknown): void {
    if (!this.shouldLog('WARN')) return;
    this.child.warn(this.coerceMeta(meta), message);
  }

  info(message: string, meta?: unknown): void {
    if (!this.shouldLog('INFO')) return;
    this.child.info(this.coerceMeta(meta), message);
  }

  debug(message: string, meta?: unknown): void {
    if (!this.shouldLog('DEBUG')) return;
    this.child.debug(this.coerceMeta(meta), message);
  }

  private coerceMeta(meta: unknown): Record<string, unknown> {
    if (meta === undefined || meta === null) {
      return {};
    }
    if (typeof meta === 'object' && !Array.isArray(meta)) {
      return meta as Record<string, unknown>;
    }
    return { meta };
  }
}

// مُساعد لتأكيد أن LEVEL_MAP يستخدم لو تم استدعاؤه (يُمنع warning من tree-shaker الصارم)
export const __LEGACY_LEVEL_MAP = LEVEL_MAP;
