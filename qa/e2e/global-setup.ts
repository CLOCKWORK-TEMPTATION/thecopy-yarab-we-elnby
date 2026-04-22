/**
 * إعداد عام لاختبارات E2E
 */
import { testConfig } from '../config/TestConfigManager';
import { testLogger } from '../core/TestLogger';
import { testArtifacts } from '../core/TestArtifactsManager';
import { setupTestEnvironment } from '../core/TestFixtures';

async function globalSetup() {
  console.log('بدء إعداد اختبارات E2E...');

  try {
    // إعداد بيئة الاختبار
    await setupTestEnvironment();

    // تسجيل بدء الاختبارات
    testLogger.info('بدء إعداد اختبارات E2E', {
      timestamp: new Date().toISOString(),
      baseURL: testConfig.get('PLAYWRIGHT_BASE_URL')
    });

    console.log('تم إعداد اختبارات E2E بنجاح');
  } catch (error) {
    console.error('فشل في إعداد اختبارات E2E:', error);
    throw error;
  }
}

export default globalSetup;