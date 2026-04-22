import { logger } from '@/utils/logger';

/**
 * @interface ProcessedFile
 * @description Represents a file that has been processed and is ready for use with Gemini API
 */
export interface ProcessedFile {
  name: string;
  mimeType: string;
  content: string;
  isBase64: boolean;
  size: number;
}

/**
 * @function readFileAsText
 * @description Reads a file and returns its content as text (Node.js implementation)
 */
const readFileAsText = async (fileBuffer: Buffer, encoding: BufferEncoding = 'utf-8'): Promise<string> => {
  return fileBuffer.toString(encoding);
};

/**
 * @function readFileAsBase64
 * @description Reads a file and returns its content as Base64 (Node.js implementation)
 */
const readFileAsBase64 = async (fileBuffer: Buffer): Promise<string> => {
  return fileBuffer.toString('base64');
};

interface FileInput {
  name: string;
  mimeType: string;
  buffer: Buffer;
  size: number;
}

function makeErrorFile(name: string, mimeType: string, size: number, content: string): ProcessedFile {
  return { name, mimeType, content, isBase64: false, size };
}

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return 'فشل غير معروف.';
}

async function processTextFile(file: FileInput): Promise<ProcessedFile> {
  const { name, mimeType, buffer, size } = file;
  try {
    const content = await readFileAsText(buffer);
    return { name, mimeType, content, isBase64: false, size };
  } catch (e: unknown) {
    logger.error(`Error reading text file ${name} (${mimeType}):`, e);
    return makeErrorFile(name, mimeType, size,
      `[Error: تعذر قراءة الملف النصي '${name}'. السبب: ${getErrorMessage(e)}]`);
  }
}

async function processDocxFile(file: FileInput): Promise<ProcessedFile> {
  const { name, mimeType, buffer, size } = file;
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });

    if (!result.value || result.value.trim() === "") {
      logger.warn(`Mammoth extracted empty content from DOCX ${name}`);
      return makeErrorFile(name, mimeType, size,
        `[ملاحظة: لم يتم استخراج أي نص من ملف DOCX '${name}'. قد يكون الملف فارغًا أو يحتوي على عناصر غير نصية فقط. رسائل Mammoth: ${JSON.stringify(result.messages)}]`);
    }
    return { name, mimeType, content: result.value, isBase64: false, size };
  } catch (error: unknown) {
    logger.error(`Error processing DOCX file ${name}:`, error);
    return makeErrorFile(name, mimeType, size,
      `[Error: تعذر استخراج النص من ملف DOCX '${name}'. السبب: ${getErrorMessage(error)}]`);
  }
}

async function processBase64File(file: FileInput): Promise<ProcessedFile> {
  const { name, mimeType, buffer, size } = file;
  try {
    const content = await readFileAsBase64(buffer);
    return { name, mimeType, content, isBase64: true, size };
  } catch (e: unknown) {
    logger.error(`Error reading base64 file ${name} (${mimeType}):`, e);
    return makeErrorFile(name, mimeType, size,
      `[Error: تعذر تحويل ملف '${name}' إلى base64. السبب: ${getErrorMessage(e)}]`);
  }
}

async function processFallbackFile(file: FileInput): Promise<ProcessedFile> {
  const { name, mimeType, buffer, size } = file;
  logger.warn(`Unsupported file type ${mimeType} for file ${name}. Attempting to read as text.`);
  try {
    const content = await readFileAsText(buffer);
    return {
      name,
      mimeType,
      content: `[ملاحظة: تم التعامل مع الملف ${name} (${mimeType}) كملف نصي. قد لا تكون هذه المعالجة مثالية إذا لم يكن الملف نصيًا بالفعل.]\n${content}`,
      isBase64: false,
      size
    };
  } catch (e: unknown) {
    logger.error(`Could not read file ${name} as text or base64.`, e);
    return makeErrorFile(name, mimeType, size,
      `[Error: تعذر قراءة محتوى الملف ${name} (${mimeType}). الملف قد يكون تالفًا أو من نوع غير مدعوم. السبب: ${getErrorMessage(e)}]`);
  }
}

/**
 * @function processFilesForGemini
 * @description Processes an array of file buffers to prepare them for Gemini API
 * Adapted for Node.js backend environment
 * @param {Array<{name: string, mimeType: string, buffer: Buffer}>} files - Array of file objects
 * @returns {Promise<ProcessedFile[]>} Array of processed files
 */
export const processFilesForGemini = async (
  files: Array<FileInput>
): Promise<ProcessedFile[]> => {
  return Promise.all(
    files.map(async (file): Promise<ProcessedFile> => {
      const { name, mimeType, size } = file;

      if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
        return processTextFile(file);
      }

      if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return processDocxFile(file);
      }

      if (mimeType === 'application/msword') {
        return makeErrorFile(name, mimeType, size,
          `[ملاحظة: ملفات .doc القديمة (${name}) لا يمكن تحليلها مباشرة. يرجى تحويل الملف إلى .docx, .txt, أو .pdf لمعالجة المحتوى.]`);
      }

      if (mimeType === 'application/pdf' || mimeType.startsWith('image/')) {
        return processBase64File(file);
      }

      return processFallbackFile(file);
    })
  );
};
