/**
 * Migration Scripts - سكربتات ترحيل البيانات
 *
 * سكربتات لترحيل البيانات من النظام القديم إلى النظام الجديد
 *
 * @module scripts/migrate-screenplay-data
 */

import { logger } from "@/lib/logger";
import { ScreenplayClassifier } from "@/lib/screenplay/classifier";

/**
 * تنسيق السيناريو القديم
 */
export interface OldScreenplayFormat {
  id: string;
  title: string;
  content: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  htmlContent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * تنسيق السيناريو الجديد
 */
export interface NewScreenplayFormat extends OldScreenplayFormat {
  formattedLines: FormattedLine[];
  metadata: {
    version: "2.0";
    migratedAt: Date;
    wordCount: number;
    characterCount: number;
    sceneCount: number;
    [key: string]: unknown;
  };
}

/**
 * خط منسق
 */
export interface FormattedLine {
  id: string;
  text: string;
  type:
    | "basmala"
    | "scene-header-top-line"
    | "scene-header-1"
    | "scene-header-2"
    | "scene-header-3"
    | "character"
    | "dialogue"
    | "parenthetical"
    | "action"
    | "transition"
    | "unknown";
  number: number;
}

/**
 * نتيجة الترحيل
 */
export interface MigrationResult {
  success: boolean;
  oldId: string;
  newId: string;
  error?: string;
}

/**
 * ترحيل بيانات سيناريو واحد
 * @param oldData - البيانات القديمة
 * @returns البيانات الجديدة
 */
export function migrateScreenplayData(
  oldData: OldScreenplayFormat
): NewScreenplayFormat {
  const classifier = new ScreenplayClassifier();

  // تقسيم المحتوى إلى سطور
  const lines = oldData.content.split("\n");

  // تصنيف كل سطر
  const formattedLines: FormattedLine[] = [];
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;

    // تصنيف السطر
    const lineType = classifier.classifyLine(line);

    formattedLines.push({
      id: `line_${lineNumber}_${Date.now()}`,
      text: line,
      type: lineType,
      number: lineNumber,
    });
  }

  // حساب الإحصائيات
  const wordCount = oldData.content.trim()
    ? oldData.content.trim().split(/\s+/).length
    : 0;
  const characterCount = oldData.content.length;
  const sceneCount = (oldData.content.match(/مشهد\s*\d+/gi) ?? []).length;

  // تجميع البيانات القديمة مع الجديدة
  return {
    ...oldData,
    formattedLines,
    metadata: {
      ...oldData.metadata,
      version: "2.0",
      migratedAt: new Date(),
      wordCount,
      characterCount,
      sceneCount,
    },
  };
}

/**
 * ترحيل بيانات محلية من localStorage
 * @returns عدد السيناريوهات المهاجرة
 */
export function migrateLocalStorage(): number {
  let migratedCount = 0;

  try {
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      // البحث عن مفاتيح السيناريوهات
      if (key.startsWith("screenplay_") || key.startsWith("screenplay-")) {
        const rawData = localStorage.getItem(key);

        if (!rawData) continue;

        try {
          const oldData = JSON.parse(rawData) as OldScreenplayFormat;

          // ترحيل البيانات
          const newData = migrateScreenplayData(oldData);

          // حفظ البيانات الجديدة
          localStorage.setItem(key, JSON.stringify(newData));

          migratedCount++;
        } catch (error) {
          logger.error(`Failed to migrate key: ${key}`, error);
        }
      }
    }

    logger.info(`✅ ترحيل localStorage: ${migratedCount} سيناريو مهاجر`);
    return migratedCount;
  } catch (error) {
    logger.error("Failed to migrate localStorage:", error);
    return 0;
  }
}

/**
 * تصدير بيانات localStorage (للنسخ الاحتياطي قبل الترحيل)
 * @returns البيانات المصدرة
 */
export function exportLocalStorage(): Record<string, OldScreenplayFormat> {
  const exportedData: Record<string, OldScreenplayFormat> = {};

  try {
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (!key.startsWith("screenplay_") && !key.startsWith("screenplay-")) {
        continue;
      }

      const rawData = localStorage.getItem(key);
      if (!rawData) {
        continue;
      }

      try {
        exportedData[key] = JSON.parse(rawData) as OldScreenplayFormat;
      } catch (error) {
        logger.error(`Failed to parse key: ${key}`, error);
      }
    }

    return exportedData;
  } catch (error) {
    logger.error("Failed to export localStorage:", error);
    return {};
  }
}

/**
 * استيراد بيانات إلى localStorage (بعد الترحيل)
 * @param data - البيانات المراد استيرادها
 * @returns عدد السيناريوهات المستوردة
 */
export function importToLocalStorage(
  data: Record<string, NewScreenplayFormat>
): number {
  let importedCount = 0;

  try {
    for (const [key, value] of Object.entries(data)) {
      localStorage.setItem(key, JSON.stringify(value));
      importedCount++;
    }

    logger.info(`✅ استيراد إلى localStorage: ${importedCount} سيناريو`);
    return importedCount;
  } catch (error) {
    logger.error("Failed to import to localStorage:", error);
    return 0;
  }
}

/**
 * التحقق من سلامة البيانات بعد الترحيل
 * @returns true إذا كانت البيانات سليمة
 */
export function validateMigratedData(): boolean {
  try {
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (key.startsWith("screenplay_") || key.startsWith("screenplay-")) {
        const rawData = localStorage.getItem(key);

        if (!rawData) continue;

        const data = JSON.parse(rawData) as {
          formattedLines?: unknown;
          metadata?: { version?: string };
        };

        // التحقق من وجود formattedLines
        if (!data.formattedLines || !Array.isArray(data.formattedLines)) {
          logger.warn(`❌ Invalid data in key: ${key}`);
          return false;
        }

        // التحقق من وجود metadata
        if (data.metadata?.version !== "2.0") {
          logger.warn(`❌ Invalid metadata in key: ${key}`);
          return false;
        }
      }
    }

    logger.info("✅ جميع البيانات سليمة");
    return true;
  } catch (error) {
    logger.error("Failed to validate data:", error);
    return false;
  }
}

/**
 * إلغاء الترحيل (rollback)
 * @param backupData - البيانات الاحتياطية
 * @returns true إذا تم الإلغاء بنجاح
 */
export function rollbackMigration(
  backupData: Record<string, OldScreenplayFormat>
): boolean {
  try {
    for (const [key, value] of Object.entries(backupData)) {
      localStorage.setItem(key, JSON.stringify(value));
    }

    logger.info("✅ تم إلغاء الترحيل بنجاح");
    return true;
  } catch (error) {
    logger.error("Failed to rollback migration:", error);
    return false;
  }
}

/**
 * تنفيذ الترحيل الكامل مع النسخ الاحتياطي
 * @returns نتيجة الترحيل
 */
export function executeFullMigration(): {
  success: boolean;
  migratedCount: number;
  backup: Record<string, OldScreenplayFormat>;
} {
  try {
    // 1. إنشاء نسخة احتياطية
    logger.info("📦 إنشاء نسخة احتياطية...");
    const backup = exportLocalStorage();

    // 2. تنفيذ الترحيل
    logger.info("🔄 تنفيذ الترحيل...");
    const migratedCount = migrateLocalStorage();

    // 3. التحقق من البيانات
    logger.info("✅ التحقق من البيانات...");
    const isValid = validateMigratedData();

    if (!isValid) {
      // إلغاء الترحيل إذا كانت البيانات غير سليمة
      logger.error("❌ البيانات غير سليمة، جاري الإلغاء...");
      rollbackMigration(backup);
      return {
        success: false,
        migratedCount: 0,
        backup,
      };
    }

    logger.info(`🎉 تم ترحيل ${migratedCount} سيناريو بنجاح!`);

    return {
      success: true,
      migratedCount,
      backup,
    };
  } catch (error) {
    logger.error("❌ فشل الترحيل:", error);
    return {
      success: false,
      migratedCount: 0,
      backup: {},
    };
  }
}

/**
 * سكربت ترحيل سيناريو واحد (يدوي)
 * @param oldData - البيانات القديمة
 * @returns البيانات الجديدة
 */
export function manualMigrateSingle(
  oldData: OldScreenplayFormat
): NewScreenplayFormat {
  logger.info(`🔄 ترحيل السيناريو: ${oldData.title}`);

  const newData = migrateScreenplayData(oldData);

  logger.info(`✅ تم ترحيل السيناريو بنجاح`);
  logger.info(`   - الكلمات: ${newData.metadata.wordCount}`);
  logger.info(`   - الحروف: ${newData.metadata.characterCount}`);
  logger.info(`   - المشاهد: ${newData.metadata.sceneCount}`);
  logger.info(`   - السطور: ${newData.formattedLines.length}`);

  return newData;
}

/**
 * دالة مساعدة لطباعة تقرير الترحيل
 * @param result - نتيجة الترحيل
 */
export function printMigrationReport(result: {
  success: boolean;
  migratedCount: number;
  backup: Record<string, OldScreenplayFormat>;
}): void {
  logger.info("\n=================================");
  logger.info("📊 تقرير الترحيل");
  logger.info("=================================\n");

  logger.info(`الحالة: ${result.success ? "✅ نجح" : "❌ فشل"}`);
  logger.info(`عدد السيناريوهات المهاجرة: ${result.migratedCount}`);
  logger.info(
    `عدد السيناريوهات في النسخة الاحتياطية: ${Object.keys(result.backup).length}`
  );

  if (!result.success) {
    logger.info(
      "\n⚠️  فشل الترحيل. البيانات الاحتياطية محفوظة في result.backup"
    );
    logger.info("للاستعادة، استخدم: rollbackMigration(result.backup)");
  }

  logger.info("\n=================================\n");
}

// تصدير للاستخدام في browser
interface ScreenplayMigrationGlobal {
  migrateScreenplayData: typeof migrateScreenplayData;
  migrateLocalStorage: typeof migrateLocalStorage;
  exportLocalStorage: typeof exportLocalStorage;
  importToLocalStorage: typeof importToLocalStorage;
  validateMigratedData: typeof validateMigratedData;
  rollbackMigration: typeof rollbackMigration;
  executeFullMigration: typeof executeFullMigration;
  manualMigrateSingle: typeof manualMigrateSingle;
  printMigrationReport: typeof printMigrationReport;
}

if (typeof window !== "undefined") {
  (
    window as unknown as { ScreenplayMigration: ScreenplayMigrationGlobal }
  ).ScreenplayMigration = {
    migrateScreenplayData,
    migrateLocalStorage,
    exportLocalStorage,
    importToLocalStorage,
    validateMigratedData,
    rollbackMigration,
    executeFullMigration,
    manualMigrateSingle,
    printMigrationReport,
  };
}
