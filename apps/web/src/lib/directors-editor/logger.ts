/**
 * @deprecated استخدم `@/lib/logger` مباشرة في الكود الجديد.
 *
 * هذا الملف shim للتوافق العكسي:
 * كان يحتوي تطبيقاً مستقلاً يكتب JSON إلى console بنطاق "directors-editor-flow".
 * حُوِّل ليستخدم الـ pino logger الموحَّد من `@/lib/logger` تحت الغطاء،
 * مع الحفاظ على نفس واجهة الاستدعاء العامة:
 *
 *   directorsEditorLogger.info({ event, message, data? })
 *
 * كل سجل يُنشَر بحقل `module: 'directors-editor-flow'` تلقائياً عبر child logger.
 */

import { createModuleLogger } from '@/lib/logger';

interface DirectorsEditorLogContext {
  event: string;
  message: string;
  data?: Record<string, unknown>;
}

const baseLogger = createModuleLogger('directors-editor-flow');

function emit(
  level: 'info' | 'warn' | 'error',
  context: DirectorsEditorLogContext,
): void {
  const payload = {
    event: context.event,
    ...(context.data ?? {}),
  };
  baseLogger[level](payload, context.message);
}

export const directorsEditorLogger = {
  info(context: DirectorsEditorLogContext): void {
    emit('info', context);
  },
  warn(context: DirectorsEditorLogContext): void {
    emit('warn', context);
  },
  error(context: DirectorsEditorLogContext): void {
    emit('error', context);
  },
};
