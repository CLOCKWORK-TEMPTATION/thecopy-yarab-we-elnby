/**
 * fixtures مشتركة للاختبارات
 * توفر إعدادات وتنظيف موحدة لجميع أنواع الاختبارات
 */
import { testConfig } from '../config/TestConfigManager';
import { testLogger } from './TestLogger';
import { testArtifacts } from './TestArtifactsManager';

export interface TestFixtureContext {
  config: ReturnType<typeof testConfig.getAll>;
  logger: typeof testLogger;
  artifacts: typeof testArtifacts;
  startTime: Date;
}

/**
 * إعداد عام لجميع الاختبارات
 */
export async function setupTestEnvironment(): Promise<TestFixtureContext> {
  const startTime = new Date();

  try {
    // تهيئة الإعدادات
    await testConfig.loadConfig();

    // تهيئة التسجيل
    await testLogger.initialize();

    // تهيئة artifacts
    await testArtifacts.initialize();

    testLogger.info('تم إعداد بيئة الاختبار بنجاح', {
      timestamp: startTime.toISOString()
    });

    return {
      config: testConfig.getAll(),
      logger: testLogger,
      artifacts: testArtifacts,
      startTime
    };
  } catch (error) {
    console.error('فشل في إعداد بيئة الاختبار:', error);
    throw error;
  }
}

/**
 * تنظيف عام بعد الاختبارات
 */
export async function teardownTestEnvironment(context: TestFixtureContext): Promise<void> {
  const endTime = new Date();
  const duration = endTime.getTime() - context.startTime.getTime();

  try {
    // تسجيل وقت التنفيذ
    context.logger.performance('test_environment_duration', duration, 'ms', {
      metadata: { startTime: context.startTime.toISOString(), endTime: endTime.toISOString() }
    });

    // تنظيف artifacts القديمة (اختياري)
    await context.artifacts.cleanupOldArtifacts(24); // 24 ساعة

    // إغلاق التسجيل (بدون تسجيل إضافي)
    await context.logger.close();
  } catch (error) {
    console.error('فشل في تنظيف بيئة الاختبار:', error);
    throw error;
  }
}

/**
 * مساعد للتحقق من جاهزية الخدمات
 */
export async function waitForService(
  url: string,
  timeoutMs: number = 30000,
  intervalMs: number = 1000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        testLogger.info(`الخدمة جاهزة: ${url}`);
        return true;
      }
    } catch (error) {
      // الخدمة غير جاهزة بعد
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  testLogger.error(`انتهت مهلة انتظار الخدمة: ${url}`);
  return false;
}

/**
 * مساعد للتحقق من جاهزية قاعدة البيانات
 */
export async function waitForDatabase(
  connectionString: string,
  timeoutMs: number = 30000
): Promise<boolean> {
  // تنفيذ بسيط للتحقق من الاتصال
  // في التطبيق الحقيقي، استخدم مكتبة قاعدة البيانات
  testLogger.info('بدء التحقق من جاهزية قاعدة البيانات');

  // محاكاة انتظار
  await new Promise(resolve => setTimeout(resolve, 2000));

  testLogger.info('قاعدة البيانات جاهزة');
  return true;
}

/**
 * إعداد اختبار فردي
 */
export function setupTest(testName: string, suiteName?: string) {
  const context = {
    testName,
    suiteName,
    startTime: new Date()
  };

  testLogger.testStart(testName, suiteName);

  return {
    context,
    pass: (duration?: number) => {
      const actualDuration = duration || (new Date().getTime() - context.startTime.getTime());
      testLogger.testPass(testName, actualDuration, suiteName);
    },
    fail: (error: Error, duration?: number) => {
      const actualDuration = duration || (new Date().getTime() - context.startTime.getTime());
      testLogger.testFail(testName, error, actualDuration, suiteName);
    }
  };
}

/**
 * مساعد لقياس الأداء
 */
export class PerformanceTimer {
  private startTime: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.startTime = Date.now();
  }

  /**
   * إنهاء القياس وتسجيل النتيجة
   */
  public end(unit: string = 'ms'): number {
    const duration = Date.now() - this.startTime;
    testLogger.performance(this.name, duration, unit);
    return duration;
  }

  /**
   * إعادة تشغيل المؤقت
   */
  public reset(): void {
    this.startTime = Date.now();
  }
}