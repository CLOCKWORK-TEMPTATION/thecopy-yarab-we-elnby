import { CLASSIFICATION_VALID_SEQUENCES } from "../classification-sequence-rules";

import { getRequiredItem } from "./model";

import type { ClassifiedDraft } from "../classification-types";
import type { SequenceOptimizationResult } from "./types";

const OVERRIDE_MIN_STRENGTH = 70;
const OVERRIDE_MAX_FORWARD_CONFIDENCE = 82;
const OVERRIDE_MAX_RATIO = 0.15;

export const applyViterbiOverrides = (
  classified: ClassifiedDraft[],
  optimizationResult: SequenceOptimizationResult
): number => {
  const { disagreements } = optimizationResult;
  if (disagreements.length === 0) {
    return 0;
  }

  const maxOverrides = Math.max(1, Math.ceil(classified.length * OVERRIDE_MAX_RATIO));
  const sortedDisagreements = [...disagreements].sort(
    (left, right) => right.disagreementStrength - left.disagreementStrength
  );

  let applied = 0;
  for (const disagreement of sortedDisagreements) {
    if (applied >= maxOverrides) break;
    if (disagreement.disagreementStrength < OVERRIDE_MIN_STRENGTH) break;
    if (disagreement.forwardConfidence > OVERRIDE_MAX_FORWARD_CONFIDENCE) continue;

    const draft = getRequiredItem(classified, disagreement.lineIndex, "classified draft");
    if (draft.classificationMethod === "regex" && draft.confidence >= 90) {
      continue;
    }

    const prevType =
      disagreement.lineIndex > 0
        ? getRequiredItem(
            classified,
            disagreement.lineIndex - 1,
            "previous classified draft"
          ).type
        : null;
    const nextType =
      disagreement.lineIndex + 1 < classified.length
        ? getRequiredItem(
            classified,
            disagreement.lineIndex + 1,
            "next classified draft"
          ).type
        : null;

    let sequenceValid = true;
    if (prevType) {
      const validFromPrev = CLASSIFICATION_VALID_SEQUENCES.get(prevType);
      if (validFromPrev && !validFromPrev.has(disagreement.viterbiType)) {
        sequenceValid = false;
      }
    }
    if (nextType && sequenceValid) {
      const validFromNew = CLASSIFICATION_VALID_SEQUENCES.get(disagreement.viterbiType);
      if (validFromNew && !validFromNew.has(nextType)) {
        sequenceValid = false;
      }
    }

    if (!sequenceValid) {
      continue;
    }

    classified[disagreement.lineIndex] = {
      ...draft,
      type: disagreement.viterbiType,
      confidence: Math.max(draft.confidence, 83),
      classificationMethod: "context",
    };
    applied++;
  }

  return applied;
};
