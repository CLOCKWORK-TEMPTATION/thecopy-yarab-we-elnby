// ─────────────────────────────────────────────────────────
// final-review/mock.mjs — T011 وضع المحاكاة والبناء
// ─────────────────────────────────────────────────────────

import { randomUUID } from "crypto";
import {
  API_VERSION,
  API_MODE,
  BASE_OUTPUT_TOKENS,
  TOKENS_PER_SUSPICIOUS_LINE,
  MAX_TOKENS_CEILING,
} from "./constants.mjs";
import { normalizeIncomingText } from "./utils.mjs";
import { determineCoverageStatus } from "./coverage.mjs";

export const resolveFinalReviewMockMode = () => {
  const value = normalizeIncomingText(
    process.env.FINAL_REVIEW_MOCK_MODE,
    32
  ).toLowerCase();
  if (value === "success" || value === "error") return value;
  return null;
};

export const buildFinalReviewMeta = ({
  coverage,
  inputTokens = null,
  outputTokens = null,
  retryCount = 0,
  isMockResponse = false,
}) => ({
  totalInputTokens: inputTokens,
  totalOutputTokens: outputTokens,
  retryCount,
  resolvedItemIds: coverage.resolvedItemIds,
  missingItemIds: coverage.missingItemIds,
  isMockResponse,
});

export const computeFinalReviewMaxTokens = (request, boostFactor = 1) =>
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

export const buildFinalReviewMockResponse = (
  request,
  mockMode,
  startTime,
  modelId
) => {
  const requestId = randomUUID();

  if (mockMode === "error") {
    const coverage = determineCoverageStatus([], request);
    return {
      apiVersion: API_VERSION,
      mode: API_MODE,
      importOpId: request.importOpId,
      requestId,
      status: coverage.status,
      commands: [],
      message: "FINAL_REVIEW_MOCK_MODE=error",
      latencyMs: Date.now() - startTime,
      model: modelId,
      meta: buildFinalReviewMeta({
        coverage,
        isMockResponse: true,
      }),
    };
  }

  const commands = request.requiredItemIds.map((itemId) => {
    const line = request.suspiciousLines.find(
      (entry) => entry.itemId === itemId
    );
    return {
      op: "relabel",
      itemId,
      newType: line?.assignedType ?? "action",
      confidence: 0.99,
      reason: "Mock: confirmed by mock mode.",
    };
  });
  const coverage = determineCoverageStatus(commands, request);

  return {
    apiVersion: API_VERSION,
    mode: API_MODE,
    importOpId: request.importOpId,
    requestId,
    status: coverage.status,
    commands,
    message: `Mock success: ${commands.length} commands generated.`,
    latencyMs: Date.now() - startTime,
    model: modelId,
    meta: buildFinalReviewMeta({
      coverage,
      isMockResponse: true,
    }),
  };
};
