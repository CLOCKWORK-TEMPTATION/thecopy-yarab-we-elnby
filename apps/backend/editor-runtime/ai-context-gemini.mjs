/**
 * @module server/ai-context-gemini
 * @description
 * Backend route لطبقة السياق المُعزَّزة بـ Gemini Flash.
 *
 * يستقبل النص الكامل + التصنيفات المحلية من الفرونت إند،
 * يرسلها لـ Gemini Flash عبر streaming،
 * ويرجع تصحيحات كـ Server-Sent Events (SSE).
 *
 * Route: POST /api/ai/context-enhance → SSE stream
 *
 * @deprecated This file is now a re-export barrel. Import from ./ai-context/ directly.
 */

// Import env-bootstrap for side effects (must be first)
import "./env-bootstrap.mjs";

// Re-export everything from the ai-context module
export {
  handleContextEnhance,
  getGeminiContextHealth,
  resolveGeminiConfig,
  buildUserPrompt,
  parseCorrectionsFromChunk,
  validateRequestBody,
  SYSTEM_PROMPT,
  DEFAULT_MODEL,
  MAX_LINES_PER_REQUEST,
  REQUEST_TIMEOUT_MS,
  JSON_DECISION_RE,
} from "./ai-context/index.mjs";
