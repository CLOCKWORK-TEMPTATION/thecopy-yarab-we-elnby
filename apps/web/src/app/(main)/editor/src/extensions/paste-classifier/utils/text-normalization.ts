/**
 * @module extensions/paste-classifier/utils/text-normalization
 *
 * مساعدات تطبيع النصوص:
 * - normalizePreviewText: توحيد نهايات الأسطر للمعاينة.
 * - normalizeComparableText: تجميع المسافات للمقارنة بين نسختين من النص.
 * - computeDocumentSignature: بصمة فريدة لمستند المحرر الحالي.
 */

import { simpleHash } from "./hash";

import type { EditorView } from "@tiptap/pm/view";

/**
 * توحيد نهايات الأسطر لـ \n فقط (CRLF/CR → LF).
 */
export const normalizePreviewText = (value: string): string =>
  value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

/**
 * توحيد المسافات وقصّ الحواف لمقارنة نصين متكافئين.
 */
export const normalizeComparableText = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

/**
 * بصمة مستند المحرر الحالي (childCount + النص الكامل).
 * تُستخدم للكشف عن تغيّر المستند بين مراحل العرض.
 */
export const computeDocumentSignature = (view: EditorView): string =>
  simpleHash(
    `${view.state.doc.childCount}:${view.state.doc.textBetween(
      0,
      view.state.doc.content.size,
      "\n",
      "\n"
    )}`
  );
