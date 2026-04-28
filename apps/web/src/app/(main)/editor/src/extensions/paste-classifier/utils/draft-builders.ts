/**
 * @module extensions/paste-classifier/utils/draft-builders
 *
 * بناة draft عناصر التصنيف:
 * - buildDraftForType: ينشئ ClassifiedDraft بقواعد قصاصة الـ character/action.
 * - buildLiteralPreviewDrafts: تحويل نص خام إلى drafts للمعاينة الحرفية.
 * - buildProgressiveNodeAttrs: attributes العقد التدريجية.
 * - normalizeClassifierConfidence: تطبيع الثقة من 0..100 إلى 0..1.
 */

import { ensureCharacterTrailingColon } from "../../character";

import { generateItemId } from "../../paste-classifier-helpers";
import type { ClassifiedDraftWithId } from "../../paste-classifier-helpers";

import type { ClassifiedDraft, ElementType } from "../../classification-types";

import { PREVIEW_LINE_TYPE } from "../constants";
import { normalizePreviewText } from "./text-normalization";

/**
 * بناء ClassifiedDraft بقواعد القصاصة الخاصة بالنوع:
 * - character: ضمان نقطتين في النهاية.
 * - action: حذف بادئة dash إن وُجدت.
 */
export const buildDraftForType = (
  type: ElementType,
  text: string,
  confidence: number,
  classificationMethod: ClassifiedDraft["classificationMethod"]
): ClassifiedDraft => ({
  type,
  text:
    type === "character"
      ? ensureCharacterTrailingColon(text)
      : type === "action"
        ? text.replace(/^[-–—]\s*/, "")
        : text,
  confidence,
  classificationMethod,
});

/**
 * تطبيع قيمة ثقة المصنف إلى نطاق 0..1.
 */
export const normalizeClassifierConfidence = (confidence: number): number =>
  confidence > 1 ? confidence / 100 : confidence;

/**
 * تحويل نص خام إلى مجموعة drafts للمعاينة الحرفية قبل التصنيف الكامل.
 * نص فارغ يُعيد مصفوفة فارغة.
 */
export const buildLiteralPreviewDrafts = (
  text: string
): ClassifiedDraftWithId[] => {
  const lines = normalizePreviewText(text).split("\n");
  if (lines.length === 1 && lines[0] === "") return [];

  return lines.map((line) => ({
    _itemId: generateItemId(),
    type: PREVIEW_LINE_TYPE,
    text: line,
    confidence: 1,
    classificationMethod: "fallback",
  }));
};

/**
 * بناء attributes العقد التدريجية من معرف العنصر.
 */
export const buildProgressiveNodeAttrs = (
  itemId: string
): {
  elementId: string;
  approvalState: "unapproved";
  approvedVersionId: null;
  approvedAt: null;
} => ({
  elementId: itemId,
  approvalState: "unapproved",
  approvedVersionId: null,
  approvedAt: null,
});
