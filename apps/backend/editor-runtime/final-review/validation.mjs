// ─────────────────────────────────────────────────────────
// final-review/validation.mjs — T016 التحقق من صحة جسم الطلب
// ─────────────────────────────────────────────────────────

import {
  MAX_PACKET_VERSION_LENGTH,
  MAX_SCHEMA_VERSION_LENGTH,
  MAX_SESSION_ID_LENGTH,
  MAX_IMPORT_OP_ID_LENGTH,
  MAX_REVIEW_PACKET_TEXT_LENGTH,
  MAX_ITEM_ID_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_FINGERPRINT_LENGTH,
  MAX_REASON_CODES,
  MAX_SIGNAL_MESSAGES,
  ALLOWED_LINE_TYPES,
  ALLOWED_ROUTING_BANDS,
} from "./constants.mjs";
import { DEFAULT_SCHEMA_HINTS } from "./schema-hints.mjs";
import {
  isObjectRecord,
  isNonEmptyString,
  isIntegerNumber,
  normalizeIncomingText,
} from "./utils.mjs";
import { FinalReviewValidationError } from "./errors.mjs";

export const validateFinalReviewRequestBody = (body) => {
  if (!isObjectRecord(body)) {
    throw new FinalReviewValidationError(
      "Invalid final-review request body: must be a JSON object."
    );
  }

  // packetVersion
  const packetVersion = normalizeIncomingText(
    body.packetVersion,
    MAX_PACKET_VERSION_LENGTH
  );
  if (!isNonEmptyString(packetVersion)) {
    throw new FinalReviewValidationError(
      "Missing or invalid packetVersion: must be a non-empty string (max 64 chars)."
    );
  }

  // schemaVersion
  const schemaVersion = normalizeIncomingText(
    body.schemaVersion,
    MAX_SCHEMA_VERSION_LENGTH
  );
  if (!isNonEmptyString(schemaVersion)) {
    throw new FinalReviewValidationError(
      "Missing or invalid schemaVersion: must be a non-empty string (max 64 chars)."
    );
  }

  // sessionId
  const sessionId = normalizeIncomingText(
    body.sessionId,
    MAX_SESSION_ID_LENGTH
  );
  if (!isNonEmptyString(sessionId)) {
    throw new FinalReviewValidationError(
      "Missing or invalid sessionId: must be a non-empty string (max 120 chars)."
    );
  }

  // importOpId
  const importOpId = normalizeIncomingText(
    body.importOpId,
    MAX_IMPORT_OP_ID_LENGTH
  );
  if (!isNonEmptyString(importOpId)) {
    throw new FinalReviewValidationError(
      "Missing or invalid importOpId: must be a non-empty string (max 120 chars)."
    );
  }

  // totalReviewed
  if (!isIntegerNumber(body.totalReviewed)) {
    throw new FinalReviewValidationError(
      "Invalid totalReviewed: must be a non-negative integer."
    );
  }
  const totalReviewed = body.totalReviewed;

  // suspiciousLines
  if (!Array.isArray(body.suspiciousLines)) {
    throw new FinalReviewValidationError(
      "Invalid suspiciousLines: must be an array."
    );
  }

  const seenItemIds = new Set();
  const suspiciousLines = body.suspiciousLines.map((entry, index) => {
    if (!isObjectRecord(entry)) {
      throw new FinalReviewValidationError(
        `Invalid suspicious line at index ${index}: must be an object.`
      );
    }

    // itemId
    const itemId = normalizeIncomingText(entry.itemId, MAX_ITEM_ID_LENGTH);
    if (!isNonEmptyString(itemId)) {
      throw new FinalReviewValidationError(
        `Invalid itemId at suspicious line ${index}: must be a non-empty string.`
      );
    }
    if (seenItemIds.has(itemId)) {
      throw new FinalReviewValidationError(
        `Duplicate itemId "${itemId}" at suspicious line ${index}.`
      );
    }
    seenItemIds.add(itemId);

    // suspicionScore
    const suspicionScore = entry.suspicionScore;
    if (
      typeof suspicionScore !== "number" ||
      !Number.isFinite(suspicionScore) ||
      suspicionScore < 0 ||
      suspicionScore > 100
    ) {
      throw new FinalReviewValidationError(
        `Invalid suspicionScore at suspicious line ${index} (itemId="${itemId}"): must be a number 0-100.`
      );
    }

    // assignedType
    const assignedType = normalizeIncomingText(entry.assignedType, 64);
    if (!ALLOWED_LINE_TYPES.has(assignedType)) {
      throw new FinalReviewValidationError(
        `Invalid assignedType "${assignedType}" at suspicious line ${index} (itemId="${itemId}").`
      );
    }

    // routingBand
    const routingBand = normalizeIncomingText(entry.routingBand, 32);
    if (!ALLOWED_ROUTING_BANDS.has(routingBand)) {
      throw new FinalReviewValidationError(
        `Invalid routingBand "${routingBand}" at suspicious line ${index} (itemId="${itemId}"): must be "agent-candidate" or "agent-forced".`
      );
    }

    // text
    const text = normalizeIncomingText(entry.text, MAX_TEXT_LENGTH);
    if (!isNonEmptyString(text)) {
      throw new FinalReviewValidationError(
        `Empty text at suspicious line ${index} (itemId="${itemId}").`
      );
    }

    // fingerprint (optional)
    const fingerprint =
      normalizeIncomingText(entry.fingerprint, MAX_FINGERPRINT_LENGTH) ||
      undefined;

    // lineIndex (optional)
    const lineIndex =
      typeof entry.lineIndex === "number" && isIntegerNumber(entry.lineIndex)
        ? entry.lineIndex
        : undefined;

    // critical (optional boolean)
    const critical =
      typeof entry.critical === "boolean" ? entry.critical : undefined;

    // primarySuggestedType (optional)
    const primarySuggestedType =
      typeof entry.primarySuggestedType === "string" &&
      ALLOWED_LINE_TYPES.has(entry.primarySuggestedType.trim())
        ? entry.primarySuggestedType.trim()
        : undefined;

    // reasonCodes (optional array of strings, max MAX_REASON_CODES)
    const reasonCodes = Array.isArray(entry.reasonCodes)
      ? entry.reasonCodes
          .filter((r) => isNonEmptyString(r))
          .slice(0, MAX_REASON_CODES)
      : undefined;

    // signalMessages (optional array of strings, max MAX_SIGNAL_MESSAGES)
    const signalMessages = Array.isArray(entry.signalMessages)
      ? entry.signalMessages
          .filter((m) => isNonEmptyString(m))
          .slice(0, MAX_SIGNAL_MESSAGES)
      : undefined;

    // evidence (optional)
    const evidence = isObjectRecord(entry.evidence)
      ? entry.evidence
      : undefined;

    // contextLines (optional array)
    const contextLines = Array.isArray(entry.contextLines)
      ? entry.contextLines
          .filter((cl) => isObjectRecord(cl))
          .map((cl) => ({
            lineIndex:
              typeof cl.lineIndex === "number" && isIntegerNumber(cl.lineIndex)
                ? cl.lineIndex
                : undefined,
            assignedType:
              typeof cl.assignedType === "string" &&
              ALLOWED_LINE_TYPES.has(cl.assignedType.trim())
                ? cl.assignedType.trim()
                : undefined,
            text: normalizeIncomingText(cl.text, 4000) || undefined,
          }))
      : undefined;

    return {
      itemId,
      suspicionScore,
      assignedType,
      routingBand,
      text,
      fingerprint,
      lineIndex,
      critical,
      primarySuggestedType,
      reasonCodes,
      signalMessages,
      evidence,
      contextLines,
    };
  });

  // requiredItemIds — default to all suspicious line itemIds
  let requiredItemIds;
  if (Array.isArray(body.requiredItemIds)) {
    requiredItemIds = [];
    for (let i = 0; i < body.requiredItemIds.length; i++) {
      const id = body.requiredItemIds[i];
      if (!isNonEmptyString(id)) {
        throw new FinalReviewValidationError(
          `Invalid requiredItemIds entry at index ${i}: must be a non-empty string.`
        );
      }
      requiredItemIds.push(id);
    }
    requiredItemIds = [...new Set(requiredItemIds)];
  } else {
    requiredItemIds = suspiciousLines.map((l) => l.itemId);
  }

  // forcedItemIds — default to itemIds with routingBand "agent-forced"
  let forcedItemIds;
  if (Array.isArray(body.forcedItemIds)) {
    forcedItemIds = [];
    for (let i = 0; i < body.forcedItemIds.length; i++) {
      const id = body.forcedItemIds[i];
      if (!isNonEmptyString(id)) {
        throw new FinalReviewValidationError(
          `Invalid forcedItemIds entry at index ${i}: must be a non-empty string.`
        );
      }
      forcedItemIds.push(id);
    }
    forcedItemIds = [...new Set(forcedItemIds)];
  } else {
    forcedItemIds = [
      ...new Set(
        suspiciousLines
          .filter((l) => l.routingBand === "agent-forced")
          .map((l) => l.itemId)
      ),
    ];
  }

  // Verify forcedItemIds ⊆ requiredItemIds
  const requiredSet = new Set(requiredItemIds);
  for (const id of forcedItemIds) {
    if (!requiredSet.has(id)) {
      throw new FinalReviewValidationError(
        `forcedItemIds must be a subset of requiredItemIds: "${id}" is not in requiredItemIds.`
      );
    }
  }

  // Verify all requiredItemIds exist in suspiciousLines
  for (const id of requiredItemIds) {
    if (!seenItemIds.has(id)) {
      throw new FinalReviewValidationError(
        `requiredItemIds contains unknown itemId: "${id}" not found in suspiciousLines.`
      );
    }
  }

  // schemaHints — fall back to DEFAULT_SCHEMA_HINTS if invalid
  let schemaHints = DEFAULT_SCHEMA_HINTS;
  if (isObjectRecord(body.schemaHints)) {
    const hints = body.schemaHints;
    const allowedLineTypes =
      Array.isArray(hints.allowedLineTypes) &&
      hints.allowedLineTypes.every((t) => typeof t === "string")
        ? hints.allowedLineTypes.filter((t) => t.trim().length > 0)
        : DEFAULT_SCHEMA_HINTS.allowedLineTypes;

    const lineTypeDescriptions = isObjectRecord(hints.lineTypeDescriptions)
      ? hints.lineTypeDescriptions
      : DEFAULT_SCHEMA_HINTS.lineTypeDescriptions;

    const gateRules =
      Array.isArray(hints.gateRules) &&
      hints.gateRules.every((r) => isObjectRecord(r))
        ? hints.gateRules
        : DEFAULT_SCHEMA_HINTS.gateRules;

    schemaHints = { allowedLineTypes, lineTypeDescriptions, gateRules };
  }

  // reviewPacketText (optional)
  const reviewPacketText =
    normalizeIncomingText(
      body.reviewPacketText,
      MAX_REVIEW_PACKET_TEXT_LENGTH
    ) || undefined;

  return {
    packetVersion,
    schemaVersion,
    sessionId,
    importOpId,
    totalReviewed,
    suspiciousLines,
    requiredItemIds,
    forcedItemIds,
    schemaHints,
    reviewPacketText,
  };
};
