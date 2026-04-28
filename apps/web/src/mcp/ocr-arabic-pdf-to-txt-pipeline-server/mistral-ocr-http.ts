/**
 * @description طبقة HTTP لـ Mistral OCR (raw fetch + JSON request مع إعادة المحاولة).
 */

import { setTimeout as sleep } from "node:timers/promises";

import { APP_NAME, log } from "./ocr-logger.js";
import {
  MISTRAL_BASE_URL,
  MISTRAL_HTTP_MAX_RETRIES,
  MISTRAL_HTTP_TIMEOUT_MS,
} from "./mistral-ocr-config.js";
import {
  createTimeoutState,
  ensureMistralApiKey,
  field,
  getEnvOrRaise,
  isRetryableHttpStatus,
  isRetryableRequestError,
  retryDelayMs,
  str,
} from "./text-helpers.js";

import type { JsonRecord } from "./types.js";

export type HttpMethod = "GET" | "POST" | "DELETE";

export async function mistralRequestRaw(
  method: HttpMethod,
  endpoint: string,
  body?: unknown
): Promise<Response> {
  const apiKey = ensureMistralApiKey(getEnvOrRaise("MISTRAL_API_KEY"));
  const url = `${MISTRAL_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    "User-Agent": `${APP_NAME}/1.0`,
  };

  let bodyInit: string | FormData | undefined;
  if (body !== undefined) {
    if (body instanceof FormData) {
      bodyInit = body;
    } else {
      headers["Content-Type"] = "application/json";
      bodyInit = JSON.stringify(body);
    }
  }

  const timeoutState = createTimeoutState(MISTRAL_HTTP_TIMEOUT_MS);
  try {
    const init: RequestInit = {
      method,
      headers,
      signal: timeoutState.signal,
    };
    if (bodyInit !== undefined) {
      init.body = bodyInit;
    }
    return await fetch(url, init);
  } finally {
    timeoutState.cleanup();
  }
}

export async function mistralRequestJson(
  method: HttpMethod,
  endpoint: string,
  body?: unknown
): Promise<JsonRecord> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= MISTRAL_HTTP_MAX_RETRIES) {
    try {
      const response = await mistralRequestRaw(method, endpoint, body);
      const raw = await response.text();

      let data: unknown = {};
      if (raw.trim()) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = { raw };
        }
      }

      if (!response.ok) {
        const requestId =
          data && typeof data === "object"
            ? str(
                field(data, "request_id", "") || field(data, "requestId", "")
              ).trim()
            : "";

        if (
          isRetryableHttpStatus(response.status) &&
          attempt < MISTRAL_HTTP_MAX_RETRIES
        ) {
          attempt += 1;
          const delay = retryDelayMs(attempt);
          log(
            "WARN",
            "Mistral API returned %s for %s %s. retry=%s delayMs=%s",
            response.status,
            method,
            endpoint,
            attempt,
            delay
          );
          await sleep(delay);
          continue;
        }

        const requestSuffix = requestId ? ` request_id=${requestId}` : "";
        throw new Error(
          `Mistral API error ${response.status} ${response.statusText}${requestSuffix}: ${raw}`
        );
      }

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        return {};
      }

      return data as JsonRecord;
    } catch (error) {
      lastError = error;
      if (
        isRetryableRequestError(error) &&
        attempt < MISTRAL_HTTP_MAX_RETRIES
      ) {
        attempt += 1;
        const delay = retryDelayMs(attempt);
        log(
          "WARN",
          "Mistral request failed for %s %s. retry=%s delayMs=%s error=%s",
          method,
          endpoint,
          attempt,
          delay,
          String(error)
        );
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `Mistral request failed after retries: ${String(lastError)}`
  );
}
