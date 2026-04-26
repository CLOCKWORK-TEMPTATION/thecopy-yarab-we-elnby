import {
  getFileType,
  type FileExtractionResult,
  type ImportedFileType,
} from "../../../types/file-import";

import {
  extractFileWithBackend,
  isBackendExtractionConfigured,
  type BackendExtractOptions,
} from "./backend-extract";
import { extractFileInBrowser } from "./browser-extract";

export * from "./backend-extract";
export * from "./browser-extract";
export * from "./unified-text-extract";

export interface ExtractImportedFileOptions {
  backend?: BackendExtractOptions;
}

const SUPPORTED_IMPORT_TYPES_LABEL = [
  "PDF (.pdf)",
  "DOC (.doc)",
  "DOCX (.docx)",
  "TXT (.txt)",
  "Fountain (.fountain)",
  "FDX (.fdx)",
].join("، ");

const resolveImportedFileType = (file: File): ImportedFileType => {
  const detectedType = getFileType(file.name);
  if (!detectedType) {
    throw new Error(
      `نوع الملف غير مدعوم في مسار الاستيراد. الأنواع المدعومة حاليًا: ${SUPPORTED_IMPORT_TYPES_LABEL}.`
    );
  }
  return detectedType;
};

const assertBackendConfiguration = (endpoint?: string): void => {
  if (!isBackendExtractionConfigured(endpoint)) {
    throw new Error(
      "Backend extraction endpoint غير مضبوط. اضبط VITE_FILE_IMPORT_BACKEND_URL."
    );
  }
};

const shouldUseBrowserTextExtraction = (fileType: ImportedFileType): boolean =>
  fileType === "txt" || fileType === "fountain" || fileType === "fdx";

/**
 * يستخرج النصوص المباشرة داخل المتصفح، ويُبقي الصيغ الثقيلة على الباكند.
 */
export const extractImportedFile = async (
  file: File,
  options?: ExtractImportedFileOptions
): Promise<FileExtractionResult> => {
  const fileType = resolveImportedFileType(file);
  if (shouldUseBrowserTextExtraction(fileType)) {
    return extractFileInBrowser(file, fileType);
  }

  const backendEndpoint = options?.backend?.endpoint;
  assertBackendConfiguration(backendEndpoint);

  return extractFileWithBackend(file, fileType, options?.backend);
};
