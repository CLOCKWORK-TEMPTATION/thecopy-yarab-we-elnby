/**
 * @module extensions/paste-classifier/final-review/payload-builders
 *
 * بناة Payloads الخاصة بمراجعة الاشتباه + المراجعة النهائية:
 * - buildSuspicionReviewContextLines: نافذة سياق ±3 أسطر حول السطر الهدف.
 * - buildLocalSuspicionReviewPayload: payload محلي للسطر المشتبه به.
 * - buildDiscoveredFinalReviewPayload: payload لسطر اكتشفه النموذج.
 * - mergeSuspicionReason: دمج سبب اشتباه مُراجَع داخل payload نهائي.
 * - mergeSuspicionReviewCandidates: دمج candidates محلية مع استجابة النموذج.
 */

import type {
  ImportSource,
  SuspicionCase,
} from "@editor/suspicion-engine/types";
import type { FinalReviewSuspiciousLinePayload } from "@editor/types/final-review";
import type {
  SuspicionReviewContextLine,
  SuspicionReviewDiscoveredLine,
  SuspicionReviewLinePayload,
  SuspicionReviewResponsePayload,
  SuspicionReviewReviewedLine,
} from "@editor/types/suspicion-review";

import { buildContextLines } from "@editor/final-review/payload-builder";

import { REVIEWABLE_AGENT_TYPES } from "../../paste-classifier-config";
import type { ClassifiedDraftWithId } from "../../paste-classifier-helpers";
import { shouldKeepSuspicionModelDecisionForFinalReview } from "../../suspicion-review-routing";

import { simpleHash } from "../utils/hash";
import { computeLineQuality } from "../utils/line-quality";

/**
 * بناء سطور سياق ±3 أسطر حول lineIndex المستهدف (تُستثنى offset=0).
 */
export const buildSuspicionReviewContextLines = (
  targetIndex: number,
  classified: readonly ClassifiedDraftWithId[]
): SuspicionReviewContextLine[] => {
  const result: SuspicionReviewContextLine[] = [];

  for (let offset = -3; offset <= 3; offset += 1) {
    if (offset === 0) continue;
    const lineIndex = targetIndex + offset;
    if (lineIndex < 0 || lineIndex >= classified.length) continue;
    const line = classified[lineIndex];
    if (!line) continue;
    result.push({
      lineIndex,
      text: line.text,
      assignedType: line.type,
      confidence: line.confidence,
      offset,
    });
  }

  return result;
};

/**
 * بناء payload للمراجعة المحلية لسطر مشتبه به.
 */
export const buildLocalSuspicionReviewPayload = (params: {
  suspicionCase: SuspicionCase;
  classified: readonly ClassifiedDraftWithId[];
  itemId: string;
  sourceMethod?: string;
}): SuspicionReviewLinePayload | null => {
  const { suspicionCase, classified, itemId, sourceMethod } = params;
  const assignedType = suspicionCase.classifiedLine.type;

  const schemaVote = suspicionCase.trace.passVotes.find(
    (vote) => vote.stage === "schema-hint"
  );

  return {
    itemId,
    lineIndex: suspicionCase.lineIndex,
    text: suspicionCase.classifiedLine.text,
    assignedType,
    originalConfidence: suspicionCase.classifiedLine.confidence,
    suspicionScore: suspicionCase.score,
    routingBand:
      suspicionCase.band === "agent-forced"
        ? "agent-forced"
        : suspicionCase.band === "local-review"
          ? "local-review"
          : "agent-candidate",
    critical: suspicionCase.critical,
    primarySuggestedType: suspicionCase.primarySuggestedType ?? null,
    reasonCodes: suspicionCase.signals
      .map((signal) => signal.reasonCode)
      .slice(0, 32),
    signalMessages: suspicionCase.signals
      .map((signal) => signal.message)
      .slice(0, 32),
    contextLines: buildSuspicionReviewContextLines(
      suspicionCase.lineIndex,
      classified
    ),
    sourceHints: {
      importSource: suspicionCase.trace.sourceHints.importSource,
      ...(sourceMethod !== undefined && { sourceMethod }),
      engineSuggestedType: schemaVote?.suggestedType ?? null,
    },
  };
};

/**
 * بناء payload للمراجعة النهائية لسطر اكتشفه نموذج الاشتباه.
 */
export const buildDiscoveredFinalReviewPayload = (params: {
  discovered: SuspicionReviewDiscoveredLine;
  classified: readonly ClassifiedDraftWithId[];
  importSource: ImportSource;
}): FinalReviewSuspiciousLinePayload | null => {
  const { discovered, classified, importSource } = params;
  const target = classified[discovered.lineIndex];
  if (!target) return null;
  if (!REVIEWABLE_AGENT_TYPES.has(discovered.assignedType)) return null;

  const lineQuality = computeLineQuality(target.text);

  return {
    itemId: `model-discovered-${discovered.lineIndex}-${simpleHash(discovered.text)}`,
    lineIndex: discovered.lineIndex,
    text: discovered.text,
    assignedType: discovered.assignedType,
    fingerprint: `${discovered.lineIndex}:${simpleHash(discovered.text)}`,
    suspicionScore: discovered.suspicionScore,
    routingBand: discovered.routingBand,
    critical: discovered.routingBand === "agent-forced",
    primarySuggestedType: discovered.primarySuggestedType ?? null,
    distinctSignalFamilies: 1,
    signalCount: 1,
    reasonCodes: ["MODEL_CONTEXT_DISCOVERY"],
    signalMessages: [discovered.reason],
    sourceHints: {
      importSource,
      lineQualityScore: lineQuality.score,
      arabicRatio: lineQuality.arabicRatio,
      weirdCharRatio: lineQuality.weirdCharRatio,
      hasStructuralMarkers: lineQuality.hasStructuralMarkers,
      pageNumber: null,
    },
    evidence: {
      gateBreaks: [],
      alternativePulls: [],
      contextContradictions: [],
      rawCorruptionSignals: [],
      multiPassConflicts: [],
      sourceRisks: [],
    },
    trace: {
      passVotes: [],
      repairs: [],
      finalDecision: {
        assignedType: discovered.assignedType,
        confidence: target.confidence,
        method: "weighted",
      },
    },
    contextLines: buildContextLines(discovered.lineIndex, classified),
  };
};

/**
 * دمج معلومات مراجعة الاشتباه داخل payload نهائي قائم.
 */
export const mergeSuspicionReason = (
  payload: FinalReviewSuspiciousLinePayload,
  review: SuspicionReviewReviewedLine
): FinalReviewSuspiciousLinePayload => ({
  ...payload,
  suspicionScore: Math.max(0, Math.min(100, review.adjustedScore)),
  routingBand:
    review.routingBand === "agent-forced" ? "agent-forced" : "agent-candidate",
  primarySuggestedType:
    review.primarySuggestedType === undefined
      ? payload.primarySuggestedType
      : review.primarySuggestedType,
  reasonCodes: [
    ...new Set([...payload.reasonCodes, "MODEL_CONTEXT_REVIEW"]),
  ].slice(0, 32),
  signalMessages: [
    ...new Set([...payload.signalMessages, review.reason]),
  ].slice(0, 32),
});

/**
 * دمج candidates محلية مع استجابة نموذج الاشتباه:
 * - يحذف ما يجب رفضه (verdict=dismiss).
 * - يدمج reason للمتبقّيين.
 * - يضيف discovered lines الجديدة.
 * - يرتّب النتيجة على lineIndex ثم suspicionScore تنازلياً.
 */
export const mergeSuspicionReviewCandidates = (params: {
  localCandidates: readonly FinalReviewSuspiciousLinePayload[];
  response: SuspicionReviewResponsePayload;
  classified: readonly ClassifiedDraftWithId[];
  importSource: ImportSource;
}): FinalReviewSuspiciousLinePayload[] => {
  const { localCandidates, response, classified, importSource } = params;
  const merged = new Map(
    localCandidates.map((candidate) => [candidate.itemId, candidate])
  );

  for (const reviewed of response.reviewedLines) {
    const current = merged.get(reviewed.itemId);
    if (!current) continue;
    if (!shouldKeepSuspicionModelDecisionForFinalReview(reviewed)) {
      merged.delete(reviewed.itemId);
      continue;
    }
    merged.set(reviewed.itemId, mergeSuspicionReason(current, reviewed));
  }

  for (const discovered of response.discoveredLines) {
    const payload = buildDiscoveredFinalReviewPayload({
      discovered,
      classified,
      importSource,
    });
    if (!payload || merged.has(payload.itemId)) continue;
    merged.set(payload.itemId, payload);
  }

  return [...merged.values()].sort(
    (a, b) => a.lineIndex - b.lineIndex || b.suspicionScore - a.suspicionScore
  );
};
