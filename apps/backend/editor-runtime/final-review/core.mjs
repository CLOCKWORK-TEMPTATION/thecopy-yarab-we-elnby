// ─────────────────────────────────────────────────────────
// final-review/core.mjs — الدالة الرئيسية requestFinalReview
// ─────────────────────────────────────────────────────────

import { randomUUID } from "crypto";
import { invokeWithFallback, resolveProviderErrorInfo } from "../langchain-fallback-chain.mjs";
import { updateReviewRuntimeSnapshot } from "../provider-api-runtime.mjs";
import {
  FINAL_REVIEW_CHANNEL,
  API_VERSION,
  API_MODE,
  TEMPERATURE,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MODEL_ID,
} from "./constants.mjs";
import { resolveFinalReviewRuntime } from "./config.mjs";
import { validateFinalReviewRequestBody } from "./validation.mjs";
import { buildFinalReviewMessages } from "./messaging.mjs";
import { parseFinalReviewResponse, normalizeCommandsAgainstRequest } from "./response.mjs";
import { determineCoverageStatus } from "./coverage.mjs";
import {
  resolveFinalReviewMockMode,
  buildFinalReviewMockResponse,
  buildFinalReviewMeta,
  computeFinalReviewMaxTokens,
} from "./mock.mjs";
import { logger, getFinalReviewConfig } from "./config.mjs";

export const requestFinalReview = async (body) => {
  const startTime = Date.now();
  const request = validateFinalReviewRequestBody(body);
  const requestId = randomUUID();
  const config = getFinalReviewConfig();
  const reviewModel = config.resolvedModel ?? DEFAULT_MODEL_ID;
  const mockMode = resolveFinalReviewMockMode();

  updateReviewRuntimeSnapshot(FINAL_REVIEW_CHANNEL, {
    activeProvider: config.resolvedProvider,
    activeModel: reviewModel,
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
    const response = buildFinalReviewMockResponse(
      request,
      mockMode,
      startTime,
      reviewModel
    );
    updateReviewRuntimeSnapshot(FINAL_REVIEW_CHANNEL, {
      lastStatus: response.status,
      lastErrorClass: mockMode === "error" ? "mock" : null,
      lastErrorMessage:
        mockMode === "error" ? "FINAL_REVIEW_MOCK_MODE=error" : null,
      retryCount: 0,
      latencyMs: response.latencyMs,
      lastSuccessAt: mockMode === "success" ? Date.now() : null,
      lastFailureAt: mockMode === "error" ? Date.now() : null,
    });
    return response;
  }

  if (request.suspiciousLines.length === 0) {
    const latencyMs = Date.now() - startTime;
    updateReviewRuntimeSnapshot(FINAL_REVIEW_CHANNEL, {
      lastStatus: "skipped",
      retryCount: 0,
      latencyMs,
      lastSuccessAt: Date.now(),
    });
    return {
      apiVersion: API_VERSION,
      mode: API_MODE,
      importOpId: request.importOpId,
      requestId,
      status: "skipped",
      commands: [],
      message: "No suspicious lines to review.",
      latencyMs,
      model: reviewModel,
      meta: buildFinalReviewMeta({
        coverage: determineCoverageStatus([], request),
      }),
    };
  }

  const configError =
    (!config.primary?.valid && config.primary?.error) ||
    (!config.primary?.credential?.valid &&
      config.primary?.credential?.message) ||
    null;

  if (configError) {
    const coverage = determineCoverageStatus([], request);
    const latencyMs = Date.now() - startTime;
    updateReviewRuntimeSnapshot(FINAL_REVIEW_CHANNEL, {
      lastStatus: coverage.status,
      lastErrorClass: "configuration",
      lastErrorMessage: configError,
      retryCount: 0,
      latencyMs,
      lastFailureAt: Date.now(),
    });
    return {
      apiVersion: API_VERSION,
      mode: API_MODE,
      importOpId: request.importOpId,
      requestId,
      status: coverage.status,
      commands: [],
      message: configError,
      latencyMs,
      model: reviewModel,
      meta: buildFinalReviewMeta({ coverage }),
    };
  }

  const messages = buildFinalReviewMessages(request);

  for (const boostFactor of [1, 2]) {
    const maxTokens = computeFinalReviewMaxTokens(request, boostFactor);
    try {
      const invocation = await invokeWithFallback({
        channel: FINAL_REVIEW_CHANNEL,
        primaryTarget: config.primary,
        fallbackTarget: config.fallback,
        messages,
        temperature: TEMPERATURE,
        maxTokens,
        timeoutMs: DEFAULT_TIMEOUT_MS,
        logger,
      });

      const rawCommands = parseFinalReviewResponse(invocation.text);
      const commands = normalizeCommandsAgainstRequest(rawCommands, request);
      if (
        invocation.stopReason === "max_tokens" &&
        commands.length === 0 &&
        boostFactor === 1
      ) {
        logger.warn(
          {
            channel: FINAL_REVIEW_CHANNEL,
            provider: invocation.provider,
            model: invocation.model,
            maxTokens,
          },
          "final review response reached max tokens without parseable commands"
        );
        continue;
      }

      const coverage = determineCoverageStatus(commands, request);
      const response = {
        apiVersion: API_VERSION,
        mode: API_MODE,
        importOpId: request.importOpId,
        requestId,
        status: coverage.status,
        commands,
        message:
          coverage.status === "applied"
            ? `All ${commands.length} items resolved.`
            : coverage.status === "partial"
              ? `${commands.length} of ${request.requiredItemIds.length} items resolved.`
              : `${coverage.unresolvedForcedItemIds.length} forced items unresolved.`,
        latencyMs: Date.now() - startTime,
        model: invocation.model,
        meta: buildFinalReviewMeta({
          coverage,
          inputTokens: invocation.inputTokens,
          outputTokens: invocation.outputTokens,
          retryCount: invocation.retryCount,
        }),
      };

      updateReviewRuntimeSnapshot(FINAL_REVIEW_CHANNEL, {
        activeProvider: invocation.provider,
        activeModel: invocation.model,
        activeSpecifier: invocation.requestedSpecifier,
        usedFallback: invocation.usedFallback,
        fallbackReason: invocation.usedFallback
          ? "temporary-primary-failure"
          : null,
        lastStatus: response.status,
        lastErrorClass: null,
        lastErrorMessage: null,
        lastProviderStatusCode: null,
        retryCount: invocation.retryCount,
        latencyMs: response.latencyMs,
        lastSuccessAt: Date.now(),
      });

      logger.info(
        {
          channel: FINAL_REVIEW_CHANNEL,
          provider: invocation.provider,
          model: invocation.model,
          usedFallback: invocation.usedFallback,
          retryCount: invocation.retryCount,
          latencyMs: response.latencyMs,
        },
        "final review completed"
      );

      return response;
    } catch (error) {
      const providerInfo = resolveProviderErrorInfo(error);
      const latencyMs = Date.now() - startTime;
      updateReviewRuntimeSnapshot(FINAL_REVIEW_CHANNEL, {
        activeProvider: error?.provider ?? config.resolvedProvider,
        activeModel: error?.model ?? reviewModel,
        activeSpecifier: error?.specifier ?? config.resolvedSpecifier,
        usedFallback: Boolean(
          config.fallback?.usable &&
          error?.specifier &&
          config.fallback.specifier === error.specifier
        ),
        fallbackReason:
          config.fallback?.usable &&
          error?.specifier &&
          config.fallback.specifier === error.specifier
            ? "fallback-exhausted"
            : null,
        lastStatus: "error",
        lastErrorClass: providerInfo.temporary
          ? "temporary-provider-error"
          : "provider-error",
        lastErrorMessage: providerInfo.message,
        lastProviderStatusCode: providerInfo.status ?? null,
        retryCount:
          typeof error?.retryCount === "number" ? error.retryCount : 0,
        latencyMs,
        lastFailureAt: Date.now(),
      });

      logger.error(
        {
          channel: FINAL_REVIEW_CHANNEL,
          provider: error?.provider ?? config.resolvedProvider,
          model: error?.model ?? reviewModel,
          status: providerInfo.status,
          temporary: providerInfo.temporary,
        },
        "final review failed"
      );

      return {
        apiVersion: API_VERSION,
        mode: API_MODE,
        importOpId: request.importOpId,
        requestId,
        status: "error",
        commands: [],
        message: `Final review failed: ${providerInfo.message}`,
        latencyMs,
        providerStatusCode: providerInfo.status ?? null,
        model: reviewModel,
        meta: buildFinalReviewMeta({
          coverage: determineCoverageStatus([], request),
        }),
      };
    }
  }

  const latencyMs = Date.now() - startTime;
  return {
    apiVersion: API_VERSION,
    mode: API_MODE,
    importOpId: request.importOpId,
    requestId,
    status: "partial",
    commands: [],
    message: "Final review returned no parseable commands.",
    latencyMs,
    model: reviewModel,
    meta: buildFinalReviewMeta({
      coverage: determineCoverageStatus([], request),
    }),
  };
};

export const getFinalReviewModel = () =>
  resolveFinalReviewRuntime().resolvedModel || DEFAULT_MODEL_ID;

export const getFinalReviewRuntime = () => resolveFinalReviewRuntime();
