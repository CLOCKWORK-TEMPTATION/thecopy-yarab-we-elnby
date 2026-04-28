/**
 * @module ai-context/constants
 * @description الثوابت والإعدادات لـ AI Context Gemini
 */

export const DEFAULT_MODEL = "gemini-3.1-pro-preview";
export const MAX_LINES_PER_REQUEST = 500;
export const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Regex لاستخراج JSON objects من النص المتدفق.
 * يبحث عن أي JSON object كامل { ... } يحتوي itemIndex أو lineIndex.
 */
export const JSON_DECISION_RE =
  /\{[^{}]*"(?:itemIndex|lineIndex)"\s*:\s*\d+[^{}]*\}/gu;
