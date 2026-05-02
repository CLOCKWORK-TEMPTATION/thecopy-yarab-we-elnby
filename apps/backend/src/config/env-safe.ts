/**
 * dotenv-safe pre-flight check — يتحقق أن جميع المفاتيح الواردة في
 * apps/backend/.env.example موجودة فعلياً في process.env قبل أن يصل
 * الكود إلى فحص Zod في env.ts. في development يصدر تحذيراً فقط حتى
 * لا يكسر تدفّق التطوير، وفي production يرفع خطأً صريحاً.
 *
 * يُستدعى من env.ts قبل Zod.parse مباشرة.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import dotenvSafe from "dotenv-safe";

let safeCheckRan = false;

const OPTIONAL_ENV_SAFE_KEYS = new Set([
  "NODE_ENV",
  "PORT",
  "NEXT_PUBLIC_BACKEND_URL",
  "CORS_ORIGIN",
  "RATE_LIMIT_WINDOW_MS",
  "RATE_LIMIT_MAX_REQUESTS",
  "REDIS_URL",
  "REDIS_ENABLED",
  "WEAVIATE_URL",
  "WEAVIATE_REQUIRED",
  "QDRANT_URL",
  "PERSISTENT_MEMORY_INFRA_REQUIRED",
  "MEMORY_INFRA_REQUIRED",
]);

function writeConfigWarning(message: string): void {
  process.stderr.write(`${message}\n`);
}

function resolveExamplePath(): string | null {
  const candidates = [
    process.env["BACKEND_ENV_EXAMPLE_FILE"]?.trim(),
    resolve(process.cwd(), "apps/backend/.env.example"),
    resolve(__dirname, "..", "..", ".env.example"),
    resolve(process.cwd(), ".env.example"),
  ];

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export interface EnvSafeCheckResult {
  ok: boolean;
  missing: string[];
  examplePath: string | null;
  skipped: boolean;
  reason?: string;
}

export function runEnvSafeCheck(): EnvSafeCheckResult {
  if (safeCheckRan) {
    return {
      ok: true,
      missing: [],
      examplePath: null,
      skipped: true,
      reason: "already-ran",
    };
  }
  safeCheckRan = true;

  if (
    process.env.NODE_ENV === "test" ||
    process.env["SKIP_DOTENV_SAFE"] === "true"
  ) {
    return {
      ok: true,
      missing: [],
      examplePath: null,
      skipped: true,
      reason: "skipped-by-env",
    };
  }

  const examplePath = resolveExamplePath();
  if (!examplePath) {
    return {
      ok: true,
      missing: [],
      examplePath: null,
      skipped: true,
      reason: "example-not-found",
    };
  }

  try {
    dotenvSafe.config({
      example: examplePath,
      allowEmptyValues: false,
    });
    return { ok: true, missing: [], examplePath, skipped: false };
  } catch (error) {
    const missing = extractMissingKeys(error);
    const blockingMissing = missing.filter(
      (key) => !OPTIONAL_ENV_SAFE_KEYS.has(key),
    );
    const isProd = process.env.NODE_ENV === "production";

    if (blockingMissing.length === 0) {
      writeConfigWarning(
        `[env-safe] تحذير — متغيّرات اختيارية غير مضبوطة مقارنةً بـ ${examplePath}: ${missing.join(", ")}. ` +
          `سيتم الاعتماد على القيم الافتراضية أو وضع التدهور الآمن.`,
      );
      return { ok: true, missing, examplePath, skipped: false };
    }

    if (isProd) {
      throw new Error(
        `[env-safe] متغيّرات البيئة المطلوبة مفقودة في الإنتاج: ${blockingMissing.join(", ")} ` +
          `(المرجع: ${examplePath})`,
      );
    }

    writeConfigWarning(
      `[env-safe] تحذير — متغيّرات مفقودة مقارنةً بـ ${examplePath}: ${blockingMissing.join(", ")}. ` +
        `سيتم المتابعة في وضع التطوير.`,
    );
    return { ok: false, missing: blockingMissing, examplePath, skipped: false };
  }
}

function extractMissingKeys(error: unknown): string[] {
  if (!error || typeof error !== "object") {
    return ["<unknown>"];
  }
  const record = error as { missing?: unknown; message?: unknown };
  if (Array.isArray(record.missing)) {
    return record.missing.map((item) => String(item));
  }
  if (typeof record.message === "string") {
    const keys = record.message.match(/\b[A-Z][A-Z0-9_]+\b/g) ?? [];
    if (keys.length > 0) {
      return [...new Set(keys)];
    }
    return [record.message];
  }
  return ["<unknown>"];
}
