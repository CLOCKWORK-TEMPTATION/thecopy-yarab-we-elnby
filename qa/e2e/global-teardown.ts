/**
 * تنظيف عام بعد اختبارات E2E
 */
import { testLogger } from '../core/TestLogger';
import { teardownTestEnvironment } from '../core/TestFixtures';

async function globalTeardown() {
  console.log('بدء تنظيف اختبارات E2E...');

  try {
    // تسجيل انتهاء الاختبارات
    testLogger.info('انتهاء اختبارات E2E', {
      timestamp: new Date().toISOString()
    });

    // تنظيف بيئة الاختبار
    // ملاحظة: teardownTestEnvironment يغلق الlogger، لذا لا نستخدمه هنا
    await testLogger.close();

    console.log('تم تنظيف اختبارات E2E بنجاح');
  } catch (error) {
    console.error('فشل في تنظيف اختبارات E2E:', error);
    throw error;
  }
}

export default globalTeardown;