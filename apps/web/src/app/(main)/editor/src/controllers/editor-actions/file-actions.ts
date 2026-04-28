import { definedProps } from "@/lib/defined-props";

import { formatPdfOcrIssueDescription } from "../../constants/format-mappings";
import { pipelineRecorder } from "../../extensions/pipeline-recorder";
import {
  ACCEPTED_FILE_EXTENSIONS,
  getFileType,
  type ReceptionSourceType,
} from "../../types";
import {
  buildFileOpenPipelineAction,
  extractImportedFile,
  pickImportFile,
  probeBackendPdfOcrReadiness,
  resolveBackendExtractionTimeoutMs,
} from "../../utils/file-import";
import { logger } from "../../utils/logger";

import type { EditorFileActionDeps } from "./types";
import type { FileImportMode } from "../../components/editor";

const toReceptionSourceType = (
  fileType: ReturnType<typeof getFileType>
): ReceptionSourceType =>
  fileType === "doc" || fileType === "docx" || fileType === "pdf"
    ? fileType
    : "paste";

const buildSurfaceLockedDescription = () =>
  "لا يمكن بدء فتح أو إدراج ملف جديد قبل استقرار النسخة الحالية أو تنفيذ استرداد صريح بعد الفشل.";

const buildActionTitle = (mode: FileImportMode) =>
  mode === "replace" ? "تعذر فتح الملف" : "تعذر إدراج الملف";

const beginFilePreparation = (
  area: NonNullable<ReturnType<EditorFileActionDeps["getArea"]>>,
  file: File,
  mode: FileImportMode,
  detectedFileType: ReturnType<typeof getFileType>,
): void => {
  area.beginProgressivePreparation({
    intakeKind: "file-open",
    sourceType: toReceptionSourceType(detectedFileType),
    fileName: file.name,
  });

  logger.info("File import pipeline started", {
    scope: "file-import",
    data: {
      filename: file.name,
      mode,
      strategy: "backend-only-strict",
      pipeline: "frontend-open->backend-extract->editor-apply",
    },
  });
};

const ensurePdfReadiness = async (
  detectedFileType: ReturnType<typeof getFileType>,
  file: File,
  mode: FileImportMode,
  area: NonNullable<ReturnType<EditorFileActionDeps["getArea"]>>,
  deps: EditorFileActionDeps,
): Promise<boolean> => {
  if (detectedFileType !== "pdf") {
    return true;
  }

  const readiness = await probeBackendPdfOcrReadiness();
  if (readiness.ready) {
    return true;
  }

  const readinessMessage = formatPdfOcrIssueDescription(
    readiness.errorCode,
    readiness.errorMessage,
  );

  deps.toast({
    title: buildActionTitle(mode),
    description: readinessMessage,
    variant: "destructive",
  });
  deps.recordDiagnostic(buildActionTitle(mode), readinessMessage);

  logger.warn("PDF import blocked by OCR readiness", {
    scope: "file-import",
    data: {
      filename: file.name,
      mode,
      readiness,
    },
  });
  area.cancelProgressivePreparation();
  return false;
};

const extractFileContent = async (
  file: File,
  mode: FileImportMode,
  detectedFileType: ReturnType<typeof getFileType>,
) => {
  const extractStart = performance.now();
  pipelineRecorder.logFileOpen(file.name, detectedFileType ?? "unknown", mode);
  const backendTimeoutMs = resolveBackendExtractionTimeoutMs(
    detectedFileType ?? "txt",
    file.size,
  );
  const extraction = await extractImportedFile(file, {
    backend: { timeoutMs: backendTimeoutMs },
  });

  pipelineRecorder.logFileExtractDone({
    fileName: file.name,
    method: extraction.method,
    usedOcr: extraction.usedOcr,
    textLength: extraction.text.length,
    schemaElementCount: extraction.schemaElements?.length ?? 0,
    latencyMs: Math.round(performance.now() - extractStart),
  });

  return extraction;
};

const applyExtractionResult = async (
  area: NonNullable<ReturnType<EditorFileActionDeps["getArea"]>>,
  fileName: string,
  mode: FileImportMode,
  extraction: Awaited<ReturnType<typeof extractImportedFile>>,
): Promise<{ description: string; title: string; variant: "destructive" } | null> => {
  const action = buildFileOpenPipelineAction(extraction, mode);
  let appliedPipeline = "paste-classifier" as const;

  if (action.kind === "reject") {
    area.cancelProgressivePreparation();
    return action.toast;
  }

  if (action.kind === "import-structured-blocks") {
    await area.importStructuredBlocks(action.blocks, mode);
  } else {
    await area.importClassifiedText(action.text, mode, {
      fileName,
      sourceFileType: extraction.fileType,
      sourceMethod: extraction.method,
      classificationProfile: "generic-open",
      ...definedProps({
        schemaElements: extraction.schemaElements,
        rawExtractedText: extraction.rawExtractedText,
        firstVisibleSourceKind: extraction.firstVisibleSourceKind,
      }),
    });
    appliedPipeline = "paste-classifier";
  }

  logger.info("File import pipeline completed", {
    scope: "file-import",
    data: {
      ...action.telemetry,
      appliedPipeline,
    },
  });
  return null;
};

const normalizeFileActionError = (
  error: unknown,
  mode: FileImportMode,
): {
  message: string;
  shouldLog: boolean;
  shouldRecordDiagnostic: boolean;
  title: string;
} => {
  if (
    typeof error === "object" &&
    error !== null &&
    "title" in error &&
    "description" in error
  ) {
    const toast = error as {
      title?: unknown;
      description?: unknown;
    };
    return {
      shouldLog: false,
      shouldRecordDiagnostic: false,
      title:
        typeof toast.title === "string" ? toast.title : buildActionTitle(mode),
      message:
        typeof toast.description === "string"
          ? toast.description
          : "تعذر إكمال استيراد الملف.",
    };
  }

  const rawMessage =
    error instanceof Error ? error.message : "حدث خطأ غير معروف أثناء فتح الملف.";
  const extractionErrorCode =
    typeof (error as { errorCode?: unknown })?.errorCode === "string"
      ? ((error as { errorCode?: string }).errorCode ?? "").trim()
      : "";

  const normalizedMessage = extractionErrorCode
    ? formatPdfOcrIssueDescription(extractionErrorCode, rawMessage)
    : rawMessage;
  const backendRelatedFailure =
    /failed to fetch|backend|connection|timed out|err_connection_refused|vite_file_import_backend_url/i.test(
      normalizedMessage,
    );

  return {
    shouldLog: true,
    shouldRecordDiagnostic: true,
    title: buildActionTitle(mode),
    message: backendRelatedFailure
      ? `${normalizedMessage}\nفي التطوير المحلي: استخدم pnpm dev (يشغّل backend تلقائيًا).`
      : normalizedMessage,
  };
};

export const openFile = async (
  mode: FileImportMode,
  deps: EditorFileActionDeps
): Promise<void> => {
  if (deps.isProgressiveSurfaceLocked()) {
    deps.toast({
      title: "التشغيل الحالي لم يستقر بعد",
      description: buildSurfaceLockedDescription(),
      variant: "destructive",
    });
    return;
  }

  const area = deps.getArea();
  if (!area) return;

  const file = await pickImportFile(ACCEPTED_FILE_EXTENSIONS);
  if (!file) return;

  try {
    const detectedFileType = getFileType(file.name);
    beginFilePreparation(area, file, mode, detectedFileType);

    const ready = await ensurePdfReadiness(
      detectedFileType,
      file,
      mode,
      area,
      deps,
    );
    if (!ready) {
      return;
    }

    const extraction = await extractFileContent(file, mode, detectedFileType);
    const rejectionToast = await applyExtractionResult(
      area,
      file.name,
      mode,
      extraction,
    );
    if (rejectionToast) {
      deps.toast(rejectionToast);
    }
  } catch (error) {
    area.cancelProgressivePreparation();
    const { message, shouldLog, shouldRecordDiagnostic, title } =
      normalizeFileActionError(error, mode);
    deps.toast({
      title,
      description: message,
      variant: "destructive",
    });
    if (shouldRecordDiagnostic) {
      deps.recordDiagnostic(title, message);
    }
    if (shouldLog) {
      logger.error("File import pipeline failed", {
        scope: "file-import",
        data: error,
      });
    }
  }
};
