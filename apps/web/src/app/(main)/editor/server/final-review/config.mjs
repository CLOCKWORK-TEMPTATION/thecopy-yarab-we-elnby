// ─────────────────────────────────────────────────────────
// final-review/config.mjs — إعدادات القناة والـ Runtime
// ─────────────────────────────────────────────────────────

import pino from "pino";
import {
  logReviewChannelStartupWarnings,
  resolveReviewChannelConfig,
} from "../provider-config.mjs";
import { getReviewRuntimeSnapshot } from "../provider-api-runtime.mjs";
import { FINAL_REVIEW_CHANNEL } from "./constants.mjs";

export const logger = pino({ name: "final-review" });
logReviewChannelStartupWarnings(logger, "final-review");

export const getFinalReviewConfig = (env = process.env) =>
  resolveReviewChannelConfig(FINAL_REVIEW_CHANNEL, env);

export const resolveFinalReviewRuntime = (env = process.env) => {
  const snapshot = getReviewRuntimeSnapshot(FINAL_REVIEW_CHANNEL, env);
  return {
    provider: snapshot.activeProvider ?? snapshot.resolvedProvider,
    requestedModel: snapshot.requestedModel,
    resolvedModel: snapshot.resolvedModel,
    resolvedSpecifier: snapshot.resolvedSpecifier,
    fallbackApplied: snapshot.usedFallback,
    fallbackReason: snapshot.fallbackReason,
    fallbackModel: snapshot.fallbackModel,
    fallbackSpecifier: snapshot.fallbackSpecifier,
    baseUrl: snapshot.apiBaseUrl,
    apiVersion: snapshot.apiVersion,
    configured: snapshot.configured,
    warnings: [...snapshot.credentialWarnings],
  };
};
