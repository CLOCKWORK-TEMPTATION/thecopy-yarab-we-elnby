/**
 * @module ai-context/health
 * @description Health check helper
 */

import { resolveGeminiConfig } from "./config.mjs";

/**
 * يتحقق من حالة Gemini Context
 * @returns {{configured: boolean, enabled: boolean, model: string}} حالة Gemini Context
 */
export const getGeminiContextHealth = () => {
  const geminiConfig = resolveGeminiConfig();
  return {
    configured: Boolean(geminiConfig.apiKey),
    enabled: geminiConfig.enabled,
    model: geminiConfig.model,
  };
};
