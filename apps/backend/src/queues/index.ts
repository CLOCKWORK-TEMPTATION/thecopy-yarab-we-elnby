/**
 * نقطة الدخول لنظام قوائم الانتظار
 * Queue System Entry Point
 *
 * @module queues
 * @description
 * يقوم بتهيئة جميع العمال وتصدير أدوات قوائم الانتظار.
 * يدعم معالجة المهام في الخلفية باستخدام BullMQ و Redis.
 */

import { isRedisEnabled } from "@/config/redis-gate";
import { checkRedisVersion } from "@/config/redis.config";
import { logger } from "@/lib/logger";

import { registerAIAnalysisWorker } from "./jobs/ai-analysis.job";
import { registerCacheWarmingWorker } from "./jobs/cache-warming.job";
import { registerDocumentProcessingWorker } from "./jobs/document-processing.job";
import { queueManager } from "./queue.config";

/** حالة تفعيل نظام قوائم الانتظار */
let queueSystemEnabled = false;

/**
 * تهيئة جميع العمال
 *
 * @description
 * يتحقق من توافق إصدار Redis ثم يسجل جميع معالجات المهام.
 * في حالة عدم التوافق، يتم تعطيل نظام قوائم الانتظار مع استمرار عمل التطبيق.
 *
 * @returns وعد يكتمل عند انتهاء التهيئة
 */
export async function initializeWorkers(): Promise<void> {
  if (!isRedisEnabled()) {
    logger.info("Queue workers skipped — Redis is disabled");
    return;
  }

  logger.info("بدء تهيئة نظام قوائم الانتظار");

  // التحقق من توافق إصدار Redis
  const versionCheck = await checkRedisVersion();

  if (!versionCheck.compatible) {
    logger.warn("إصدار Redis غير متوافق مع BullMQ", {
      currentVersion: versionCheck.version,
      requiredVersion: versionCheck.minVersion,
      reason: versionCheck.reason,
    });

    logger.warn(
      "تم تعطيل نظام قوائم الانتظار. التطبيق سيستمر في العمل بدون المهام الخلفية. " +
        "لتفعيل النظام: قم بترقية Redis إلى الإصدار المطلوب أو استخدم خدمة Redis سحابية.",
    );

    queueSystemEnabled = false;
    return;
  }

  logger.info("إصدار Redis متوافق مع BullMQ", {
    version: versionCheck.version,
  });

  // تسجيل جميع معالجات المهام
  registerAIAnalysisWorker();
  registerDocumentProcessingWorker();
  registerCacheWarmingWorker();

  queueSystemEnabled = true;
  logger.info("تم تهيئة جميع عمال قوائم الانتظار بنجاح");
}

/**
 * التحقق من حالة تفعيل نظام قوائم الانتظار
 *
 * @description
 * يُستخدم للتحقق مما إذا كان نظام قوائم الانتظار مفعلاً
 * قبل محاولة إضافة مهام جديدة
 *
 * @returns قيمة منطقية تشير إلى حالة التفعيل
 */
export function isQueueSystemEnabled(): boolean {
  return queueSystemEnabled;
}

/**
 * إيقاف جميع العمال وقوائم الانتظار
 *
 * @description
 * يقوم بإغلاق جميع الاتصالات والموارد بشكل نظيف
 *
 * @returns وعد يكتمل عند انتهاء الإيقاف
 */
export async function shutdownQueues(): Promise<void> {
  logger.info("بدء إيقاف نظام قوائم الانتظار");
  await queueManager.close();
  logger.info("تم إيقاف نظام قوائم الانتظار بنجاح");
}

// تصدير مدير قوائم الانتظار ووظائف المهام
export { queueManager, QueueName } from "./queue.config";
export { queueAIAnalysis } from "./jobs/ai-analysis.job";
export { queueDocumentProcessing } from "./jobs/document-processing.job";
export { queueCacheWarming } from "./jobs/cache-warming.job";

export const queues = {
  initializeWorkers,
  shutdownQueues,
  queueManager,
  isQueueSystemEnabled,
};
