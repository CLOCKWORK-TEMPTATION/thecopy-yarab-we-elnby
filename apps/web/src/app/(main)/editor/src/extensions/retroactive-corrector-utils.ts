/**
 * @module extensions/retroactive-corrector-utils
 * @description
 * أدوات هيكلية وداخلية لمعالج التصحيح الرجعي.
 * دوال خالصة — بدون آثار جانبية، لا تعتمد على قوائم كلمات ثابتة.
 */

import { PRONOUN_ACTION_RE } from "./arabic-patterns";
import {
  normalizeLine,
  normalizeCharacterName,
  isActionCueLine,
  matchesActionStartPattern,
  isActionVerbStart,
  hasActionVerbStructure,
  hasSentencePunctuation,
  startsWithBullet,
} from "./text-utils";

import type { ClassifiedDraft, ElementType } from "./classification-types";

// ─── أدوات هيكلية داخلية ─────────────────────────────────────────

/** عدد الكلمات في النص */
export const wordCount = (text: string): number =>
  normalizeLine(text).split(/\s+/).filter(Boolean).length;

/** هل ينتهي بنقطتين (: أو ：)؟ */
export const endsWithColon = (text: string): boolean =>
  /[:：]\s*$/.test(normalizeLine(text));

/**
 * مؤشرات وصف قوية جداً (dash/bullet/cue فقط).
 * يُستخدم في Pattern 1 للسطر الأول بعد character — لأن الحوار ممكن يحتوي أفعال.
 */
export const hasVeryStrongActionSignal = (text: string): boolean => {
  const normalized = normalizeLine(text);
  if (!normalized) return false;
  if (/^[-–—]/.test(normalized)) return true;
  if (startsWithBullet(normalized)) return true;
  return isActionCueLine(normalized);
};

/**
 * هل السطر فيه مؤشرات وصف/حدث قوية؟
 * يستخدم نفس المنطق الهيكلي بدون قوائم كلمات ثابتة.
 */
export const hasStrongActionSignal = (text: string): boolean => {
  const normalized = normalizeLine(text);
  if (!normalized) return false;
  if (hasVeryStrongActionSignal(text)) return true;

  return (
    matchesActionStartPattern(normalized) ||
    isActionVerbStart(normalized) ||
    hasActionVerbStructure(normalized) ||
    PRONOUN_ACTION_RE.test(normalized)
  );
};

/**
 * هل السطر يشبه اسم شخصية هيكلياً؟
 * قواعد بنيوية فقط — بدون أي قوائم كلمات أو حروف محددة.
 * - ينتهي بنقطتين
 * - عدد كلمات ≤ 4
 * - بدون مؤشرات وصف
 * - بدون علامات ترقيم جُملية
 */
export const looksLikeCharacterStructurally = (text: string): boolean => {
  if (!endsWithColon(text)) return false;
  if (wordCount(text) > 4) return false;
  if (hasStrongActionSignal(text)) return false;
  const beforeColon = normalizeLine(text)
    .replace(/[:：]\s*$/, "")
    .trim();
  if (hasSentencePunctuation(beforeColon)) return false;
  return true;
};

// ─── مساعد إنشاء ClassifiedDraft مُصحّح ─────────────────────────

/**
 * ينشئ مسودة مصنّفة جديدة بنوع مُصحّح.
 *
 * حالة خاصة: عند التحويل من character إلى dialogue، تُنزع النقطتين (`:` / `：`)
 * المضافة تلقائيًا من ensureCharacterTrailingColon.
 */
export const correctedDraft = (
  original: ClassifiedDraft,
  newType: ElementType,
  confidenceBoost = 0
): ClassifiedDraft => {
  let text = original.text;
  if (original.type === "character" && newType === "dialogue") {
    text = text.replace(/\s*[:：]+\s*$/u, "").trimEnd();
  }
  return {
    ...original,
    text,
    type: newType,
    confidence: Math.min(99, original.confidence + confidenceBoost),
    classificationMethod: "context",
  };
};

// re-export for convenience in pattern files
export { normalizeLine, normalizeCharacterName };
