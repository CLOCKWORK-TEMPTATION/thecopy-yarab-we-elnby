#!/usr/bin/env ts-node

/**
 * Historical Log Sanitization Script
 *
 * This script sanitizes existing log files to remove PII (Personally Identifiable Information).
 * It should be run ONCE after deploying the log sanitization middleware to clean up old logs.
 *
 * Usage:
 *   npm run sanitize-logs
 *   or
 *   ts-node backend/scripts/sanitize-historical-logs.ts
 *
 * WARNING: This will modify log files in place. Make sure to backup logs before running.
 */

import * as fs from "fs";
import * as path from "path";

import { logger } from "@/lib/logger";

import { sanitizeHistoricalLogs } from "../src/middleware/log-sanitization.middleware";

// Configuration
const LOG_DIRECTORIES = [
  "logs",
  "backend/logs",
  "/var/log/app", // Production log location (if applicable)
];

const LOG_EXTENSIONS = [".log", ".txt"];
const BACKUP_SUFFIX = ".backup";
const DRY_RUN = process.env.DRY_RUN === "true";

interface SanitizationResult {
  file: string;
  originalSize: number;
  sanitizedSize: number;
  modified: boolean;
}

/**
 * Main function to sanitize all log files
 */
async function sanitizeAllLogs(): Promise<void> {
  logger.info("🔒 Starting Historical Log Sanitization...\n");

  if (DRY_RUN) {
    logger.info("⚠️  DRY RUN MODE - No files will be modified\n");
  }

  const results: SanitizationResult[] = [];

  for (const logDir of LOG_DIRECTORIES) {
    const absolutePath = path.resolve(process.cwd(), logDir);

    if (!fs.existsSync(absolutePath)) {
      logger.info(`⏭️  Skipping ${logDir} - directory does not exist`);
      continue;
    }

    logger.info(`📂 Processing directory: ${absolutePath}`);
    const dirResults = await processDirectory(absolutePath);
    results.push(...dirResults);
  }

  // Print summary
  printSummary(results);
}

/**
 * Process all log files in a directory
 */
async function processDirectory(
  dirPath: string,
): Promise<SanitizationResult[]> {
  const results: SanitizationResult[] = [];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively process subdirectories
        const subResults = await processDirectory(fullPath);
        results.push(...subResults);
      } else if (entry.isFile() && isLogFile(entry.name)) {
        const result = sanitizeLogFile(fullPath);
        if (result) {
          results.push(result);
        }
      }
    }
  } catch (error) {
    logger.error(`❌ Error processing directory ${dirPath}:`, error);
  }

  return results;
}

/**
 * Check if a file is a log file based on extension
 */
function isLogFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return LOG_EXTENSIONS.includes(ext) && !filename.endsWith(BACKUP_SUFFIX);
}

/**
 * Sanitize a single log file
 */
function sanitizeLogFile(filePath: string): SanitizationResult | null {
  try {
    logger.info(`  📄 Processing: ${path.basename(filePath)}`);

    // Read original content
    const originalContent = fs.readFileSync(filePath, "utf-8");
    const originalSize = Buffer.byteLength(originalContent, "utf-8");

    // Sanitize content
    const sanitizedContent = sanitizeHistoricalLogs(originalContent);
    const sanitizedSize = Buffer.byteLength(sanitizedContent, "utf-8");

    // Check if content was modified
    const modified = originalContent !== sanitizedContent;

    if (modified) {
      logger.info(`    ✅ PII found and sanitized`);

      if (!DRY_RUN) {
        // Create backup
        const backupPath = filePath + BACKUP_SUFFIX;
        fs.copyFileSync(filePath, backupPath);
        logger.info(`    💾 Backup created: ${path.basename(backupPath)}`);

        // Write sanitized content
        fs.writeFileSync(filePath, sanitizedContent, "utf-8");
        logger.info(`    📝 Sanitized file written`);
      } else {
        logger.info(`    ⚠️  [DRY RUN] Would sanitize this file`);
      }
    } else {
      logger.info(`    ℹ️  No PII detected`);
    }

    return {
      file: filePath,
      originalSize,
      sanitizedSize,
      modified,
    };
  } catch (error) {
    logger.error(`    ❌ Error processing ${filePath}:`, error);
    return null;
  }
}

/**
 * Print summary of sanitization results
 */
function printSummary(results: SanitizationResult[]): void {
  logger.info("\n" + "=".repeat(60));
  logger.info("📊 SANITIZATION SUMMARY");
  logger.info("=".repeat(60));

  const totalFiles = results.length;
  const modifiedFiles = results.filter((r) => r.modified).length;
  const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalSanitizedSize = results.reduce(
    (sum, r) => sum + r.sanitizedSize,
    0,
  );

  logger.info(`\n📁 Total files processed: ${totalFiles}`);
  logger.info(`✅ Files with PII sanitized: ${modifiedFiles}`);
  logger.info(`ℹ️  Files without PII: ${totalFiles - modifiedFiles}`);
  logger.info(`\n💾 Total original size: ${formatBytes(totalOriginalSize)}`);
  logger.info(`📝 Total sanitized size: ${formatBytes(totalSanitizedSize)}`);

  if (modifiedFiles > 0 && !DRY_RUN) {
    logger.info(
      "\n✅ All sensitive data has been redacted from historical logs.",
    );
    logger.info(`💾 Backups created with suffix: ${BACKUP_SUFFIX}`);
    logger.info(
      "\n⚠️  IMPORTANT: Review the sanitized logs and delete backups when satisfied:",
    );
    logger.info(`   find . -name "*${BACKUP_SUFFIX}" -delete`);
  } else if (DRY_RUN && modifiedFiles > 0) {
    logger.info(
      "\n⚠️  DRY RUN completed. Run without DRY_RUN=true to apply changes.",
    );
  } else {
    logger.info("\n✅ No PII detected in any log files. All logs are clean!");
  }

  logger.info("\n" + "=".repeat(60) + "\n");
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Entry point
 */
if (require.main === module) {
  sanitizeAllLogs()
    .then(() => {
      logger.info("✅ Sanitization complete!");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("❌ Fatal error:", error);
      process.exit(1);
    });
}

export { sanitizeAllLogs, sanitizeLogFile };
