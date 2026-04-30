import { NextResponse } from "next/server";

import {
  createSafeTraceId,
  sanitizePublicErrorMessage,
} from "@/lib/safe-error-text";
import { withNoStoreResponseInit } from "@/lib/server/no-store";

export interface SafeErrorEnvelope {
  success: false;
  error: string;
  errorCode: string;
  traceId: string;
}

interface SafeErrorResponseOptions {
  status: number;
  error?: unknown;
  fallbackMessage: string;
  errorCode: string;
  traceIdPrefix?: string | undefined;
}

function extractJsonError(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  return typeof record["message"] === "string"
    ? record["message"]
    : record["error"];
}

export function buildSafeErrorEnvelope(
  options: Omit<SafeErrorResponseOptions, "status">
): SafeErrorEnvelope {
  return {
    success: false,
    error: sanitizePublicErrorMessage(options.error, options.fallbackMessage),
    errorCode: options.errorCode,
    traceId: createSafeTraceId(options.traceIdPrefix ?? "web"),
  };
}

export function buildSafeErrorResponse(
  options: SafeErrorResponseOptions
): NextResponse {
  return NextResponse.json(
    buildSafeErrorEnvelope(options),
    withNoStoreResponseInit({ status: options.status })
  );
}

export async function readSafeResponseMessage(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return fallbackMessage;
  }

  try {
    const payload: unknown = await response.clone().json();
    return sanitizePublicErrorMessage(
      extractJsonError(payload),
      fallbackMessage
    );
  } catch {
    return fallbackMessage;
  }
}

export async function replaceFailureWithSafeEnvelope(
  response: Response,
  options: {
    fallbackMessage: string;
    errorCode: string;
    traceIdPrefix?: string | undefined;
    status?: number;
  }
): Promise<Response> {
  if (response.ok) {
    return response;
  }

  const status = options.status ?? response.status;
  const message = await readSafeResponseMessage(
    response,
    options.fallbackMessage
  );

  return buildSafeErrorResponse({
    status,
    error: message,
    fallbackMessage: options.fallbackMessage,
    errorCode: options.errorCode,
    traceIdPrefix: options.traceIdPrefix,
  });
}
