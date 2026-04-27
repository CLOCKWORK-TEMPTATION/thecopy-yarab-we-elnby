/**
 * fileExtractor.ts - معطّل بالكامل
 * تم إلغاء كل وظائف الاستيراد من directors-studio
 * الاستيراد متاح حصراً من /editor
 */

// الحفاظ على أنواع البيانات للتوافق
export enum ExtractionErrorType {
  EXTRACTION_DISABLED = "EXTRACTION_DISABLED",
  UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
  CORRUPTED_FILE = "CORRUPTED_FILE",
  INVALID_CONTENT = "INVALID_CONTENT",
}

export class FileExtractionError extends Error {
  constructor(
    public type: ExtractionErrorType,
    public details?: string
  ) {
    super(
      `استيراد الملفات معطّل في directors-studio. استخدم /editor للاستيراد.`
    );
    this.name = "FileExtractionError";
  }
}

export interface ExtractionResult {
  text: string;
  metadata?: Record<string, unknown>;
}

/**
 * extractTextFromFile - معطّلة
 * رمي خطأ دائماً لأن الاستيراد متاح فقط من /editor
 */
export function extractTextFromFile(_file: File): ExtractionResult {
  throw new FileExtractionError(
    ExtractionErrorType.EXTRACTION_DISABLED,
    "استيراد الملفات معطّل في directors-studio. الرجاء استخدام /editor لاستيراد السيناريوهات."
  );
}

/**
 * getSupportedFileTypes - معطّلة
 */
export function getSupportedFileTypes(): string[] {
  throw new FileExtractionError(
    ExtractionErrorType.EXTRACTION_DISABLED,
    "الاستيراد متاح فقط من /editor"
  );
}

/**
 * validateFile - معطّلة
 */
export function validateFile(_file: File): boolean {
  throw new FileExtractionError(
    ExtractionErrorType.EXTRACTION_DISABLED,
    "الاستيراد متاح فقط من /editor"
  );
}
