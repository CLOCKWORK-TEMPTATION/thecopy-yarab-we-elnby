/**
 * @description ثوابت إعداد Mistral OCR (نقطة النهاية، النموذج، حدود الزمن وإعادة المحاولة).
 */

import process from "node:process";

export const DEFAULT_MISTRAL_OCR_MODEL = "mistral-ocr-latest";

export const MISTRAL_BASE_URL = "https://api.mistral.ai/v1";

export const MISTRAL_HTTP_TIMEOUT_MS = Math.max(
  1_000,
  Number.parseInt(process.env["MISTRAL_HTTP_TIMEOUT_MS"] ?? "120000", 10) ||
    120_000,
);

export const MISTRAL_HTTP_MAX_RETRIES = Math.max(
  0,
  Math.min(
    Number.parseInt(process.env["MISTRAL_HTTP_MAX_RETRIES"] ?? "2", 10) || 2,
    5,
  ),
);
