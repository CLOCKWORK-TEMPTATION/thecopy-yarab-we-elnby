import {
  ALLOWED_INPUT_BANDS,
  ALLOWED_LINE_TYPES,
  MAX_CONTEXT_LINES,
  MAX_REASONS,
  MAX_TEXT_LENGTH,
} from "./suspicion-review.constants.mjs";
import {
  isIntegerNumber,
  isNonEmptyString,
  isObjectRecord,
  normalizeIncomingText,
} from "./suspicion-review.utils.mjs";

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
