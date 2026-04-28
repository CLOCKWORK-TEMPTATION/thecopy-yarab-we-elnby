import "./env-bootstrap.mjs";
import { randomUUID } from "node:crypto";
import pino from "pino";
import {
  AGENT_REVIEW_SYSTEM_PROMPT,
  buildAgentReviewMessages,
  buildAgentReviewPayload,
  buildMeta,
  computeMaxTokens,
  determineCoverage,
  normalizeCommandsAgainstRequest,
  normalizeIncomingText,
  parseReviewCommands,
  validateAgentReviewRequestBody,
} from "./agent-review-core.mjs";
import {
  invokeWithFallback,
  resolveProviderErrorInfo,
} from "./langchain-fallback-chain.mjs";
import {
  logReviewChannelStartupWarnings,
  resolveReviewChannelConfig,
} from "./provider-config.mjs";
import {
  getReviewRuntimeSnapshot,
  updateReviewRuntimeSnapshot,
} from "./provider-api-runtime.mjs";

export {
  AgentReviewValidationError,
  parseReviewCommands,
  validateAgentReviewRequestBody,
} from "./agent-review-core.mjs";

const DEFAULT_MODEL_ID = "claude-opus-4-7";
const TEMPERATURE = 0.0;
const DEFAULT_TIMEOUT_MS = 180_000;
const API_VERSION = "2.0";
const API_MODE = "auto-apply";
const TOKEN_BUDGET = {
  baseOutputTokens: 1500,
  tokensPerSuspiciousLine: 1250,
  maxTokensCeiling: 80_000,
};

const AGENT_REVIEW_CHANNEL = "agent-review";
const logger = pino({ name: "agent-review" });
logReviewChannelStartupWarnings(logger, AGENT_REVIEW_CHANNEL);

const getAgentReviewConfig = (env = process.env) =>
  resolveReviewChannelConfig(AGENT_REVIEW_CHANNEL, env);

const resolveAgentReviewRuntime = (env = process.env) => {
  const snapshot = getReviewRuntimeSnapshot(AGENT_REVIEW_CHANNEL, env);
  return {
    provider: snapshot.activeProvider ?? snapshot.resolvedProvider,
    requestedModel: snapshot.requestedModel,
    resolvedModel: snapshot.resolvedModel,
    resolvedSpecifier: snapshot.resolvedSpecifier,
    fallbackApplied: snapshot.usedFallback,
    fallbackReason: snapshot.fallbackReason,
    baseUrl: snapshot.apiBaseUrl,
    apiVersion: snapshot.apiVersion,
    configured: snapshot.configured,
    warnings: [...snapshot.credentialWarnings],
  };
};

export const buildAnthropicMessageParams = (request, maxTokens) => ({
  model: getAgentReviewConfig().resolvedModel ?? DEFAULT_MODEL_ID,
  system: AGENT_REVIEW_SYSTEM_PROMPT,
  temperature: TEMPERATURE,
  max_tokens: maxTokens,
  messages: [
    {
      role: "user",
      content: JSON.stringify(buildAgentReviewPayload(request)),
    },
  ],
});

const resolveAgentReviewMockMode = () => {
  const rawValue = normalizeIncomingText(
    process.env.AGENT_REVIEW_MOCK_MODE,
    32
  ).toLowerCase();
  if (rawValue === "success" || rawValue === "error") {
    return rawValue;
  }
  return null;
};

const buildCompatibilityFailureResponse = (
  request,
  startTime,
  reviewModel,
  message
) => {
  const coverage = determineCoverage([], request, {
    ignoreForcedCoverage: true,
  });

  return {
    apiVersion: API_VERSION,
    mode: API_MODE,
    importOpId: request.importOpId,
    requestId: randomUUID(),
    status: "partial",
    commands: [],
    message,
    latencyMs: Date.now() - startTime,
    model: reviewModel,
    meta: buildMeta(coverage),
  };
};

const buildAgentReviewMockResponse = (
  request,
  mode,
  startTime,
  reviewModel
) => {
  const requestId = randomUUID();

  if (mode === "error") {
    const coverage = determineCoverage([], request);
    return {
      apiVersion: API_VERSION,
      mode: API_MODE,
      importOpId: request.importOpId,
      requestId,
      status: coverage.status,
      commands: [],
      message: "AGENT_REVIEW_MOCK_MODE=error",
      latencyMs: Date.now() - startTime,
      model: reviewModel,
      meta: buildMeta(coverage, { isMockResponse: true }),
    };
  }

  const commands = request.requiredItemIds.map((itemId) => ({
    op: "relabel",
    itemId,
    newType: "action",
    confidence: 0.99,
    reason: "Mock: confirmed by mock mode.",
  }));
  const coverage = determineCoverage(commands, request);

  return {
    apiVersion: API_VERSION,
    mode: API_MODE,
    importOpId: request.importOpId,
    requestId,
    status: coverage.status,
    commands,
    message: `Mock success: ${commands.length} commands generated.`,
    latencyMs: Date.now() - startTime,
    model: reviewModel,
    meta: buildMeta(coverage, { isMockResponse: true }),
  };
};

const updateRuntimeForStartedReview = (config, reviewModel) => {
  updateReviewRuntimeSnapshot(AGENT_REVIEW_CHANNEL, {
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
};

const updateRuntimeForMockReview = (response, mockMode) => {
  updateReviewRuntimeSnapshot(AGENT_REVIEW_CHANNEL, {
    lastStatus: response.status,
    lastErrorClass: mockMode === "error" ? "mock" : null,
    lastErrorMessage:
      mockMode === "error" ? "AGENT_REVIEW_MOCK_MODE=error" : null,
    retryCount: 0,
    latencyMs: response.latencyMs,
    lastSuccessAt: mockMode === "success" ? Date.now() : null,
    lastFailureAt: mockMode === "error" ? Date.now() : null,
  });
};

const buildSkippedReviewResponse = (request, startTime, reviewModel) => {
  const latencyMs = Date.now() - startTime;
  updateReviewRuntimeSnapshot(AGENT_REVIEW_CHANNEL, {
    lastStatus: "skipped",
    retryCount: 0,
    latencyMs,
    lastSuccessAt: Date.now(),
  });

  return {
    apiVersion: API_VERSION,
    mode: API_MODE,
    importOpId: request.importOpId,
    requestId: randomUUID(),
    status: "skipped",
    commands: [],
    message: "No suspicious lines to review.",
    latencyMs,
    model: reviewModel,
    meta: buildMeta(determineCoverage([], request)),
  };
};

const resolveConfigError = (config) =>
  (!config.primary?.valid && config.primary?.error) ||
  (!config.primary?.credential?.valid && config.primary?.credential?.message) ||
  null;

const updateRuntimeForConfigFailure = (response, configError) => {
  updateReviewRuntimeSnapshot(AGENT_REVIEW_CHANNEL, {
    lastStatus: response.status,
    lastErrorClass: "configuration",
    lastErrorMessage: configError,
    retryCount: 0,
    latencyMs: response.latencyMs,
    lastFailureAt: Date.now(),
  });
};

const buildSuccessfulInvocationResponse = (
  request,
  startTime,
  invocation,
  commands,
  coverage
) => ({
  apiVersion: API_VERSION,
  mode: API_MODE,
  importOpId: request.importOpId,
  requestId: randomUUID(),
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
  meta: buildMeta(coverage, {
    retryCount: invocation.retryCount,
  }),
});

const updateRuntimeForSuccessfulInvocation = (response, invocation) => {
  updateReviewRuntimeSnapshot(AGENT_REVIEW_CHANNEL, {
    activeProvider: invocation.provider,
    activeModel: invocation.model,
    activeSpecifier: invocation.requestedSpecifier,
    usedFallback: invocation.usedFallback,
    fallbackReason: invocation.usedFallback ? "temporary-primary-failure" : null,
    lastStatus: response.status,
    lastErrorClass: null,
    lastErrorMessage: null,
    lastProviderStatusCode: null,
    retryCount: invocation.retryCount,
    latencyMs: response.latencyMs,
    lastSuccessAt: Date.now(),
  });
};

const buildFailedInvocationResponse = (request, startTime, reviewModel, error) => {
  const providerInfo = resolveProviderErrorInfo(error);
  const coverage = determineCoverage([], request);
  return {
    apiVersion: API_VERSION,
    mode: API_MODE,
    importOpId: request.importOpId,
    requestId: randomUUID(),
    status: coverage.unresolvedForcedItemIds.length > 0 ? "error" : "partial",
    commands: [],
    message: `Agent review failed: ${providerInfo.message}`,
    latencyMs: Date.now() - startTime,
    providerStatusCode: providerInfo.status ?? null,
    model: reviewModel,
    meta: buildMeta(coverage),
  };
};

const updateRuntimeForFailedInvocation = (response, error, config, reviewModel) => {
  const providerInfo = resolveProviderErrorInfo(error);
  updateReviewRuntimeSnapshot(AGENT_REVIEW_CHANNEL, {
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
    lastStatus: response.status,
    lastErrorClass: providerInfo.temporary
      ? "temporary-provider-error"
      : "provider-error",
    lastErrorMessage: providerInfo.message,
    lastProviderStatusCode: providerInfo.status ?? null,
    retryCount: typeof error?.retryCount === "number" ? error.retryCount : 0,
    latencyMs: response.latencyMs,
    lastFailureAt: Date.now(),
  });
};

const requestReviewFromProvider = async (request, startTime, config, reviewModel) => {
  const messages = buildAgentReviewMessages(request);

  for (const boostFactor of [1, 2]) {
    const maxTokens = computeMaxTokens(request, TOKEN_BUDGET, boostFactor);

    try {
      const invocation = await invokeWithFallback({
        channel: AGENT_REVIEW_CHANNEL,
        primaryTarget: config.primary,
        fallbackTarget: config.fallback,
        messages,
        temperature: TEMPERATURE,
        maxTokens,
        timeoutMs: DEFAULT_TIMEOUT_MS,
        logger,
      });

      const rawCommands = parseReviewCommands(invocation.text);
      const commands = normalizeCommandsAgainstRequest(rawCommands, request);
      if (
        invocation.stopReason === "max_tokens" &&
        commands.length === 0 &&
        boostFactor === 1
      ) {
        continue;
      }

      const coverage = determineCoverage(commands, request);
      const response = buildSuccessfulInvocationResponse(
        request,
        startTime,
        invocation,
        commands,
        coverage
      );
      updateRuntimeForSuccessfulInvocation(response, invocation);
      return response;
    } catch (error) {
      const response = buildFailedInvocationResponse(
        request,
        startTime,
        reviewModel,
        error
      );
      updateRuntimeForFailedInvocation(response, error, config, reviewModel);
      return response;
    }
  }

  return buildCompatibilityFailureResponse(
    request,
    startTime,
    reviewModel,
    "Agent review returned no parseable commands."
  );
};

export const requestReview = async (body) => {
  const startTime = Date.now();
  const request = validateAgentReviewRequestBody(body);
  const config = getAgentReviewConfig();
  const reviewModel = config.resolvedModel ?? DEFAULT_MODEL_ID;
  const mockMode = resolveAgentReviewMockMode();

  updateRuntimeForStartedReview(config, reviewModel);

  if (mockMode) {
    const response = buildAgentReviewMockResponse(
      request,
      mockMode,
      startTime,
      reviewModel
    );
    updateRuntimeForMockReview(response, mockMode);
    return response;
  }

  if (request.suspiciousLines.length === 0) {
    return buildSkippedReviewResponse(request, startTime, reviewModel);
  }

  const configError = resolveConfigError(config);
  if (configError) {
    const response = buildCompatibilityFailureResponse(
      request,
      startTime,
      reviewModel,
      configError
    );
    updateRuntimeForConfigFailure(response, configError);
    return response;
  }

  return requestReviewFromProvider(request, startTime, config, reviewModel);
};

export const reviewSuspiciousLinesWithClaude = requestReview;

export const getReviewModel = () =>
  resolveAgentReviewRuntime().resolvedModel || DEFAULT_MODEL_ID;

export const getReviewRuntime = () => resolveAgentReviewRuntime();
