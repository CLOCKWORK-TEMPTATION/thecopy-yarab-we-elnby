/**
 * Server-only Pino implementation للـ web.
 * يُستورَد فقط من ملف logger.ts الموحَّد عند الكشف عن بيئة الـ server.
 * يجب ألا يُستورَد مباشرة من Client Components لأن pino لا يبني داخل bundle المتصفح.
 */

import "server-only";
import pino, { type Logger as PinoLogger } from "pino";

import type { LogContext, LogFn, UnifiedLogger } from "./logger.types";

const SERVER_REDACT_PATHS: readonly string[] = [
  "*.password",
  "*.passwd",
  "*.secret",
  "*.token",
  "*.apiKey",
  "*.api_key",
  "*.accessToken",
  "*.refreshToken",
  "*.authorization",
  "*.auth",
  "*.cookie",
  "*.cookies",
  "*.jwt",
  "*.bearerToken",
  "*.TIPTAP_PRO_TOKEN",
  "*.JWT_SECRET",
  "*.GEMINI_API_KEY",
  "*.GOOGLE_GENAI_API_KEY",
  "*.OPENAI_API_KEY",
  "*.ANTHROPIC_API_KEY",
  "*.NEXT_PUBLIC_FIREBASE_API_KEY",
  "req.headers.authorization",
  "req.headers.cookie",
  "request.headers.authorization",
  "request.headers.cookie",
  "headers.authorization",
  "headers.cookie",
];

const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// نوع مساعد لتوحيد توقيع pino القابل لاستقبال string أو object
type PinoMethod = (
  objOrMsg: object | string,
  msg?: string,
  ...args: unknown[]
) => void;

function createPinoInstance(): PinoLogger {
  const baseLevel = IS_DEVELOPMENT ? "debug" : IS_PRODUCTION ? "info" : "warn";

  return pino({
    level: process.env["LOG_LEVEL"] ?? baseLevel,
    base: {
      service: "the-copy-web",
      env: process.env.NODE_ENV ?? "unknown",
      pid: process.pid,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [...SERVER_REDACT_PATHS],
      censor: "[REDACTED]",
      remove: false,
    },
    formatters: {
      level: (label) => ({ level: label }),
    },
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  });
}

function callPino(
  method: PinoMethod,
  ctx: LogContext | string,
  messageOrMeta?: unknown,
  args: unknown[] = []
): void {
  if (typeof ctx === "string") {
    const meta = contextFromMeta(messageOrMeta);
    if (meta) {
      method(meta, ctx, ...args);
      return;
    }
    method(
      ctx,
      undefined,
      ...(messageOrMeta === undefined ? args : [messageOrMeta, ...args])
    );
  } else {
    if (typeof messageOrMeta === "string") {
      method(ctx, messageOrMeta, ...args);
      return;
    }
    method(
      ctx,
      "",
      ...(messageOrMeta === undefined ? args : [messageOrMeta, ...args])
    );
  }
}

function isLogContext(value: unknown): value is LogContext {
  return (
    typeof value === "object" &&
    value !== null &&
    !(value instanceof Error) &&
    !Array.isArray(value)
  );
}

function contextFromMeta(value: unknown): LogContext | undefined {
  if (value instanceof Error) {
    return { err: value };
  }
  if (isLogContext(value)) {
    return value;
  }
  return undefined;
}

function adapt(instance: PinoLogger): UnifiedLogger {
  const wrap =
    (method: PinoMethod): LogFn =>
    (ctx, msg, ...args) =>
      callPino(method, ctx, msg, args);

  return {
    trace: wrap(instance.trace.bind(instance)),
    debug: wrap(instance.debug.bind(instance)),
    info: wrap(instance.info.bind(instance)),
    warn: wrap(instance.warn.bind(instance)),
    error: wrap(instance.error.bind(instance)),
    fatal: wrap(instance.fatal.bind(instance)),
    child: (bindings) => adapt(instance.child(bindings)),
  };
}

export function buildServerLogger(): UnifiedLogger {
  return adapt(createPinoInstance());
}
