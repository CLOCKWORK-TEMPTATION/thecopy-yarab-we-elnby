/**
 * @module extensions/paste-classifier/classification-context
 *
 * بناة سياق التصنيف وكاشف الإشارات الزمنية للمشهد:
 * - buildContext: ينتج ClassificationContext من سجل أنواع سابق.
 * - hasTemporalSceneSignal: يكتشف إشارة زمنية/تاريخ في سطر للمشهد.
 */

import { DATE_PATTERNS, TIME_PATTERNS } from "../arabic-patterns";

import type {
  ClassificationContext,
  ElementType,
} from "../classification-types";

/**
 * بناء ClassificationContext من سجل الأنواع السابقة.
 * يحدد:
 * - previousType (آخر نوع).
 * - isInDialogueBlock (character/dialogue/parenthetical).
 * - isAfterSceneHeaderTopLine (scene_header_top_line/scene_header_2).
 */
export const buildContext = (
  previousTypes: readonly ElementType[]
): ClassificationContext => {
  const previousType =
    previousTypes.length > 0
      ? (previousTypes[previousTypes.length - 1] ?? null)
      : null;
  const isInDialogueBlock =
    previousType === "character" ||
    previousType === "dialogue" ||
    previousType === "parenthetical";

  return {
    previousTypes,
    previousType,
    isInDialogueBlock,
    isAfterSceneHeaderTopLine:
      previousType === "scene_header_top_line" ||
      previousType === "scene_header_2",
  };
};

/**
 * كاشف إشارة زمنية للمشهد (تاريخ أو وقت).
 */
export const hasTemporalSceneSignal = (text: string): boolean =>
  DATE_PATTERNS.test(text) || TIME_PATTERNS.test(text);
