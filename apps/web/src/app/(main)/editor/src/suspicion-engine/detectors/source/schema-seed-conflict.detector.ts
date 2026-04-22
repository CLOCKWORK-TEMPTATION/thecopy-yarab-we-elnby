import type { AlternativePullEvidence } from "@editor/suspicion-engine/types";
import type { DetectorFn } from "@editor/suspicion-engine/detectors/detector-interface";
import { createSignal } from "@editor/suspicion-engine/helpers";

const SCHEMA_SEED_STAGE = "schema-hint";

export const detectSchemaSeedConflict: DetectorFn = (trace, line, _context) => {
  const schemaVote = trace.passVotes.find(
    (vote) => vote.stage === SCHEMA_SEED_STAGE
  );
  if (!schemaVote) {
    return [];
  }

  if (schemaVote.suggestedType === line.type) {
    return [];
  }

  const finalConfidence = trace.finalDecision.confidence;
  const score = Math.max(
    0.35,
    Math.min(
      0.78,
      0.45 + schemaVote.confidence * 0.2 + (1 - finalConfidence) * 0.15
    )
  );

  const evidence: AlternativePullEvidence = {
    signalType: "alternative-pull",
    suggestedType: schemaVote.suggestedType,
    pullStrength: score,
    contributingStages: [SCHEMA_SEED_STAGE, "final-decision"],
    keyPattern: "schema-seed-conflict",
  };

  return [
    createSignal<AlternativePullEvidence>({
      lineIndex: trace.lineIndex,
      family: "source",
      signalType: "alternative-pull",
      score,
      reasonCode: "SCHEMA_SEED_CONFLICT",
      message: `بذرة الكرنك تقترح ${schemaVote.suggestedType} بينما القرار المحلي الحالي هو ${line.type}`,
      suggestedType: schemaVote.suggestedType,
      evidence,
      debug: {
        schemaType: schemaVote.suggestedType,
        finalType: line.type,
        finalConfidence,
      },
    }),
  ];
};
