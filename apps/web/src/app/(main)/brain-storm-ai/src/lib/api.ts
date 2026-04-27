/**
 * @module api
 * @description خدمة التواصل مع API العصف الذهني
 */

import { parseJsonResponse } from "@/lib/utils/unknown-values";

import { ERROR_MESSAGES } from "../constants";

import type { BrainstormApiRequest, BrainstormApiResponse } from "../types";

/**
 * إرسال طلب نقاش للوكلاء عبر API الخادم
 */
export async function conductDebate(
  request: BrainstormApiRequest
): Promise<BrainstormApiResponse> {
  const response = await fetch("/api/brainstorm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorMessage =
      ERROR_MESSAGES[response.status] ?? `خطأ في الخادم: ${response.status}`;
    throw new Error(errorMessage);
  }

  return parseJsonResponse<BrainstormApiResponse>(response);
}
