import { randomUUID } from "node:crypto";

import {
  API_MODE,
  API_VERSION,
} from "./suspicion-review.constants.mjs";
import { normalizeIncomingText } from "./suspicion-review.utils.mjs";

export const resolveMockMode = () => {
  const raw = normalizeIncomingText(
    process.env.SUSPICION_REVIEW_MOCK_MODE ??
      process.env.AGENT_REVIEW_MOCK_MODE,
    32
  ).toLowerCase();
  return raw === "success" || raw === "error" ? raw : null;
};

export const buildMockResponse = (request, mode, startTime, model) => {
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
