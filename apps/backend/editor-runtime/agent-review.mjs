import "./env-bootstrap.mjs";
import { randomUUID } from "node:crypto";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import pino from "pino";
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

const DEFAULT_MODEL_ID = "claude-opus-4-7";
const TEMPERATURE = 0.0;
const DEFAULT_TIMEOUT_MS = 180_000;
const API_VERSION = "2.0";
const API_MODE = "auto-apply";
// معدَّل لتوكنايزر Opus 4.7 (يستهلك ~1.25x توكن أكتر من 4.6)
const BASE_OUTPUT_TOKENS = 1500;
const TOKENS_PER_SUSPICIOUS_LINE = 1250;
const MAX_TOKENS_CEILING = 80_000;
const MAX_TEXT_LENGTH = 6_000;

const AGENT_REVIEW_CHANNEL = "agent-review";
const logger = pino({ name: "agent-review" });
logReviewChannelStartupWarnings(logger, AGENT_REVIEW_CHANNEL);

const ALLOWED_LINE_TYPES = new Set([
  "action",
  "dialogue",
  "character",
  "scene_header_1",
  "scene_header_2",
  "scene_header_3",
  "scene_header_top_line",
  "transition",
  "parenthetical",
  "basmala",
]);

const ALLOWED_ROUTING_BANDS = new Set(["agent-candidate", "agent-forced"]);

const AGENT_REVIEW_SYSTEM_PROMPT = `
أنت وكيل مراجعة لعناصر السيناريو العربي.

ارجع JSON فقط.

الأوامر المسموح بها:
- relabel
- split

إذا أرجعت scene_header_top_line في التصحيح فيجب أن يُعامل كرأس مشهد أول.
`;

const isObjectRecord = (value) => typeof value === "object" && value !== null;

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const isIntegerNumber = (value) => Number.isInteger(value) && value >= 0;

const normalizeIncomingText = (value, maxLength = 50_000) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
};

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

const normalizeAgentDecisionType = (lineType) => {
  if (lineType === "scene_header_top_line") {
    return "scene_header_1";
  }
  return lineType;
};

const resolveSuspiciousItemId = (entry, index) => {
  if (isNonEmptyString(entry?.itemId)) {
    return entry.itemId.trim();
  }

  if (isIntegerNumber(entry?.itemIndex)) {
    return `item-${String(entry.itemIndex)}`;
  }

  if (isIntegerNumber(entry?.lineIndex)) {
    return `item-${String(entry.lineIndex)}`;
  }

  return `item-${String(index)}`;
};

export class AgentReviewValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AgentReviewValidationError";
    this.statusCode = 400;
  }
}

export const validateAgentReviewRequestBody = (body) => {
  if (!isObjectRecord(body)) {
    throw new AgentReviewValidationError(
      "Invalid agent-review request body: must be a JSON object."
    );
  }

  const sessionId = normalizeIncomingText(body.sessionId, 120);
  if (!isNonEmptyString(sessionId)) {
    throw new AgentReviewValidationError(
      "Missing or invalid sessionId: must be a non-empty string."
    );
  }

  const importOpId = normalizeIncomingText(body.importOpId, 120);
  if (!isNonEmptyString(importOpId)) {
    throw new AgentReviewValidationError(
      "Missing or invalid importOpId: must be a non-empty string."
    );
  }

  if (!isIntegerNumber(body.totalReviewed)) {
    throw new AgentReviewValidationError(
      "Invalid totalReviewed: must be a non-negative integer."
    );
  }

  if (!Array.isArray(body.suspiciousLines)) {
    throw new AgentReviewValidationError(
      "Invalid suspiciousLines: must be an array."
    );
  }

  const seenItemIds = new Set();
  const suspiciousLines = body.suspiciousLines.map((entry, index) => {
    if (!isObjectRecord(entry)) {
      throw new AgentReviewValidationError(
        `Invalid suspicious line at index ${index}: must be an object.`
      );
    }

    const itemId = resolveSuspiciousItemId(entry, index);
    if (seenItemIds.has(itemId)) {
      throw new AgentReviewValidationError(
        `Duplicate itemId "${itemId}" in suspiciousLines.`
      );
    }
    seenItemIds.add(itemId);

    const text = normalizeIncomingText(entry.text, MAX_TEXT_LENGTH);
    if (!isNonEmptyString(text)) {
      throw new AgentReviewValidationError(
        `Invalid text at suspicious line ${index}: must be a non-empty string.`
      );
    }

    const assignedType = normalizeIncomingText(entry.assignedType, 64);
    if (!ALLOWED_LINE_TYPES.has(assignedType)) {
      throw new AgentReviewValidationError(
        `Invalid assignedType "${assignedType}" at suspicious line ${index}.`
      );
    }

    const totalSuspicion = entry.totalSuspicion;
    if (
      typeof totalSuspicion !== "number" ||
      !Number.isFinite(totalSuspicion) ||
      totalSuspicion < 0 ||
      totalSuspicion > 100
    ) {
      throw new AgentReviewValidationError(
        `Invalid totalSuspicion at suspicious line ${index}: must be a number 0-100.`
      );
    }

    const routingBand = normalizeIncomingText(entry.routingBand, 32);
    const normalizedRoutingBand = ALLOWED_ROUTING_BANDS.has(routingBand)
      ? routingBand
      : "agent-candidate";

    const contextLines = Array.isArray(entry.contextLines)
      ? entry.contextLines
          .filter((line) => isObjectRecord(line))
          .map((line) => ({
            lineIndex: isIntegerNumber(line.lineIndex)
              ? line.lineIndex
              : undefined,
            assignedType: isNonEmptyString(line.assignedType)
              ? normalizeAgentDecisionType(line.assignedType.trim())
              : undefined,
            text: isNonEmptyString(line.text)
              ? normalizeIncomingText(line.text, 4000)
              : undefined,
          }))
      : [];

    return {
      itemId,
      itemIndex: isIntegerNumber(entry.itemIndex) ? entry.itemIndex : index,
      lineIndex: isIntegerNumber(entry.lineIndex)
        ? entry.lineIndex
        : isIntegerNumber(entry.itemIndex)
          ? entry.itemIndex
          : index,
      text,
      assignedType,
      totalSuspicion,
      reasons: Array.isArray(entry.reasons)
        ? entry.reasons.filter((reason) => isNonEmptyString(reason))
        : [],
      contextLines,
      escalationScore:
        typeof entry.escalationScore === "number" &&
        Number.isFinite(entry.escalationScore)
          ? entry.escalationScore
          : undefined,
      routingBand: normalizedRoutingBand,
      criticalMismatch:
        typeof entry.criticalMismatch === "boolean"
          ? entry.criticalMismatch
          : undefined,
      distinctDetectors: isIntegerNumber(entry.distinctDetectors)
        ? entry.distinctDetectors
        : undefined,
      fingerprint: isNonEmptyString(entry.fingerprint)
        ? normalizeIncomingText(entry.fingerprint, 256)
        : undefined,
    };
  });

  const normalizeMetaIds = (value) =>
    Array.isArray(value)
      ? [...new Set(value.filter((item) => isNonEmptyString(item)))]
      : null;

  const requiredItemIds =
    normalizeMetaIds(body.requiredItemIds) ??
    suspiciousLines.map((line) => line.itemId);
  const forcedItemIds =
    normalizeMetaIds(body.forcedItemIds) ??
    suspiciousLines
      .filter((line) => line.routingBand === "agent-forced")
      .map((line) => line.itemId);

  const requiredItemIdSet = new Set(requiredItemIds);
  for (const forcedItemId of forcedItemIds) {
    if (!requiredItemIdSet.has(forcedItemId)) {
      throw new AgentReviewValidationError(
        "forcedItemIds must be subset of requiredItemIds."
      );
    }
  }

  for (const requiredItemId of requiredItemIds) {
    if (!seenItemIds.has(requiredItemId)) {
      throw new AgentReviewValidationError(
        `requiredItemIds contains unknown itemId "${requiredItemId}".`
      );
    }
  }

  return {
    sessionId,
    importOpId,
    totalReviewed: body.totalReviewed,
    suspiciousLines,
    requiredItemIds,
    forcedItemIds,
    reviewPacketText: isNonEmptyString(body.reviewPacketText)
      ? normalizeIncomingText(body.reviewPacketText, 160_000)
      : undefined,
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
      content: JSON.stringify({
        totalReviewed: request.totalReviewed,
        requiredItemIds: request.requiredItemIds,
        forcedItemIds: request.forcedItemIds,
        suspiciousLines: request.suspiciousLines,
        reviewPacketText: request.reviewPacketText,
      }),
    },
  ],
});

const parseResponseJson = (text) => {
  try {
    return JSON.parse(text.trim());
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
};

export const parseReviewCommands = (text) => {
  if (!isNonEmptyString(text)) {
    return [];
  }

  const parsed = parseResponseJson(text);
  const commands = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.commands)
      ? parsed.commands
      : [];

  return commands
    .filter(
      (command) => isObjectRecord(command) && isNonEmptyString(command.op)
    )
    .flatMap((command) => {
      if (!isNonEmptyString(command.itemId)) {
        return [];
      }

      if (command.op === "relabel" && isNonEmptyString(command.newType)) {
        return [
          {
            op: "relabel",
            itemId: command.itemId.trim(),
            newType: normalizeAgentDecisionType(command.newType.trim()),
            confidence:
              typeof command.confidence === "number" &&
              Number.isFinite(command.confidence)
                ? Math.max(0, Math.min(1, command.confidence))
                : 0.5,
            reason: isNonEmptyString(command.reason)
              ? command.reason.trim()
              : "",
          },
        ];
      }

      if (
        command.op === "split" &&
        Number.isInteger(command.splitAt) &&
        command.splitAt >= 0 &&
        isNonEmptyString(command.leftType) &&
        isNonEmptyString(command.rightType)
      ) {
        return [
          {
            op: "split",
            itemId: command.itemId.trim(),
            splitAt: command.splitAt,
            leftType: normalizeAgentDecisionType(command.leftType.trim()),
            rightType: normalizeAgentDecisionType(command.rightType.trim()),
            confidence:
              typeof command.confidence === "number" &&
              Number.isFinite(command.confidence)
                ? Math.max(0, Math.min(1, command.confidence))
                : 0.5,
            reason: isNonEmptyString(command.reason)
              ? command.reason.trim()
              : "",
          },
        ];
      }

      return [];
    });
};

const normalizeCommandsAgainstRequest = (commands, request) => {
  const validItemIds = new Set(
    request.suspiciousLines.map((line) => line.itemId)
  );
  const bestByItemId = new Map();

  for (const command of commands) {
    if (!validItemIds.has(command.itemId)) {
      continue;
    }

    const existing = bestByItemId.get(command.itemId);
    const currentConfidence =
      typeof command.confidence === "number" ? command.confidence : 0;
    const existingConfidence =
      typeof existing?.confidence === "number" ? existing.confidence : -1;

    if (!existing || currentConfidence > existingConfidence) {
      bestByItemId.set(command.itemId, command);
    }
  }

  return [...bestByItemId.values()];
};

const determineCoverage = (commands, request, options = {}) => {
  const resolvedItemIds = commands.map((command) => command.itemId);
  const resolvedSet = new Set(resolvedItemIds);
  const missingItemIds = request.requiredItemIds.filter(
    (itemId) => !resolvedSet.has(itemId)
  );
  const forcedItemIds = [...request.forcedItemIds];
  const unresolvedForcedItemIds = options.ignoreForcedCoverage
    ? []
    : forcedItemIds.filter((itemId) => !resolvedSet.has(itemId));

  let status = "partial";
  if (request.requiredItemIds.length === 0) {
    status = "skipped";
  } else if (unresolvedForcedItemIds.length > 0) {
    status = "error";
  } else if (missingItemIds.length === 0) {
    status = "applied";
  }

  return {
    status,
    requestedCount: request.requiredItemIds.length,
    commandCount: commands.length,
    missingItemIds,
    forcedItemIds,
    unresolvedForcedItemIds,
  };
};

const buildMeta = (coverage, extras = {}) => ({
  requestedCount: coverage.requestedCount,
  commandCount: coverage.commandCount,
  missingItemIds: coverage.missingItemIds,
  forcedItemIds: coverage.forcedItemIds,
  unresolvedForcedItemIds: coverage.unresolvedForcedItemIds,
  ...(typeof extras.retryCount === "number"
    ? { retryCount: extras.retryCount }
    : {}),
  ...(typeof extras.isMockResponse === "boolean"
    ? { isMockResponse: extras.isMockResponse }
    : {}),
});

const computeMaxTokens = (request, boostFactor = 1) =>
  Math.min(
    MAX_TOKENS_CEILING,
    Math.max(
      BASE_OUTPUT_TOKENS,
      Math.ceil(
        (BASE_OUTPUT_TOKENS +
          request.suspiciousLines.length * TOKENS_PER_SUSPICIOUS_LINE) *
          boostFactor
      )
    )
  );

const buildAgentReviewMessages = (request) => [
  new SystemMessage(AGENT_REVIEW_SYSTEM_PROMPT),
  new HumanMessage(
    JSON.stringify({
      totalReviewed: request.totalReviewed,
      requiredItemIds: request.requiredItemIds,
      forcedItemIds: request.forcedItemIds,
      suspiciousLines: request.suspiciousLines,
      reviewPacketText: request.reviewPacketText,
    })
  ),
];

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

export const requestReview = async (body) => {
  const startTime = Date.now();
  const request = validateAgentReviewRequestBody(body);
  const config = getAgentReviewConfig();
  const reviewModel = config.resolvedModel ?? DEFAULT_MODEL_ID;
  const mockMode = resolveAgentReviewMockMode();

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

  if (mockMode) {
    const response = buildAgentReviewMockResponse(
      request,
      mockMode,
      startTime,
      reviewModel
    );

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

    return response;
  }

  if (request.suspiciousLines.length === 0) {
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
  }

  const configError =
    (!config.primary?.valid && config.primary?.error) ||
    (!config.primary?.credential?.valid &&
      config.primary?.credential?.message) ||
    null;

  if (configError) {
    const response = buildCompatibilityFailureResponse(
      request,
      startTime,
      reviewModel,
      configError
    );

    updateReviewRuntimeSnapshot(AGENT_REVIEW_CHANNEL, {
      lastStatus: response.status,
      lastErrorClass: "configuration",
      lastErrorMessage: configError,
      retryCount: 0,
      latencyMs: response.latencyMs,
      lastFailureAt: Date.now(),
    });

    return response;
  }

  const messages = buildAgentReviewMessages(request);

  for (const boostFactor of [1, 2]) {
    const maxTokens = computeMaxTokens(request, boostFactor);

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
      const response = {
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
      };

      updateReviewRuntimeSnapshot(AGENT_REVIEW_CHANNEL, {
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

      return response;
    } catch (error) {
      const providerInfo = resolveProviderErrorInfo(error);
      const coverage = determineCoverage([], request);
      const response = {
        apiVersion: API_VERSION,
        mode: API_MODE,
        importOpId: request.importOpId,
        requestId: randomUUID(),
        status:
          coverage.unresolvedForcedItemIds.length > 0 ? "error" : "partial",
        commands: [],
        message: `Agent review failed: ${providerInfo.message}`,
        latencyMs: Date.now() - startTime,
        providerStatusCode: providerInfo.status ?? null,
        model: reviewModel,
        meta: buildMeta(coverage),
      };

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
        retryCount:
          typeof error?.retryCount === "number" ? error.retryCount : 0,
        latencyMs: response.latencyMs,
        lastFailureAt: Date.now(),
      });

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

export const reviewSuspiciousLinesWithClaude = requestReview;

export const getReviewModel = () =>
  resolveAgentReviewRuntime().resolvedModel || DEFAULT_MODEL_ID;

export const getReviewRuntime = () => resolveAgentReviewRuntime();
