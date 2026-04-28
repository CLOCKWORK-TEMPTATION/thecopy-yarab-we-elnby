/**
 * @module ai-context/config
 * @description تحليل الإعدادات من البيئة
 */

import { DEFAULT_MODEL } from "./constants.mjs";

/**
 * يحلل إعدادات Gemini من متغيرات البيئة
 * @param {Object} env - متغيرات البيئة (افتراضياً process.env)
 * @returns {Object} إعدادات Gemini
 */
export const resolveGeminiConfig = (env = process.env) => {
  const apiKey = (env.GEMINI_API_KEY ?? env.GOOGLE_GENAI_API_KEY ?? "").trim();
  const model = (env.AI_CONTEXT_MODEL ?? DEFAULT_MODEL).trim();
  const enabled =
    (env.AI_CONTEXT_ENABLED ?? "true").trim().toLowerCase() !== "false";

  return { apiKey, model, enabled };
};
