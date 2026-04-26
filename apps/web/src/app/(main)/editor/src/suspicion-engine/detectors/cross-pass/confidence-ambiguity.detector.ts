import { createSignal } from "@editor/suspicion-engine/helpers";

import type { DetectorFn } from "@editor/suspicion-engine/detectors/detector-interface";
import type { AlternativePullEvidence } from "@editor/suspicion-engine/types";

const LOW_CONFIDENCE_THRESHOLD = 0.72;
const CLOSE_DELTA_THRESHOLD = 0.12;

export const detectConfidenceAmbiguity: DetectorFn = (
  trace,
  line,
  _context
) => {
  const distinctVotes = trace.passVotes.filter(
    (vote) => vote.suggestedType !== line.type
  );
  if (distinctVotes.length === 0) {
    return [];
  }

  const strongestAlternative = distinctVotes.reduce((best, current) =>
    current.confidence > best.confidence ? current : best
  );

  const delta = Math.abs(
    trace.finalDecision.confidence - strongestAlternative.confidence
  );
  if (
    trace.finalDecision.confidence >= LOW_CONFIDENCE_THRESHOLD &&
    delta > CLOSE_DELTA_THRESHOLD
  ) {
    return [];
  }

  const score = Math.max(
    0.32,
    Math.min(
      0.7,
      0.4 +
        (LOW_CONFIDENCE_THRESHOLD -
          Math.min(trace.finalDecision.confidence, LOW_CONFIDENCE_THRESHOLD)) *
          0.35 +
        Math.max(0, CLOSE_DELTA_THRESHOLD - delta) * 0.9
    )
  );

  const evidence: AlternativePullEvidence = {
    signalType: "alternative-pull",
    suggestedType: strongestAlternative.suggestedType,
    pullStrength: score,
    contributingStages: [
      strongestAlternative.stage,
      trace.finalDecision.winningStage ?? "final-decision",
    ],
    keyPattern: "close-confidence-race",
  };

  return [
    createSignal<AlternativePullEvidence>({
      lineIndex: trace.lineIndex,
      family: "cross-pass",
      signalType: "alternative-pull",
      score,
      reasonCode: "LOW_CONFIDENCE_AMBIGUITY",
      message: `القرار المحلي غير حاسم: ${line.type} قريب جدًا من ${strongestAlternative.suggestedType}`,
      suggestedType: strongestAlternative.suggestedType,
      evidence,
      debug: {
        finalConfidence: trace.finalDecision.confidence,
        alternativeConfidence: strongestAlternative.confidence,
        delta,
      },
    }),
  ];
};
