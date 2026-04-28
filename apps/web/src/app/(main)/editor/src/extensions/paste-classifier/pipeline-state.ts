/**
 * @module extensions/paste-classifier/pipeline-state
 *
 * حالة pipeline على مستوى الـ module:
 * - حارس re-entry لمنع تشغيل خط الأنابيب مرتين متزامنين.
 * - تتبّع آخر نص تمت معالجته للـ deduplication داخل DEDUP_WINDOW_MS.
 */

import { DEDUP_WINDOW_MS } from "./constants";

let pipelineRunning = false;
let lastProcessedHash = "";
let lastProcessedAt = 0;

/**
 * هل خط الأنابيب يعمل حالياً؟
 */
export const isPipelineRunning = (): boolean => pipelineRunning;

/**
 * إعلان بدء تشغيل pipeline.
 */
export const markPipelineStarted = (): void => {
  pipelineRunning = true;
};

/**
 * إعلان توقف pipeline.
 */
export const markPipelineStopped = (): void => {
  pipelineRunning = false;
};

/**
 * فحص ما إذا كان النص قد عولج للتو ضمن نافذة الـ deduplication.
 */
export const isDuplicateOfRecentText = (
  textHash: string,
  now: number
): boolean =>
  textHash === lastProcessedHash && now - lastProcessedAt < DEDUP_WINDOW_MS;

/**
 * تسجيل آخر نص تمت معالجته للـ deduplication.
 */
export const recordProcessedText = (textHash: string, now: number): void => {
  lastProcessedHash = textHash;
  lastProcessedAt = now;
};
