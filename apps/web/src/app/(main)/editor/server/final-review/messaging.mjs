// ─────────────────────────────────────────────────────────
// final-review/messaging.mjs — بناء الرسائل
// ─────────────────────────────────────────────────────────

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { buildSystemPrompt } from "./prompt.mjs";

export const buildFinalReviewMessages = (request) => {
  const systemPrompt = buildSystemPrompt(request.schemaHints);
  const userMessage = JSON.stringify({
    suspiciousLines: request.suspiciousLines.map((line) => ({
      itemId: line.itemId,
      lineIndex: line.lineIndex,
      text: line.text,
      assignedType: line.assignedType,
      suspicionScore: line.suspicionScore,
      routingBand: line.routingBand,
      critical: line.critical,
      primarySuggestedType: line.primarySuggestedType,
      reasonCodes: line.reasonCodes,
      signalMessages: line.signalMessages,
      evidence: line.evidence,
      contextLines: line.contextLines,
    })),
    requiredItemIds: request.requiredItemIds,
    forcedItemIds: request.forcedItemIds,
  });

  return [new SystemMessage(systemPrompt), new HumanMessage(userMessage)];
};
