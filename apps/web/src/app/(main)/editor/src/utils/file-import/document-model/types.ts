/**
 * @module document-model/types
 * @description أنواع TypeScript لنموذج المستند
 */

import type { SCREENPLAY_BLOCK_FORMAT_IDS } from "./constants";

/** نوع اتحادي حرفي لمعرّفات التنسيق المشتقة من {@link SCREENPLAY_BLOCK_FORMAT_IDS} */
export type ScreenplayFormatId = (typeof SCREENPLAY_BLOCK_FORMAT_IDS)[number];

/**
 * كتلة سيناريو واحدة تربط نصاً بنوع تنسيق.
 * @property formatId - معرّف التنسيق (مثل `'dialogue'` أو `'action'`)
 * @property text - النص الخام للكتلة
 */
export interface ScreenplayBlock {
  formatId: ScreenplayFormatId;
  text: string;
}

/**
 * حمولة التصدير/الاستيراد للإصدار الأول.
 * تحتوي كتل السيناريو مع بيانات وصفية (خط، حجم، تاريخ) وبصمة تحقق FNV1a.
 *
 * @property version - رقم إصدار الحمولة (دائماً `1`)
 * @property blocks - مصفوفة كتل السيناريو المُصنَّفة
 * @property font - اسم الخط المستخدم (مثل `'AzarMehrMonospaced-San'`)
 * @property size - حجم الخط (مثل `'12pt'`)
 * @property checksum - بصمة FNV1a هيكساديسيمال (8 محارف)
 * @property createdAt - طابع زمني ISO 8601
 */
export interface ScreenplayPayloadV1 {
  version: 1;
  blocks: ScreenplayBlock[];
  font: string;
  size: string;
  checksum: string;
  createdAt: string;
}

/** حمولة بدون بصمة (للحساب) */
export type UnsignedPayload = Omit<ScreenplayPayloadV1, "checksum">;

/** كتلة top-line المقسمة */
export interface SplitTopLineBlock {
  formatId: "scene_header_1" | "scene_header_2";
  text: string;
}
