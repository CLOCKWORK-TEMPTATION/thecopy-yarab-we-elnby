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

const API_VERSION = "1.0";
const API_MODE = "contextual-suspicion";
const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_MODEL_ID = "claude-opus-4-7";
const TEMPERATURE = 0.0;
const MAX_TEXT_LENGTH = 8_000;
const MAX_REASONS = 32;
const MAX_CONTEXT_LINES = 6;
const MAX_OUTPUT_TOKENS = 16_000;
const SUSPICION_REVIEW_CHANNEL = "suspicion-review";

const logger = pino({ name: "suspicion-review" });
logReviewChannelStartupWarnings(logger, SUSPICION_REVIEW_CHANNEL);

const ALLOWED_LINE_TYPES = new Set([
  "action",
  "dialogue",
  "character",
  "scene_header_top_line",
  "scene_header_1",
  "scene_header_2",
  "scene_header_3",
  "transition",
  "parenthetical",
  "basmala",
]);

const ALLOWED_INPUT_BANDS = new Set([
  "local-review",
  "agent-candidate",
  "agent-forced",
]);
const ALLOWED_OUTPUT_BANDS = new Set([
  "local-review",
  "agent-candidate",
  "agent-forced",
]);
const ALLOWED_DISCOVERED_BANDS = new Set(["agent-candidate", "agent-forced"]);

const isObjectRecord = (value) => typeof value === "object" && value !== null;

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const isIntegerNumber = (value) => Number.isInteger(value) && value >= 0;

const normalizeIncomingText = (value, maxLength = 50_000) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
};

const getConfig = (env = process.env) =>
  resolveReviewChannelConfig(SUSPICION_REVIEW_CHANNEL, env);

export class SuspicionReviewValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "SuspicionReviewValidationError";
    this.statusCode = 400;
  }
}

export const validateSuspicionReviewRequestBody = (body) => {
  if (!isObjectRecord(body)) {
    throw new SuspicionReviewValidationError(
      "Invalid suspicion-review request body: must be a JSON object.",
    );
  }

  const apiVersion = normalizeIncomingText(body.apiVersion, 32);
  if (!apiVersion) {
    throw new SuspicionReviewValidationError("Missing apiVersion.");
  }

  const importOpId = normalizeIncomingText(body.importOpId, 120);
  if (!importOpId) {
    throw new SuspicionReviewValidationError("Missing importOpId.");
  }

  const sessionId = normalizeIncomingText(body.sessionId, 120);
  if (!sessionId) {
    throw new SuspicionReviewValidationError("Missing sessionId.");
  }

  if (!isIntegerNumber(body.totalReviewed)) {
    throw new SuspicionReviewValidationError(
      "Invalid totalReviewed: must be a non-negative integer.",
    );
  }

  if (!Array.isArray(body.reviewLines)) {
    throw new SuspicionReviewValidationError(
      "Invalid reviewLines: must be an array.",
    );
  }

  const seenItemIds = new Set();
  const reviewLines = body.reviewLines.map((entry, index) => {
    if (!isObjectRecord(entry)) {
      throw new SuspicionReviewValidationError(
        `Invalid review line at index ${index}: must be an object.`,
      );
    }

    const itemId = normalizeIncomingText(entry.itemId, 120);
    if (!itemId) {
      throw new SuspicionReviewValidationError(
        `Invalid itemId at review line ${index}.`,
      );
    }
    if (seenItemIds.has(itemId)) {
      throw new SuspicionReviewValidationError(`Duplicate itemId "${itemId}".`);
    }
    seenItemIds.add(itemId);

    const text = normalizeIncomingText(entry.text, MAX_TEXT_LENGTH);
    if (!text) {
      throw new SuspicionReviewValidationError(
        `Empty text at review line ${index}.`,
      );
    }

    const assignedType = normalizeIncomingText(entry.assignedType, 64);
    if (!ALLOWED_LINE_TYPES.has(assignedType)) {
      throw new SuspicionReviewValidationError(
        `Invalid assignedType "${assignedType}" at review line ${index}.`,
      );
    }

    const routingBand = normalizeIncomingText(entry.routingBand, 32);
    if (!ALLOWED_INPUT_BANDS.has(routingBand)) {
      throw new SuspicionReviewValidationError(
        `Invalid routingBand "${routingBand}" at review line ${index}.`,
      );
    }

    const lineIndex = isIntegerNumber(entry.lineIndex)
      ? entry.lineIndex
      : index;
    const originalConfidence =
      typeof entry.originalConfidence === "number" &&
      Number.isFinite(entry.originalConfidence)
        ? Math.max(0, Math.min(1, entry.originalConfidence))
        : 0;
    const suspicionScore =
      typeof entry.suspicionScore === "number" &&
      Number.isFinite(entry.suspicionScore)
        ? Math.max(0, Math.min(100, entry.suspicionScore))
        : 0;

    const primarySuggestedType =
      typeof entry.primarySuggestedType === "string" &&
      ALLOWED_LINE_TYPES.has(entry.primarySuggestedType.trim())
        ? entry.primarySuggestedType.trim()
        : null;

    const reasonCodes = Array.isArray(entry.reasonCodes)
      ? entry.reasonCodes
          .filter((item) => isNonEmptyString(item))
          .slice(0, MAX_REASONS)
      : [];
    const signalMessages = Array.isArray(entry.signalMessages)
      ? entry.signalMessages
          .filter((item) => isNonEmptyString(item))
          .slice(0, MAX_REASONS)
      : [];

    const contextLines = Array.isArray(entry.contextLines)
      ? entry.contextLines
          .filter((line) => isObjectRecord(line))
          .slice(0, MAX_CONTEXT_LINES)
          .map((line) => ({
            lineIndex: isIntegerNumber(line.lineIndex)
              ? line.lineIndex
              : undefined,
            text: normalizeIncomingText(line.text, 4000),
            assignedType:
              typeof line.assignedType === "string" &&
              ALLOWED_LINE_TYPES.has(line.assignedType.trim())
                ? line.assignedType.trim()
                : undefined,
            confidence:
              typeof line.confidence === "number" &&
              Number.isFinite(line.confidence)
                ? Math.max(0, Math.min(1, line.confidence))
                : undefined,
            offset:
              typeof line.offset === "number" && Number.isFinite(line.offset)
                ? line.offset
                : undefined,
          }))
      : [];

    const sourceHints = isObjectRecord(entry.sourceHints)
      ? {
          importSource: normalizeIncomingText(
            entry.sourceHints.importSource,
            64,
          ),
          sourceMethod: normalizeIncomingText(
            entry.sourceHints.sourceMethod,
            128,
          ),
          engineSuggestedType:
            typeof entry.sourceHints.engineSuggestedType === "string" &&
            ALLOWED_LINE_TYPES.has(entry.sourceHints.engineSuggestedType.trim())
              ? entry.sourceHints.engineSuggestedType.trim()
              : null,
        }
      : {
          importSource: "unknown",
          sourceMethod: "",
          engineSuggestedType: null,
        };

    return {
      itemId,
      lineIndex,
      text,
      assignedType,
      originalConfidence,
      suspicionScore,
      routingBand,
      critical: entry.critical === true,
      primarySuggestedType,
      reasonCodes,
      signalMessages,
      contextLines,
      sourceHints,
    };
  });

  return {
    apiVersion,
    importOpId,
    sessionId,
    totalReviewed: body.totalReviewed,
    reviewLines,
  };
};

const SYSTEM_PROMPT = `أنت طبقة شك سياقية في محرر سيناريو عربي.

مهمتك ليست التصحيح النهائي.
مهمتك هي مراجعة حالات الشك الحالية اعتمادًا على السطر نفسه وسياقه فقط.

أرجع JSON فقط بالشكل التالي:
{
  "reviewedLines": [
    {
      "itemId": "string",
      "verdict": "confirm | dismiss | escalate",
      "adjustedScore": 0,
      "routingBand": "local-review | agent-candidate | agent-forced",
      "confidence": 0,
      "reason": "سبب عربي قصير",
      "primarySuggestedType": "action"
    }
  ],
  "discoveredLines": [
    {
      "lineIndex": 0,
      "text": "النص كما ظهر في السياق",
      "assignedType": "action",
      "suspicionScore": 0,
      "routingBand": "agent-candidate | agent-forced",
      "confidence": 0,
      "reason": "سبب عربي قصير",
      "primarySuggestedType": "dialogue"
    }
  ]
}

القواعد:
- يجب أن تعيد بند reviewedLines واحدًا لكل itemId وارد في الإدخال.
- الإدخال قد يحتوي routingBand بقيمة local-review وهذا يعني حالة شك منخفضة وليست حالة مرفوضة.
- verdict = dismiss عندما ترى أن الحالة لا تستحق التصعيد.
- verdict = confirm عندما يبقى نفس مستوى التصعيد.
- verdict = escalate عندما يجب رفع الحالة.
- عند verdict = escalate لا تستخدم routingBand = local-review.
- discoveredLines مسموح فقط لأسطر ظهرت داخل contextLines المرسلة، وليس من خارجها.
- lineIndex و text في discoveredLines يجب أن يطابقا ما ورد في السياق حرفيًا.
- لا تُعد كتابة المستند، ولا تُرجع أوامر تصحيح نهائي.
- confidence بين 0 و 1.
- adjustedScore و suspicionScore بين 0 و 100.
- استخدم فقط أنواع السطور ونطاقات التصعيد المسموحة.`;

const buildMessages = (request) => [
  new SystemMessage(SYSTEM_PROMPT),
  new HumanMessage(
    JSON.stringify({
      totalReviewed: request.totalReviewed,
      reviewLines: request.reviewLines,
    }),
  ),
];

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

const normalizeReviewedLines = (parsed, request) => {
  const lines = Array.isArray(parsed?.reviewedLines)
    ? parsed.reviewedLines
    : [];
  const byItemId = new Map();
  for (const line of lines) {
    if (!isObjectRecord(line) || !isNonEmptyString(line.itemId)) continue;
    const itemId = line.itemId.trim();
    const input = request.reviewLines.find((entry) => entry.itemId === itemId);
    if (!input) continue;
    const verdict = normalizeIncomingText(line.verdict, 32).toLowerCase();
    if (!["confirm", "dismiss", "escalate"].includes(verdict)) continue;
    const routingBand = normalizeIncomingText(line.routingBand, 32);
    const candidateBand = ALLOWED_OUTPUT_BANDS.has(routingBand)
      ? routingBand
      : input.routingBand;
    const normalizedBand =
      verdict === "dismiss"
        ? "local-review"
        : verdict === "escalate"
          ? "agent-forced"
          : candidateBand;
    byItemId.set(itemId, {
      itemId,
      verdict,
      adjustedScore:
        typeof line.adjustedScore === "number" &&
        Number.isFinite(line.adjustedScore)
          ? Math.max(0, Math.min(100, line.adjustedScore))
          : input.suspicionScore,
      routingBand: normalizedBand,
      confidence:
        typeof line.confidence === "number" && Number.isFinite(line.confidence)
          ? Math.max(0, Math.min(1, line.confidence))
          : 0.5,
      reason: normalizeIncomingText(line.reason, 512) || "مراجعة سياقية",
      primarySuggestedType:
        typeof line.primarySuggestedType === "string" &&
        ALLOWED_LINE_TYPES.has(line.primarySuggestedType.trim())
          ? line.primarySuggestedType.trim()
          : input.primarySuggestedType,
    });
  }

  return request.reviewLines.map((input) => {
    const reviewed = byItemId.get(input.itemId);
    if (reviewed) return reviewed;
    return {
      itemId: input.itemId,
      verdict: "confirm",
      adjustedScore: input.suspicionScore,
      routingBand: input.routingBand,
      confidence: 0.5,
      reason: "لم يُحسم خلاف إضافي من الطبقة السياقية.",
      primarySuggestedType: input.primarySuggestedType,
    };
  });
};

const normalizeDiscoveredLines = (parsed, request) => {
  const lines = Array.isArray(parsed?.discoveredLines)
    ? parsed.discoveredLines
    : [];
  const allowedContextMap = new Map();

  for (const reviewLine of request.reviewLines) {
    for (const contextLine of reviewLine.contextLines) {
      if (!isIntegerNumber(contextLine.lineIndex) || !contextLine.text)
        continue;
      allowedContextMap.set(
        `${contextLine.lineIndex}:${contextLine.text}`,
        contextLine,
      );
    }
  }

  const discovered = [];
  for (const line of lines) {
    if (!isObjectRecord(line)) continue;
    if (!isIntegerNumber(line.lineIndex)) continue;
    const text = normalizeIncomingText(line.text, 4000);
    if (!text) continue;
    const allowed = allowedContextMap.get(`${line.lineIndex}:${text}`);
    if (!allowed) continue;
    const assignedType = normalizeIncomingText(line.assignedType, 64);
    if (!ALLOWED_LINE_TYPES.has(assignedType)) continue;
    const routingBand = normalizeIncomingText(line.routingBand, 32);
    if (!ALLOWED_DISCOVERED_BANDS.has(routingBand)) continue;
    discovered.push({
      lineIndex: line.lineIndex,
      text,
      assignedType,
      suspicionScore:
        typeof line.suspicionScore === "number" &&
        Number.isFinite(line.suspicionScore)
          ? Math.max(0, Math.min(100, line.suspicionScore))
          : 60,
      routingBand,
      confidence:
        typeof line.confidence === "number" && Number.isFinite(line.confidence)
          ? Math.max(0, Math.min(1, line.confidence))
          : 0.5,
      reason: normalizeIncomingText(line.reason, 512) || "حالة سياقية جديدة",
      primarySuggestedType:
        typeof line.primarySuggestedType === "string" &&
        ALLOWED_LINE_TYPES.has(line.primarySuggestedType.trim())
          ? line.primarySuggestedType.trim()
          : null,
    });
  }

  return discovered;
};

const resolveMockMode = () => {
  const raw = normalizeIncomingText(
    process.env.SUSPICION_REVIEW_MOCK_MODE ??
      process.env.AGENT_REVIEW_MOCK_MODE,
    32,
  ).toLowerCase();
  return raw === "success" || raw === "error" ? raw : null;
};

const buildMockResponse = (request, mode, startTime, model) => {
  if (mode === "error") {
    return {
      apiVersion: API_VERSION,
      mode: API_MODE,
      importOpId: request.importOpId,
      requestId: randomUUID(),
      status: "error",
      reviewedLines: [],
      discoveredLines: [],
      message: "SUSPICION_REVIEW_MOCK_MODE=error",
      latencyMs: Date.now() - startTime,
      model,
    };
  }

  return {
    apiVersion: API_VERSION,
    mode: API_MODE,
    importOpId: request.importOpId,
    requestId: randomUUID(),
    status: "applied",
    reviewedLines: request.reviewLines.map((line) => ({
      itemId: line.itemId,
      verdict: "confirm",
      adjustedScore: line.suspicionScore,
      routingBand: line.routingBand,
      confidence: 0.99,
      reason: "Mock: confirmed.",
      primarySuggestedType: line.primarySuggestedType,
    })),
    discoveredLines: [],
    message: "Mock success.",
    latencyMs: Date.now() - startTime,
    model,
  };
};

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
    const response = buildMockResponse(request, mockMode, startTime, modelId);
    return response;
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
