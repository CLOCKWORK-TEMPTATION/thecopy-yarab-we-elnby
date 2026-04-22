import { logger } from "@/lib/ai/utils/logger";

export class BreakdownError extends Error {
  code?: string;
  override cause?: unknown;

  constructor(message: string, options?: { code?: string; cause?: unknown }) {
    super(message);
    this.name = "BreakdownError";
    if (options?.code) {
      this.code = options.code;
    }
    if (options && "cause" in options) {
      this.cause = options.cause;
    }
  }
}

export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.";
};

export const logError = (context: string, error: unknown): void => {
  const timestamp = new Date().toISOString();
  const message = formatErrorMessage(error);

  logger.error(`[${timestamp}] [${context}]`, {
    message,
    error,
    stack: error instanceof Error ? error.stack : undefined,
  });
};

export const validateResponse = (
  response: unknown,
  expectedKeys: string[]
): boolean => {
  if (!response || typeof response !== "object") {
    return false;
  }

  return expectedKeys.every(
    (key) => key in (response as Record<string, unknown>)
  );
};
