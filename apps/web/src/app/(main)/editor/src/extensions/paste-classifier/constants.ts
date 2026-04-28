/**
 * @module extensions/paste-classifier/constants
 *
 * الثوابت العامة للمصنّف:
 * Feature flags، نوافذ deduplication، regex التحقق من جودة السطر،
 * خريطة عناصر المحرك، وقوائم الحالات النهائية.
 */

import type { ElementType } from "../classification-types";

/**
 * نوع عنصر المعاينة الحرفية الافتراضي قبل التصنيف الكامل.
 */
export const PREVIEW_LINE_TYPE: ElementType = "action";

/**
 * نافذة Deduplication بالميلي ثانية لمنع تكرار نفس النص داخل المحرر.
 */
export const DEDUP_WINDOW_MS = 2_000;

/**
 * نطاق الأحرف العربية لقياس جودة السطر.
 */
export const ARABIC_RANGE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;

/**
 * regex للأحرف الغريبة التي تُخفّض جودة السطر.
 */
export const WEIRD_CHARS =
  /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0020-\u007E\u00A0-\u00FF\s\d.,;:!?()[\]{}"'`\-_/\\@#$%^&*+=<>|~]/g;

/**
 * حالات استجابة /api/final-review التي تُعتبر غير قاتلة.
 */
export const NON_FATAL_FINAL_REVIEW_STATUSES: ReadonlySet<string> = new Set([
  "applied",
  "partial",
  "skipped",
]);

/**
 * Feature flags لكل طبقات pipeline (استمرارية للسلوك التشغيلي القائم).
 */
export const PIPELINE_FLAGS = {
  /** Document Context Graph + DCG bonus في الـ hybrid classifier */
  DCG_ENABLED: true,
  /** Self-Reflection أثناء الـ forward pass */
  SELF_REFLECTION_ENABLED: true,
  /** أنماط 6-9 الجديدة في الـ retroactive corrector */
  RETRO_NEW_PATTERNS_ENABLED: true,
  /** Reverse Classification Pass + دمج */
  REVERSE_PASS_ENABLED: true,
  /** Viterbi Override (تطبيق اقتراحات Viterbi القوية) */
  VITERBI_OVERRIDE_ENABLED: true,
  /** طبقة شك بالنموذج بعد الشك المحلي */
  SUSPICION_MODEL_ENABLED: true,
  /** Final review layer after suspicion routing */
  FINAL_REVIEW_ENABLED: true,
};

/**
 * جدول ربط أسماء عناصر المحرك بأنواع عناصر السيناريو.
 */
export const ENGINE_ELEMENT_MAP: ReadonlyMap<string, ElementType> = new Map([
  ["scene_header_1", "scene_header_1"],
  ["scene_header_2", "scene_header_2"],
  ["scene_header_3", "scene_header_3"],
  ["ACTION", "action"],
  ["DIALOGUE", "dialogue"],
  ["CHARACTER", "character"],
  ["TRANSITION", "transition"],
  ["PARENTHETICAL", "parenthetical"],
  ["BASMALA", "basmala"],
]);
