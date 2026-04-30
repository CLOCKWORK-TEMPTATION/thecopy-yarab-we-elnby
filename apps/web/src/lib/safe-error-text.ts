export const RAW_SERVER_OUTPUT_PATTERN =
  /<!doctype|<html|<head|<body|<script|<style|cannot\s+(get|post|put|patch|delete)|syntaxerror|stack trace|node_modules|webpack|nextjs|at\s+[\w.]+\s*\(|json\.parse/i;

const MAX_PUBLIC_MESSAGE_LENGTH = 240;

export function looksLikeRawServerOutput(value: string): boolean {
  return RAW_SERVER_OUTPUT_PATTERN.test(value);
}

export function createSafeTraceId(prefix = "trace"): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function sanitizePublicErrorMessage(
  value: unknown,
  fallbackMessage: string
): string {
  if (typeof value !== "string") {
    return fallbackMessage;
  }

  const trimmed = value.trim();
  if (!trimmed || looksLikeRawServerOutput(trimmed)) {
    return fallbackMessage;
  }

  if (trimmed.length <= MAX_PUBLIC_MESSAGE_LENGTH) {
    return trimmed;
  }

  return `${trimmed.slice(0, MAX_PUBLIC_MESSAGE_LENGTH - 1)}…`;
}

export function pickSafeStatusMessage(
  status: number,
  messages: Record<number, string>,
  fallbackMessage: string
): string {
  return messages[status] ?? fallbackMessage;
}
