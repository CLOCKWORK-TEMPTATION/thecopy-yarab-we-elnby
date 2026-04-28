/**
 * @module extensions/paste-classifier/classify-text
 *
 * واجهة تصنيف نص محلية فقط بدون عرض على المحرر.
 * تستدعي classifyLines ثم تطبّق agentReview الاختياري.
 */

import type { ClassifiedDraftWithId } from "../paste-classifier-helpers";

import { applyAgentReview } from "./agent-review";
import { classifyLines } from "./classify-lines";

import type { ClassifyLinesContext } from "./types";

/**
 * تصنيف النص محلياً فقط (بدون مراجعة الوكيل ما لم تُمرَّر).
 */
export const classifyText = (
  text: string,
  agentReview?: (
    classified: readonly ClassifiedDraftWithId[]
  ) => ClassifiedDraftWithId[],
  options?: ClassifyLinesContext
): ClassifiedDraftWithId[] => {
  const initiallyClassified = classifyLines(text, options);
  return applyAgentReview(initiallyClassified, agentReview);
};
