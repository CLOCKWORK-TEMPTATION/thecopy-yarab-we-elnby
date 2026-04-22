/**
 * @module utils/pipeline-telemetry
 * @description خدمة تسجيل مراحل المعالجة الموحدة (FR-017 / SC-010)
 *
 * تُسجّل بداية ونهاية كل مرحلة مع بيانات وصفية:
 * extraction → karank → local-classification → suspicion-review → final-review → approval-marking
 */

/**
 * @typedef {'extraction' | 'karank' | 'local-classification' | 'local_classification' | 'suspicion-review' | 'suspicion_engine' | 'final-review' | 'review_layer' | 'approval-marking'} PipelineStage
 * @typedef {'started' | 'completed' | 'failed' | 'skipped'} PipelineStageStatus
 * @typedef {'paste' | 'doc' | 'docx' | 'pdf'} SourceType
 */

/**
 * @typedef {Object} PipelineTelemetryEvent
 * @property {string} importOpId
 * @property {string} [runId]
 * @property {string | null} [visibleVersionId]
 * @property {PipelineStage} stage
 * @property {PipelineStageStatus} status
 * @property {SourceType} sourceType
 * @property {number} timestamp
 * @property {number} [durationMs]
 * @property {'user-paste' | 'direct-extraction' | 'ocr'} [firstVisibleSourceKind]
 * @property {{ message: string, stack?: string, code?: string }} [errorDetails]
 * @property {Record<string, string | number | boolean | null | undefined>} [metadata]
 */

const PREFIX = "[pipeline-telemetry]";

/** @type {Map<string, Map<string, number>>} importOpId → (stage → startTimestamp) */
const stageTimers = new Map();

const normalizeStage = (stage) => {
  switch (stage) {
    case "local_classification":
      return "local-classification";
    case "suspicion_engine":
      return "suspicion-review";
    case "review_layer":
      return "final-review";
    default:
      return stage;
  }
};

/**
 * بناء كائن الحدث وطباعته
 * @param {PipelineTelemetryEvent} event
 */
const emit = (event) => {
  const normalizedStage = normalizeStage(event.stage);
  const tag =
    event.status === "failed"
      ? "❌"
      : event.status === "completed"
        ? "✅"
        : "🔄";
  const duration = event.durationMs != null ? ` (${event.durationMs}ms)` : "";
  const error = event.errorDetails ? ` — ${event.errorDetails.message}` : "";
  const versionTag = event.visibleVersionId
    ? ` [${event.visibleVersionId}]`
    : "";

  console.warn(
    `${PREFIX} ${tag} [${event.importOpId}]${versionTag} ${normalizedStage} ${event.status}${duration}${error}`,
    event.metadata ?? ""
  );
};

/**
 * تسجيل بداية مرحلة
 * @param {string} importOpId
 * @param {PipelineStage} stage
 * @param {SourceType} sourceType
 */
export const recordStageStart = (
  importOpId,
  stage,
  sourceType,
  metadata = undefined
) => {
  const normalizedStage = normalizeStage(stage);
  const now = Date.now();
  if (!stageTimers.has(importOpId)) {
    stageTimers.set(importOpId, new Map());
  }
  stageTimers.get(importOpId).set(normalizedStage, now);

  emit({
    importOpId,
    stage: normalizedStage,
    status: "started",
    sourceType,
    timestamp: now,
    metadata,
  });
};

/**
 * تسجيل اكتمال مرحلة
 * @param {string} importOpId
 * @param {PipelineStage} stage
 * @param {SourceType} sourceType
 */
export const recordStageComplete = (
  importOpId,
  stage,
  sourceType,
  metadata = undefined
) => {
  const normalizedStage = normalizeStage(stage);
  const now = Date.now();
  const startTime = stageTimers.get(importOpId)?.get(normalizedStage);
  const durationMs = startTime != null ? now - startTime : undefined;

  emit({
    importOpId,
    stage: normalizedStage,
    status: "completed",
    sourceType,
    timestamp: now,
    durationMs,
    metadata,
  });

  // تنظيف بعد اكتمال المرحلة
  stageTimers.get(importOpId)?.delete(normalizedStage);
  if (stageTimers.get(importOpId)?.size === 0) {
    stageTimers.delete(importOpId);
  }
};

/**
 * تسجيل فشل مرحلة
 * @param {string} importOpId
 * @param {PipelineStage} stage
 * @param {SourceType} sourceType
 * @param {Error | string} error
 */
export const recordStageFailure = (
  importOpId,
  stage,
  sourceType,
  error,
  metadata = undefined
) => {
  const normalizedStage = normalizeStage(stage);
  const now = Date.now();
  const startTime = stageTimers.get(importOpId)?.get(normalizedStage);
  const durationMs = startTime != null ? now - startTime : undefined;

  const errorDetails =
    error instanceof Error
      ? { message: error.message, stack: error.stack, code: error.code }
      : { message: String(error) };

  emit({
    importOpId,
    stage: normalizedStage,
    status: "failed",
    sourceType,
    timestamp: now,
    durationMs,
    errorDetails,
    metadata,
  });

  stageTimers.get(importOpId)?.delete(normalizedStage);
  if (stageTimers.get(importOpId)?.size === 0) {
    stageTimers.delete(importOpId);
  }
};

/**
 * تنظيف جميع المؤقتات لعملية استيراد (عند الإلغاء مثلاً)
 * @param {string} importOpId
 */
export const clearTimers = (importOpId) => {
  stageTimers.delete(importOpId);
};
