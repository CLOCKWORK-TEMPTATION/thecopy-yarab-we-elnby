"use client";

import { logger } from "@/lib/ai/utils/logger";

type SentryModule = typeof import("@sentry/nextjs");
type CaptureExceptionOptions = Parameters<SentryModule["captureException"]>[1];
type RouterTransitionArgs = Parameters<
  SentryModule["captureRouterTransitionStart"]
>;

const dsn = process.env["NEXT_PUBLIC_SENTRY_DSN"];
const isDevelopment = process.env.NODE_ENV === "development";
const releaseSha =
  process.env["NEXT_PUBLIC_SENTRY_RELEASE"] ??
  (process.env["NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA"]
    ? `the-copy-web@${process.env["NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA"].slice(0, 12)}`
    : undefined);

let sentryModulePromise: Promise<SentryModule> | null = null;
let sentryInitialized = false;
let sentryStatusLogged = false;

function shouldLoadSentryClient(): boolean {
  return !isDevelopment && Boolean(dsn);
}

function logSentryStatus(): void {
  if (sentryStatusLogged) return;
  sentryStatusLogged = true;

  if (isDevelopment) {
    logger.info("[Sentry] Client disabled in development mode");
    return;
  }

  if (!dsn) {
    logger.warn("[Sentry] Client DSN not configured, monitoring disabled");
  }
}

function loadSentryClient(): Promise<SentryModule | null> {
  if (!shouldLoadSentryClient()) {
    logSentryStatus();
    return Promise.resolve(null);
  }

  sentryModulePromise ??= import("@sentry/nextjs");
  return sentryModulePromise;
}

export async function initSentryClient(): Promise<void> {
  const Sentry = await loadSentryClient();
  if (!Sentry || sentryInitialized) return;

  const configuredDsn = dsn;
  if (!configuredDsn) return;

  Sentry.init({
    dsn: configuredDsn,
    environment: process.env.NODE_ENV ?? "development",
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

  sentryInitialized = true;
  logger.info("[Sentry] Client initialized");
}

export function captureSentryException(
  error: unknown,
  captureContext?: CaptureExceptionOptions
): void {
  if (!shouldLoadSentryClient()) return;

  void initSentryClient()
    .then(() => loadSentryClient())
    .then((Sentry) => {
      Sentry?.captureException(error, captureContext);
    });
}

export function captureSentryRouterTransitionStart(
  ...args: RouterTransitionArgs
): void {
  if (!shouldLoadSentryClient()) return;

  void initSentryClient()
    .then(() => loadSentryClient())
    .then((Sentry) => {
      Sentry?.captureRouterTransitionStart(...args);
    });
}
