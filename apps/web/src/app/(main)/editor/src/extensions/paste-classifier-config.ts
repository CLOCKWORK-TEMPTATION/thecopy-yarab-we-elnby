/**
 * @module extensions/paste-classifier-config
 * @description ثوابت وإعدادات مصنف اللصق التلقائي
 */

import { logger } from "../utils/logger";
import type { LineType } from "../types";
import {
  resolveFileImportExtractEndpoint,
  resolveFinalReviewEndpoint,
  resolveSuspicionReviewEndpoint,
  resolveTextExtractEndpoint,
} from "../utils/backend-endpoints";

/** رقم نسخة Command API — v2 */
export const COMMAND_API_VERSION = "2.0" as const;

/** نمط التصنيف: Backend review required قبل تطبيق الإدراج */
export const CLASSIFICATION_MODE = "auto-apply" as const;

export const FALLBACK_ITEM_ID_PREFIX = "fallback-item";

export const PASTE_CLASSIFIER_ERROR_EVENT = "paste-classifier:error";

export const reviewPipelineLogger = logger.createScope("paste.final-review");
export const agentReviewLogger = reviewPipelineLogger;

export const OCR_ARTIFACT_SEPARATOR_RE = /^\s*={20,}\s*$/u;
export const OCR_ARTIFACT_PAGE_RE = /^\s*الصفحة\s+[0-9٠-٩]+\s*$/u;

export const isOcrArtifactLine = (line: string): boolean =>
  OCR_ARTIFACT_SEPARATOR_RE.test(line) || OCR_ARTIFACT_PAGE_RE.test(line);

export const sanitizeOcrArtifactsForClassification = (
  text: string
): { sanitizedText: string; removedLines: number } => {
  const lines = text.split(/\r?\n/u);
  if (lines.length === 0) {
    return { sanitizedText: text, removedLines: 0 };
  }

  let removedLines = 0;
  const cleaned: string[] = [];

  const hasNeighborArtifact = (index: number): boolean => {
    const previous = index > 0 ? (lines[index - 1] ?? "") : "";
    const next = index < lines.length - 1 ? (lines[index + 1] ?? "") : "";
    return isOcrArtifactLine(previous) || isOcrArtifactLine(next);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === undefined) continue;
    const shouldDrop =
      isOcrArtifactLine(line) ||
      (line.trim().length === 0 && hasNeighborArtifact(index));
    if (shouldDrop) {
      removedLines += 1;
      continue;
    }
    cleaned.push(line);
  }

  return {
    sanitizedText: cleaned.join("\n"),
    removedLines,
  };
};

export const TEXT_EXTRACT_ENDPOINT = resolveTextExtractEndpoint();

export const REVIEWABLE_AGENT_TYPES = new Set<LineType>([
  "action",
  "dialogue",
  "character",
  "scene_header_top_line",
  "scene_header_1",
  "scene_header_2",
  "scene_header_3",
  "transition",
  "parenthetical",
  "basmala",
]);

// ─── Final Review Constants ──────────────────────────────────────
export const FINAL_REVIEW_ENDPOINT = resolveFinalReviewEndpoint();
export const SUSPICION_REVIEW_ENDPOINT = resolveSuspicionReviewEndpoint();
export const FINAL_REVIEW_MAX_RATIO = 1.0;

/** عتبة ترقية agent-candidate → agent-forced عند alternative-pull */
export const FINAL_REVIEW_PROMOTION_THRESHOLD = 96;

export const FILE_IMPORT_EXTRACT_ENDPOINT = resolveFileImportExtractEndpoint();

export { DEFAULT_FINAL_REVIEW_SCHEMA_HINTS } from "../types/final-review";
