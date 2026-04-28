/**
 * @deprecated استخدم `@/lib/logger` مباشرة في الكود الجديد.
 *
 * هذا الملف shim للتوافق العكسي:
 * كان يحتوي تطبيقاً قائماً على winston، وحُوِّل ليعيد تصدير الـ pino logger
 * الموحَّد من `@/lib/logger` بدون كسر الاستدعاءات الموجودة.
 *
 * المُحوِّل في `@/lib/logger` يلتقط نمطَي الاستدعاء:
 *   - winston-style: logger.info('msg', { ctx })
 *   - pino-style:    logger.info({ ctx }, 'msg')
 *
 * لذلك أي ملف ما زال يستورد من هذا المسار يستمر في العمل بسلوك مكافئ
 * (مع تحسينات pino في الأداء، الـ structured output، والـ redaction).
 *
 * مسار الترقية الموصى به: استبدل
 *   `import { logger } from '../utils/logger';`
 * بـ:
 *   `import { logger } from '@/lib/logger';`
 */

export {
  logger,
  createModuleLogger,
  type Logger,
  type LogContext,
} from "@/lib/logger";
