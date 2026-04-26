import * as Sentry from "@sentry/nextjs";

import { logger } from "@/lib/ai/utils/logger";


export async function register() {
  const dsn = process.env["NEXT_PUBLIC_SENTRY_DSN"];
  const isDevelopment = process.env.NODE_ENV === "development";

  // تعطيل Sentry تماماً في Development لتجنب logging spam
  if (isDevelopment) {
    logger.info("[Sentry] Disabled in development mode");
    return;
  }

  if (!dsn) {
    logger.warn("[Sentry] DSN not configured, monitoring disabled");
    return;
  }

  if (process.env["NEXT_RUNTIME"] === "nodejs") {
    // Server-side initialization
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: isDevelopment ? 0.1 : 0.2,
      debug: false,
      tracePropagationTargets: [
        "localhost",
        process.env["BACKEND_URL"] ?? "",
        "googleapis.com",
      ],
      integrations: [Sentry.httpIntegration()],
      profilesSampleRate: isDevelopment ? 0.1 : 0.2,
      beforeSend(event) {
        if (isDevelopment) return null;
        return event;
      },
      beforeSendTransaction(event) {
        if (event.transaction?.startsWith("/api/")) {
          event.transaction = event.transaction.replace(
            /\/[0-9a-f-]{36}/g,
            "/:id"
          );
        }
        return event;
      },
      tracesSampler(samplingContext) {
        const pathname = samplingContext.name || "";
        if (pathname.includes("/api/") || pathname.includes("/genkit/")) {
          return 1.0;
        }
        return isDevelopment ? 1.0 : 0.2;
      },
    });
    logger.info("[Sentry] Server initialized");
  }

  if (process.env["NEXT_RUNTIME"] === "edge") {
    // Edge runtime initialization
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: isDevelopment ? 0.1 : 0.2,
      debug: false,
      integrations: [],
      beforeSend(event) {
        if (isDevelopment) return null;
        return event;
      },
      beforeSendTransaction(event) {
        if (event.transaction?.startsWith("/api/")) {
          event.transaction = event.transaction.replace(
            /\/[0-9a-f-]{36}/g,
            "/:id"
          );
        }
        return event;
      },
      tracesSampler(samplingContext) {
        const pathname = samplingContext.name || "";
        if (pathname.includes("/api/")) {
          return 1.0;
        }
        return isDevelopment ? 1.0 : 0.2;
      },
    });
    logger.info("[Sentry] Edge runtime initialized");
  }
}

export const onRequestError = Sentry.captureRequestError;
