import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const MAX_TEXT_LENGTH = 6_000;

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

export const AGENT_REVIEW_SYSTEM_PROMPT = `
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

export const normalizeIncomingText = (value, maxLength = 50_000) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
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

export const buildAgentReviewPayload = (request) => ({
  totalReviewed: request.totalReviewed,
  requiredItemIds: request.requiredItemIds,
  forcedItemIds: request.forcedItemIds,
  suspiciousLines: request.suspiciousLines,
  reviewPacketText: request.reviewPacketText,
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

export const normalizeCommandsAgainstRequest = (commands, request) => {
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

export const determineCoverage = (commands, request, options = {}) => {
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

export const buildMeta = (coverage, extras = {}) => ({
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

export const computeMaxTokens = (
  request,
  { baseOutputTokens, tokensPerSuspiciousLine, maxTokensCeiling },
  boostFactor = 1
) =>
  Math.min(
    maxTokensCeiling,
    Math.max(
      baseOutputTokens,
      Math.ceil(
        (baseOutputTokens +
          request.suspiciousLines.length * tokensPerSuspiciousLine) *
          boostFactor
      )
    )
  );

export const buildAgentReviewMessages = (request) => [
  new SystemMessage(AGENT_REVIEW_SYSTEM_PROMPT),
  new HumanMessage(JSON.stringify(buildAgentReviewPayload(request))),
];
