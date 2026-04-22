import { ProcessedFile, Result } from "../core/types";
import { log } from "./loggerService";

// =====================================================
// Browser-Compatible File Reader Service
// =====================================================

/**
 * قراءة ملفات من المتصفح باستخدام File API
 */
export async function readFiles(
  files: File[]
): Promise<Result<ProcessedFile[]>> {
  try {
    const processedFiles: (ProcessedFile | null)[] = await Promise.all(
      files.map((file) => processFile(file))
    );

    const successful = processedFiles.filter(
      (f): f is ProcessedFile => f !== null
    );
    const failures = processedFiles
      .map((f, i) => (f === null ? files[i]?.name : null))
      .filter(Boolean);

    if (failures.length > 0) {
      log.warn(
        "⚠️ Some files failed to process",
        failures,
        "FileReaderService"
      );
    }

    if (successful.length === 0) {
      return {
        ok: false,
        error: new Error("فشلت معالجة جميع الملفات"),
      };
    }

    return { ok: true, value: successful };
  } catch (e: any) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error("فشل في قراءة الملفات"),
    };
  }
}

/**
 * معالجة ملف واحد
 */
/**
 * File type handlers
 * Reduces cyclomatic complexity by using strategy pattern
 */
interface FileTypeHandler {
  matches: (file: File) => boolean;
  process: (file: File, buffer: Buffer) => Promise<string | undefined>;
}

const FILE_TYPE_HANDLERS: FileTypeHandler[] = [
  {
    matches: (file) =>
      file.type === "text/plain" ||
      file.type === "text/markdown" ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md"),
    process: async (_, buffer) => tryDecodeUtf8(buffer),
  },
  {
    matches: (file) =>
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx"),
    process: async (file) => extractDocxText(file),
  },
  {
    matches: (file) =>
      file.type === "application/pdf" || file.name.endsWith(".pdf"),
    process: async () => undefined, // PDF سيتم إرساله كـ binary
  },
  {
    matches: (file) => file.type.startsWith("image/"),
    process: async () => undefined, // الصور سيتم إرسالها كـ binary
  },
];

/**
 * Get appropriate handler for file type
 */
function getFileHandler(file: File): FileTypeHandler {
  return (
    FILE_TYPE_HANDLERS.find((handler) => handler.matches(file)) || {
      matches: () => true,
      process: async (_, buffer) => tryDecodeUtf8(buffer),
    }
  );
}

/**
 * Process file with reduced cyclomatic complexity
 * Reduced from 13 to 5
 */
async function processFile(file: File): Promise<ProcessedFile | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get handler and process file
    const handler = getFileHandler(file);
    const textContent = await handler.process(file, buffer);

    const processed: ProcessedFile = {
      fileName: file.name,
      content: textContent || "",
      sizeBytes: file.size,
      mimeType: file.type,
      textContent: textContent ?? "",
      size: file.size,
      name: file.name,
    };

    log.debug(
      `✅ Processed file: ${file.name} (${formatBytes(file.size)})`,
      null,
      "FileReaderService"
    );
    return processed;
  } catch (error: any) {
    log.error(
      `❌ Failed to process file: ${file.name}`,
      error,
      "FileReaderService"
    );
    return null;
  }
}

/**
 * محاولة فك تشفير UTF-8
 */
function tryDecodeUtf8(buffer: Buffer): string | undefined {
  try {
    const text = buffer.toString("utf8");
    // رفض إذا كان هناك الكثير من رموز الاستبدال
    if (/\uFFFD{3,}/.test(text)) {
      return undefined;
    }
    return text;
  } catch {
    return undefined;
  }
}

/**
 * استخراج نص من ملف DOCX
 */
async function extractDocxText(file: File): Promise<string | undefined> {
  try {
    // استيراد ديناميكي لـ mammoth
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();

    const result = await (mammoth as any).convertToPlainText({ arrayBuffer });

    if (result.value && result.value.trim().length > 0) {
      log.debug(
        `✅ Extracted text from DOCX: ${file.name}`,
        null,
        "FileReaderService"
      );
      return result.value;
    }

    log.warn(
      `⚠️ DOCX extraction returned empty: ${file.name}`,
      null,
      "FileReaderService"
    );
    return undefined;
  } catch (error) {
    log.error(
      `❌ DOCX extraction failed: ${file.name}`,
      error,
      "FileReaderService"
    );
    return undefined;
  }
}

/**
 * تنسيق حجم الملف
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
