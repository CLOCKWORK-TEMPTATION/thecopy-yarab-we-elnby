import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import {
  ALLOWED_DISCOVERED_BANDS,
  ALLOWED_LINE_TYPES,
  ALLOWED_OUTPUT_BANDS,
  SYSTEM_PROMPT,
} from "./suspicion-review.constants.mjs";
import {
  isIntegerNumber,
  isNonEmptyString,
  isObjectRecord,
  normalizeIncomingText,
} from "./suspicion-review.utils.mjs";

export const buildMessages = (request) => [
  new SystemMessage(SYSTEM_PROMPT),
  new HumanMessage(
    JSON.stringify({
      totalReviewed: request.totalReviewed,
      reviewLines: request.reviewLines,
    }),
  ),
];

export const parseResponseJson = (text) => {
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

export const normalizeReviewedLines = (parsed, request) => {
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

export const normalizeDiscoveredLines = (parsed, request) => {
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
