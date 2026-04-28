/**
 * @module ai-context/parsers
 * @description تحليل استجابة Gemini (streaming)
 */

import { JSON_DECISION_RE } from "./constants.mjs";

/**
 * تحويل kebab-case لـ snake_case (scene_header_3 → scene_header_3)
 * scene_header_top_line مش نوع تصنيف — لو الـ AI رجّعه نحوّله لـ scene_header_1
 * @param {string} type - النوع الأصلي
 * @returns {string} النوع المحول
 */
const kebabToSnake = (type) => {
  const snake = type.replace(/-/g, "_");
  return snake === "scene_header_top_line" ? "scene_header_1" : snake;
};

/**
 * يحلل chunk نصي ويستخرج منه تصحيحات JSON صالحة.
 * يدعم الفورمات:
 *   - جديد: { itemIndex, finalType, confidence, reason }
 *   - قديم: { lineIndex, correctedType, confidence, reason }
 *
 * @param {string} text - النص المراد تحليله
 * @returns {Array<{lineIndex: number, correctedType: string, confidence: number, reason: string, source: string}>} التصحيحات المستخرجة
 */
export const parseCorrectionsFromChunk = (text) => {
  const corrections = [];
  const matches = text.match(JSON_DECISION_RE);
  if (!matches) return corrections;

  for (const match of matches) {
    try {
      const parsed = JSON.parse(match);

      // استخراج lineIndex: جديد (itemIndex) أو قديم (lineIndex)
      const lineIndex = parsed.itemIndex ?? parsed.lineIndex;
      if (typeof lineIndex !== "number") continue;

      // استخراج correctedType: جديد (finalType) أو قديم (correctedType)
      const rawType = parsed.finalType ?? parsed.correctedType;
      if (typeof rawType !== "string") continue;

      const correctedType = kebabToSnake(rawType);
      const confidence =
        typeof parsed.confidence === "number"
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0.85;

      corrections.push({
        lineIndex,
        correctedType,
        confidence,
        reason: typeof parsed.reason === "string" ? parsed.reason : "",
        source: "gemini-context",
      });
    } catch {
      // JSON غير صالح — نتجاهل
    }
  }

  return corrections;
};
