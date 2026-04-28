import "./env-bootstrap.mjs";
import { randomUUID } from "node:crypto";
import pino from "pino";

import {
  invokeWithFallback,
  resolveProviderErrorInfo,
} from "./langchain-fallback-chain.mjs";
import {
  logReviewChannelStartupWarnings,
  resolveReviewChannelConfig,
} from "./provider-config.mjs";
import { updateReviewRuntimeSnapshot } from "./provider-api-runtime.mjs";
import {
  API_MODE,
  API_VERSION,
  DEFAULT_MODEL_ID,
  DEFAULT_TIMEOUT_MS,
  MAX_OUTPUT_TOKENS,
  SUSPICION_REVIEW_CHANNEL,
  TEMPERATURE,
} from "./suspicion-review.constants.mjs";
import {
  buildMessages,
  normalizeDiscoveredLines,
  normalizeReviewedLines,
  parseResponseJson,
} from "./suspicion-review.parsing.mjs";
import { buildMockResponse, resolveMockMode } from "./suspicion-review.mock.mjs";
import {
  SuspicionReviewValidationError,
  validateSuspicionReviewRequestBody,
} from "./suspicion-review.validation.mjs";

const logger = pino({ name: "suspicion-review" });
logReviewChannelStartupWarnings(logger, SUSPICION_REVIEW_CHANNEL);

const getConfig = (env = process.env) =>
  resolveReviewChannelConfig(SUSPICION_REVIEW_CHANNEL, env);

export { SuspicionReviewValidationError, validateSuspicionReviewRequestBody };

export const requestSuspicionReview = async (body) => {
  const startTime = Date.now();
  const request = validateSuspicionReviewRequestBody(body);
  const config = getConfig();
  const modelId = config.resolvedModel ?? DEFAULT_MODEL_ID;
  const mockMode = resolveMockMode();

  updateReviewRuntimeSnapshot(SUSPICION_REVIEW_CHANNEL, {
    activeProvider: config.resolvedProvider,
    activeModel: modelId,
    activeSpecifier: config.resolvedSpecifier,
    usedFallback: false,
    fallbackReason: null,
    lastStatus: "running",
    lastErrorClass: null,
    lastErrorMessage: null,
    lastProviderStatusCode: null,
    retryCount: 0,
    latencyMs: null,
    lastInvocationAt: Date.now(),
  });

  if (mockMode) {
    return buildMockResponse(request, mockMode, startTime, modelId);
  }

  if (request.reviewLines.length === 0) {
    return {
      apiVersion: API_VERSION,
      mode: API_MODE,
      importOpId: request.importOpId,
      requestId: randomUUID(),
      status: "skipped",
      reviewedLines: [],
      discoveredLines: [],
      message: "No review lines.",
      latencyMs: Date.now() - startTime,
      model: modelId,
    };
  }

  const configError =
    (!config.primary?.valid && config.primary?.error) ||
    (!config.primary?.credential?.valid &&
      config.primary?.credential?.message) ||
    null;
  if (configError) {
    return {
      apiVersion: API_VERSION,
      mode: API_MODE,
      importOpId: request.importOpId,
      requestId: randomUUID(),
      status: "error",
      reviewedLines: [],
      discoveredLines: [],
      message: configError,
      latencyMs: Date.now() - startTime,
      model: modelId,
    };
  }

  try {
    const invocation = await invokeWithFallback({
      channel: SUSPICION_REVIEW_CHANNEL,
      primaryTarget: config.primary,
      fallbackTarget: config.fallback,
      messages: buildMessages(request),
      temperature: TEMPERATURE,
      maxTokens: MAX_OUTPUT_TOKENS,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      logger,
    });

    const parsed = parseResponseJson(invocation.text);
    const reviewedLines = normalizeReviewedLines(parsed, request);
    const discoveredLines = normalizeDiscoveredLines(parsed, request);
    const latencyMs = Date.now() - startTime;

    updateReviewRuntimeSnapshot(SUSPICION_REVIEW_CHANNEL, {
      activeProvider: invocation.provider,
      activeModel: invocation.model,
      activeSpecifier: invocation.requestedSpecifier,
      usedFallback: invocation.usedFallback,
      fallbackReason: invocation.usedFallback
        ? "temporary-primary-failure"
        : null,
      lastStatus: "applied",
      lastErrorClass: null,
      lastErrorMessage: null,
      lastProviderStatusCode: null,
      retryCount: invocation.retryCount,
      latencyMs,
      lastSuccessAt: Date.now(),
    });

    return {
      apiVersion: API_VERSION,
      mode: API_MODE,
      importOpId: request.importOpId,
      requestId: randomUUID(),
      status: "applied",
      reviewedLines,
      discoveredLines,
      message: `Reviewed ${reviewedLines.length} lines.`,
      latencyMs,
      model: invocation.model,
    };
  } catch (error) {
    const providerInfo = resolveProviderErrorInfo(error);
    const latencyMs = Date.now() - startTime;
    updateReviewRuntimeSnapshot(SUSPICION_REVIEW_CHANNEL, {
      lastStatus: "error",
      lastErrorClass: providerInfo.temporary
        ? "temporary-provider-error"
        : "provider-error",
      lastErrorMessage: providerInfo.message,
      lastProviderStatusCode: providerInfo.status ?? null,
      latencyMs,
      lastFailureAt: Date.now(),
    });

    return {
      apiVersion: API_VERSION,
      mode: API_MODE,
      importOpId: request.importOpId,
      requestId: randomUUID(),
      status: "error",
      reviewedLines: [],
      discoveredLines: [],
      message: `Suspicion review failed: ${providerInfo.message}`,
      latencyMs,
      model: modelId,
    };
  }
};
