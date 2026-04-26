import * as Sentry from "@sentry/nextjs";

import { logger } from "@/lib/ai/utils/logger";

const dsn = process.env["NEXT_PUBLIC_SENTRY_DSN"];
const isDevelopment = process.env.NODE_ENV === "development";

// Release identifier for Sentry Release Health (Crash-free Sessions/Users + Adoption).
// مصدر منفرد للحقيقة: override يدوي ثم Vercel system env (مكشوفة تلقائياً للعميل).
const releaseSha =
  process.env["NEXT_PUBLIC_SENTRY_RELEASE"] ||
  (process.env["NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA"]
    ? `the-copy-web@${process.env["NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA"].slice(0, 12)}`
    : undefined);

if (isDevelopment) {
  logger.info("[Sentry] Client disabled in development mode");
} else if (!dsn) {
  logger.warn("[Sentry] Client DSN not configured, monitoring disabled");
} else {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    ...(releaseSha ? { release: releaseSha } : {}),
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    debug: false,
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/www\.thecopy\.app/,
      /^https:\/\/.*\.railway\.app/,
    ],
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
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
      return 0.2;
    },
  });
  logger.info("[Sentry] Client initialized");
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
