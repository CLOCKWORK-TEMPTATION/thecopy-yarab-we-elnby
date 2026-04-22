/**
 * مساعد إدارة artifacts للاختبارات
 * يوفر آليات موحدة لحفظ screenshots، traces، videos، وlogs
 */
import fs from 'fs/promises';
import path from 'path';
import { testConfig } from '../config/TestConfigManager';
import { testLogger } from './TestLogger';

export interface ArtifactOptions {
  testName: string;
  testSuite?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

/**
 * مدير artifacts للاختبارات
 */
export class TestArtifactsManager {
  private static instance: TestArtifactsManager;
  private initialized = false;
  private artifactPaths: ReturnType<typeof testConfig.getArtifactPaths>;

  private constructor() {
    this.artifactPaths = {} as any;
  }

  /**
   * الحصول على مثيل واحد
   */
  public static getInstance(): TestArtifactsManager {
    if (!TestArtifactsManager.instance) {
      TestArtifactsManager.instance = new TestArtifactsManager();
    }
    return TestArtifactsManager.instance;
  }

  /**
   * تهيئة المدير
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await testConfig.loadConfig();
      this.artifactPaths = testConfig.getArtifactPaths();

      // التأكد من وجود المجلدات
      await this.ensureDirectories();

      this.initialized = true;
      testLogger.info('تم تهيئة TestArtifactsManager بنجاح');
    } catch (error) {
      testLogger.logError(error as Error, { metadata: { operation: 'initialize' } });
      throw error;
    }
  }

  /**
   * حفظ screenshot
   */
  public async saveScreenshot(
    buffer: Buffer,
    filename: string,
    options: ArtifactOptions
  ): Promise<string> {
    await this.ensureInitialized();
    const filepath = await this.prepareFilePath('screenshots', filename, options);
    await fs.writeFile(filepath, buffer);
    testLogger.debug(`تم حفظ screenshot: ${filepath}`, {
      testName: options.testName,
      metadata: { filepath, ...options.metadata }
    });
    return filepath;
  }

  /**
   * حفظ trace
   */
  public async saveTrace(
    content: string | Buffer,
    filename: string,
    options: ArtifactOptions
  ): Promise<string> {
    await this.ensureInitialized();
    const filepath = await this.prepareFilePath('traces', filename, options);
    await fs.writeFile(filepath, content);
    testLogger.debug(`تم حفظ trace: ${filepath}`, {
      testName: options.testName,
      metadata: { filepath, ...options.metadata }
    });
    return filepath;
  }

  /**
   * حفظ video
   */
  public async saveVideo(
    buffer: Buffer,
    filename: string,
    options: ArtifactOptions
  ): Promise<string> {
    await this.ensureInitialized();
    const filepath = await this.prepareFilePath('videos', filename, options);
    await fs.writeFile(filepath, buffer);
    testLogger.debug(`تم حفظ video: ${filepath}`, {
      testName: options.testName,
      metadata: { filepath, ...options.metadata }
    });
    return filepath;
  }

  /**
   * حفظ log إضافي
   */
  public async saveLog(
    content: string,
    filename: string,
    options: ArtifactOptions
  ): Promise<string> {
    await this.ensureInitialized();
    const filepath = await this.prepareFilePath('logs', filename, options);
    await fs.writeFile(filepath, content);
    testLogger.debug(`تم حفظ log: ${filepath}`, {
      testName: options.testName,
      metadata: { filepath, ...options.metadata }
    });
    return filepath;
  }

  /**
   * حفظ ملف JSON
   */
  public async saveJson(
    data: any,
    filename: string,
    options: ArtifactOptions
  ): Promise<string> {
    await this.ensureInitialized();
    const filepath = await this.prepareFilePath('base', filename, options);
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(filepath, content, 'utf-8');
    testLogger.debug(`تم حفظ JSON: ${filepath}`, {
      testName: options.testName,
      metadata: { filepath, ...options.metadata }
    });
    return filepath;
  }

  /**
   * تنظيف artifacts القديمة
   */
  public async cleanupOldArtifacts(maxAgeHours: number = 24): Promise<void> {
    try {
      await this.ensureInitialized();
      const now = Date.now();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

      for (const [key, dirPath] of Object.entries(this.artifactPaths)) {
        if (key === 'base') continue; // لا نحذف base

        const files = await fs.readdir(dirPath).catch(() => []);
        for (const file of files) {
          const filepath = path.join(dirPath, file);
          const stats = await fs.stat(filepath);
          if (now - stats.mtime.getTime() > maxAgeMs) {
            await fs.unlink(filepath);
            testLogger.debug(`تم حذف artifact قديم: ${filepath}`);
          }
        }
      }
    } catch (error) {
      testLogger.logError(error as Error, { metadata: { operation: 'cleanup' } });
    }
  }

  /**
   * الحصول على مسارات artifacts
   */
  public getPaths(): typeof this.artifactPaths {
    return { ...this.artifactPaths };
  }

  /**
   * التأكد من أن المدير مهيأ داخل العملية الحالية.
   * لا يكفي globalSetup في Playwright لأنه يعمل في عملية منفصلة عن العمال.
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    await this.initialize();
  }

  /**
   * التأكد من وجود المجلدات
   */
  private async ensureDirectories(): Promise<void> {
    for (const dirPath of Object.values(this.artifactPaths)) {
      try {
        await fs.access(dirPath);
      } catch {
        await fs.mkdir(dirPath, { recursive: true });
        testLogger.debug(`تم إنشاء مجلد artifact: ${dirPath}`);
      }
    }
  }

  /**
   * توليد مسار ملف مع تنظيم
   */
  private async prepareFilePath(
    type: keyof typeof this.artifactPaths,
    filename: string,
    options: ArtifactOptions
  ): Promise<string> {
    const timestamp = options.timestamp || new Date();
    const dateStr = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = timestamp.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-'); // HH-MM-SS

    // تنظيم بالتاريخ والـ suite
    const subDir = options.testSuite ? path.join(dateStr, options.testSuite) : dateStr;
    const dirPath = path.join(this.artifactPaths[type], subDir);

    // يجب انتظار إنشاء المجلد الفرعي لتجنب سباق الكتابة داخل عمال Playwright.
    await fs.mkdir(dirPath, { recursive: true });

    // إضافة timestamp للملف
    const ext = path.extname(filename);
    const name = path.basename(filename, ext);
    const timestampedName = `${name}_${timeStr}${ext}`;

    return path.join(dirPath, timestampedName);
  }

  /**
   * إعادة تعيين المدير (للاختبارات)
   */
  public static resetInstance(): void {
    TestArtifactsManager.instance = null as any;
  }
}

// تصدير مثيل واحد
export const testArtifacts = TestArtifactsManager.getInstance();
