/**
 * @module ai-context-gemini/config
 * @description إعدادات وتهيئة Gemini API
 */

import { DEFAULT_MODEL } from "./constants.mjs";

/**
 * تحليل الإعدادات من متغيرات البيئة
 * @param {NodeJS.ProcessEnv} env - متغيرات البيئة
 * @returns {{ apiKey: string; model: string; enabled: boolean }} إعدادات Gemini
 */
export const resolveGeminiConfig = (env = process.env) => {
  const apiKey = (env.GEMINI_API_KEY ?? "").trim();
  const model = (env.AI_CONTEXT_MODEL ?? DEFAULT_MODEL).trim();
  const enabled =
    (env.AI_CONTEXT_ENABLED ?? "true").trim().toLowerCase() !== "false";

  return { apiKey, model, enabled };
};
