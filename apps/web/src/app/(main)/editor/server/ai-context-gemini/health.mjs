/**
 * @module ai-context-gemini/health
 * @description فحص صحة خدمة Gemini Context
 */

import { resolveGeminiConfig } from "./config.mjs";

/**
 * الحصول على حالة صحة خدمة Gemini Context
 * @returns {{ configured: boolean; enabled: boolean; model: string }} حالة الصحة
 */
export const getGeminiContextHealth = () => {
  const geminiConfig = resolveGeminiConfig();
  return {
    configured: Boolean(geminiConfig.apiKey),
    enabled: geminiConfig.enabled,
    model: geminiConfig.model,
  };
};
