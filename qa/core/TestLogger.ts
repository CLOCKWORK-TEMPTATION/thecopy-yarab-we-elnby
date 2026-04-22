/**
 * نظام تسجيل احترافي للاختبارات
 * يوفر structured logging مع مستويات مختلفة وإخراج متعدد
 */
import winston from 'winston';
import path from 'path';
import { testConfig } from '../config/TestConfigManager';

export interface TestLogContext {
  testName?: string;
  testSuite?: string;
  timestamp?: string;
  duration?: number;
  error?: Error;
  metadata?: Record<string, any>;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * مدير التسجيل للاختبارات
 */
export class TestLogger {
  private static instance: TestLogger;
  private logger: winston.Logger;
  private initialized = false;

  private constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  /**
   * الحصول على مثيل واحد من المدير
   */
  public static getInstance(): TestLogger {
    if (!TestLogger.instance) {
      TestLogger.instance = new TestLogger();
    }
    return TestLogger.instance;
  }

  /**
   * تهيئة المدير مع إعدادات محددة
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const config = testConfig.getAll();

      // إضافة transport للملف
      this.logger.add(new winston.transports.File({
        filename: config.TEST_LOG_FILE,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      }));

      // تحديث مستوى التسجيل
      this.logger.level = config.TEST_LOG_LEVEL;

      this.initialized = true;
    } catch (error) {
      console.error('فشل في تهيئة TestLogger:', error);
      throw error;
    }
  }

  /**
   * تسجيل رسالة خطأ
   */
  public error(message: string, context?: TestLogContext): void {
    this.log('error', message, context);
  }

  /**
   * تسجيل رسالة تحذير
   */
  public warn(message: string, context?: TestLogContext): void {
    this.log('warn', message, context);
  }

  /**
   * تسجيل رسالة معلومات
   */
  public info(message: string, context?: TestLogContext): void {
    this.log('info', message, context);
  }

  /**
   * تسجيل رسالة تصحيح
   */
  public debug(message: string, context?: TestLogContext): void {
    this.log('debug', message, context);
  }

  /**
   * تسجيل بداية اختبار
   */
  public testStart(testName: string, suiteName?: string): void {
    this.info(`بدء الاختبار: ${testName}`, {
      testName,
      testSuite: suiteName,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * تسجيل نهاية اختبار ناجح
   */
  public testPass(testName: string, duration?: number, suiteName?: string): void {
    this.info(`نجاح الاختبار: ${testName}`, {
      testName,
      testSuite: suiteName,
      duration,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * تسجيل فشل اختبار
   */
  public testFail(testName: string, error: Error, duration?: number, suiteName?: string): void {
    this.error(`فشل الاختبار: ${testName}`, {
      testName,
      testSuite: suiteName,
      error,
      duration,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * تسجيل بداية suite
   */
  public suiteStart(suiteName: string): void {
    this.info(`بدء مجموعة الاختبارات: ${suiteName}`, {
      testSuite: suiteName,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * تسجيل نهاية suite
   */
  public suiteEnd(suiteName: string, results?: { passed: number; failed: number; total: number }): void {
    this.info(`انتهاء مجموعة الاختبارات: ${suiteName}`, {
      testSuite: suiteName,
      metadata: results,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * تسجيل خطأ عام
   */
  public logError(error: Error, context?: TestLogContext): void {
    this.error(`خطأ عام: ${error.message}`, {
      ...context,
      error
    });
  }

  /**
   * تسجيل معلومات الأداء
   */
  public performance(metric: string, value: number, unit: string, context?: TestLogContext): void {
    this.info(`مقياس الأداء: ${metric} = ${value} ${unit}`, {
      ...context,
      metadata: { metric, value, unit }
    });
  }

  /**
   * التسجيل العام
   */
  private log(level: LogLevel, message: string, context?: TestLogContext): void {
    if (!this.initialized) {
      // في حالة عدم التهيئة، استخدم console
      console.log(`[${level.toUpperCase()}] ${message}`, context);
      return;
    }

    this.logger.log(level, message, {
      ...context,
      timestamp: context?.timestamp || new Date().toISOString()
    });
  }

  /**
   * إغلاق المدير وتنظيف الموارد
   */
  public async close(): Promise<void> {
    if (this.logger) {
      await new Promise<void>((resolve) => {
        this.logger.end(() => resolve());
      });
    }
  }

  /**
   * إعادة تعيين المدير (للاختبارات)
   */
  public static resetInstance(): void {
    if (TestLogger.instance) {
      TestLogger.instance.close();
    }
    TestLogger.instance = null as any;
  }
}

// تصدير مثيل واحد للاستخدام
export const testLogger = TestLogger.getInstance();