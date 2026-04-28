/**
 * @module extensions/paste-classifier/utils/line-quality
 *
 * حساب جودة سطر نصي بمزيج من:
 * - نسبة الأحرف العربية إلى المقروءة.
 * - نسبة الأحرف الغريبة المضرّة بالقراءة.
 * - وجود علامات بنيوية (مشهد/داخلي/ليل/...).
 */

import { ARABIC_RANGE, WEIRD_CHARS } from "../constants";

import type { LineQuality } from "@editor/suspicion-engine/types";

/**
 * يحسب درجة جودة لسطر نصي.
 * النص الفارغ يُعيد score=0 و arabicRatio=0.
 */
export const computeLineQuality = (text: string): LineQuality => {
  const readableChars = text.replace(/\s/g, "");
  const totalReadable = readableChars.length;
  if (totalReadable === 0) {
    return {
      score: 0,
      arabicRatio: 0,
      weirdCharRatio: 0,
      hasStructuralMarkers: false,
    };
  }

  const arabicCount = (text.match(ARABIC_RANGE) ?? []).length;
  const weirdCount = (text.match(WEIRD_CHARS) ?? []).length;
  const arabicRatio = arabicCount / totalReadable;
  const weirdCharRatio = weirdCount / totalReadable;

  return {
    score: Math.max(
      0,
      Math.min(1, arabicRatio * 0.7 + (1 - weirdCharRatio) * 0.3)
    ),
    arabicRatio,
    weirdCharRatio,
    hasStructuralMarkers:
      /[:()-]/u.test(text) ||
      /(?:^|\s)(?:مشهد|قطع|داخلي|خارجي|ليل|نهار)(?:\s|$)/u.test(text),
  };
};
