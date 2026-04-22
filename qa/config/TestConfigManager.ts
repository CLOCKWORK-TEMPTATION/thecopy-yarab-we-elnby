/**
 * إدارة مركزية لإعدادات الاختبارات
 * يوفر آلية موحدة لقراءة متغيرات البيئة والإعدادات المطلوبة للاختبارات
 */
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';

// مخطط التحقق من متغيرات البيئة للاختبارات
const testEnvSchema = z.object({
  // إعدادات التطبيق الأساسية
  NODE_ENV: z.string().default('test'),
  APP_BASE_URL: z.string().url().optional(),
  BACKEND_BASE_URL: z.string().url().optional(),

  // إعدادات قاعدة البيانات للاختبارات الحقيقية
  DATABASE_URL: z.string().optional(),

  // إعدادات الاختبارات
  TEST_TIMEOUT: z.coerce.number().default(30000),
  TEST_PARALLEL_WORKERS: z.coerce.number().default(1),
  TEST_HEADLESS: z.coerce.boolean().default(true),

  // إعدادات Playwright
  PLAYWRIGHT_BASE_URL: z.string().url().default('http://localhost:5000'),
  PLAYWRIGHT_HEADLESS: z.coerce.boolean().default(true),
  PLAYWRIGHT_SLOW_MO: z.coerce.number().default(0),

  // إعدادات الـ logging
  TEST_LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  TEST_LOG_FILE: z.string().default('./test-results/logs/test.log'),

  // إعدادات artifacts
  TEST_ARTIFACTS_DIR: z.string().default('./test-results/artifacts'),
  TEST_SCREENSHOTS_DIR: z.string().default('./test-results/screenshots'),
  TEST_TRACES_DIR: z.string().default('./test-results/traces'),
  TEST_VIDEOS_DIR: z.string().default('./test-results/videos'),

  // إعدادات الوكلاء الخارجية (اختبارية فقط)
  AGENT_REVIEW_MODEL: z.string().default('mock:success'),
  FINAL_REVIEW_MODEL: z.string().default('mock:success'),

  // مفاتيح API للاختبارات (يجب أن تكون آمنة)
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

type TestEnvConfig = z.infer<typeof testEnvSchema>;

/**
 * مدير الإعدادات المركزي للاختبارات
 */
export class TestConfigManager {
  private static instance: TestConfigManager;
  private config: TestEnvConfig;
  private configLoaded = false;

  private constructor() {
    this.config = {} as TestEnvConfig;
  }

  /**
   * الحصول على مثيل واحد من مدير الإعدادات
   */
  public static getInstance(): TestConfigManager {
    if (!TestConfigManager.instance) {
      TestConfigManager.instance = new TestConfigManager();
    }
    return TestConfigManager.instance;
  }

  /**
   * تحميل وتحقق الإعدادات من متغيرات البيئة
   */
  public async loadConfig(): Promise<void> {
    try {
      // قراءة متغيرات البيئة
      const envVars = {
        NODE_ENV: process.env.NODE_ENV,
        APP_BASE_URL: process.env.APP_BASE_URL,
        BACKEND_BASE_URL: process.env.BACKEND_BASE_URL,
        DATABASE_URL: process.env.DATABASE_URL,
        TEST_TIMEOUT: process.env.TEST_TIMEOUT,
        TEST_PARALLEL_WORKERS: process.env.TEST_PARALLEL_WORKERS,
        TEST_HEADLESS: process.env.TEST_HEADLESS,
        PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL,
        PLAYWRIGHT_HEADLESS: process.env.PLAYWRIGHT_HEADLESS,
        PLAYWRIGHT_SLOW_MO: process.env.PLAYWRIGHT_SLOW_MO,
        TEST_LOG_LEVEL: process.env.TEST_LOG_LEVEL,
        TEST_LOG_FILE: process.env.TEST_LOG_FILE,
        TEST_ARTIFACTS_DIR: process.env.TEST_ARTIFACTS_DIR,
        TEST_SCREENSHOTS_DIR: process.env.TEST_SCREENSHOTS_DIR,
        TEST_TRACES_DIR: process.env.TEST_TRACES_DIR,
        TEST_VIDEOS_DIR: process.env.TEST_VIDEOS_DIR,
        AGENT_REVIEW_MODEL: process.env.AGENT_REVIEW_MODEL,
        FINAL_REVIEW_MODEL: process.env.FINAL_REVIEW_MODEL,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      };

      // التحقق من صحة البيانات
      this.config = testEnvSchema.parse(envVars);
      this.configLoaded = true;

      // التأكد من وجود مجلدات artifacts
      await this.ensureArtifactsDirectories();

    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('خطأ في التحقق من إعدادات الاختبارات:', error.errors);
        throw new Error(`إعدادات الاختبارات غير صالحة: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * الحصول على قيمة إعداد محدد
   */
  public get<K extends keyof TestEnvConfig>(key: K): TestEnvConfig[K] {
    if (!this.configLoaded) {
      throw new Error('يجب تحميل الإعدادات أولاً باستدعاء loadConfig()');
    }
    return this.config[key];
  }

  /**
   * الحصول على جميع الإعدادات
   */
  public getAll(): TestEnvConfig {
    if (!this.configLoaded) {
      throw new Error('يجب تحميل الإعدادات أولاً باستدعاء loadConfig()');
    }
    return { ...this.config };
  }

  /**
   * التحقق من أن الإعدادات مطلوبة متوفرة
   */
  public validateRequiredConfigs(requiredKeys: (keyof TestEnvConfig)[]): void {
    const missingKeys = requiredKeys.filter(key => !this.config[key]);
    if (missingKeys.length > 0) {
      throw new Error(`الإعدادات المطلوبة مفقودة: ${missingKeys.join(', ')}`);
    }
  }

  /**
   * التأكد من وجود مجلدات artifacts
   */
  private async ensureArtifactsDirectories(): Promise<void> {
    const dirs = [
      this.config.TEST_ARTIFACTS_DIR,
      this.config.TEST_SCREENSHOTS_DIR,
      this.config.TEST_TRACES_DIR,
      this.config.TEST_VIDEOS_DIR,
    ];

    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * الحصول على مسارات artifacts
   */
  public getArtifactPaths(): {
    base: string;
    screenshots: string;
    traces: string;
    videos: string;
    logs: string;
  } {
    return {
      base: this.config.TEST_ARTIFACTS_DIR,
      screenshots: this.config.TEST_SCREENSHOTS_DIR,
      traces: this.config.TEST_TRACES_DIR,
      videos: this.config.TEST_VIDEOS_DIR,
      logs: path.dirname(this.config.TEST_LOG_FILE),
    };
  }

  /**
   * إعادة تعيين المدير (للاختبارات)
   */
  public static resetInstance(): void {
    TestConfigManager.instance = null as any;
  }
}

// تصدير مثيل واحد للاستخدام
export const testConfig = TestConfigManager.getInstance();
