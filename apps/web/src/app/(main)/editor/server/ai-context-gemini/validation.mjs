/**
 * @module ai-context-gemini/validation
 * @description التحقق من صحة طلبات API
 */

import { MAX_LINES_PER_REQUEST } from "./constants.mjs";

/**
 * التحقق من صلة جسم الطلب
 * @param {unknown} body - جسم الطلب
 * @returns {{ valid: boolean; error: string | null }} نتيجة التحقق
 */
export const validateRequestBody = (body) => {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request body." };
  }

  const { classifiedLines, sessionId } = body;

  if (!Array.isArray(classifiedLines) || classifiedLines.length === 0) {
    return {
      valid: false,
      error: "classifiedLines is required and must be a non-empty array.",
    };
  }

  if (classifiedLines.length > MAX_LINES_PER_REQUEST) {
    return {
      valid: false,
      error: `Too many lines: ${classifiedLines.length} (max ${MAX_LINES_PER_REQUEST}).`,
    };
  }

  if (typeof sessionId !== "string" || !sessionId.trim()) {
    return { valid: false, error: "sessionId is required." };
  }

  return { valid: true, error: null };
};
