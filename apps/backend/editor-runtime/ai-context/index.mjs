/**
 * @module ai-context
 * @description AI Context Gemini - Barrel exports
 *
 * Backend route لطبقة السياق المُعزَّزة بـ Gemini Flash.
 *
 * يستقبل النص الكامل + التصنيفات المحلية من الفرونت إند،
 * يرسلها لـ Gemini Flash عبر streaming،
 * ويرجع تصحيحات كـ Server-Sent Events (SSE).
 *
 * Route: POST /api/ai/context-enhance → SSE stream
 */

export { handleContextEnhance } from "./handler.mjs";
export { getGeminiContextHealth } from "./health.mjs";
export { resolveGeminiConfig } from "./config.mjs";
export { buildUserPrompt } from "./prompts.mjs";
export { parseCorrectionsFromChunk } from "./parsers.mjs";
export { validateRequestBody } from "./validators.mjs";
export { SYSTEM_PROMPT } from "./system-prompt.mjs";
export {
  DEFAULT_MODEL,
  MAX_LINES_PER_REQUEST,
  REQUEST_TIMEOUT_MS,
  JSON_DECISION_RE,
} from "./constants.mjs";
