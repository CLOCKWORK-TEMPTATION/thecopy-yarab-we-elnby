import { TYPE_INDEX, getRequiredItem, readNumericValue } from "./model";

import type { ClassifiedDraft } from "../classification-types";
import type {
  SequenceDisagreement,
  ViterbiResult,
} from "./types";

export const detectDisagreements = (
  drafts: readonly ClassifiedDraft[],
  viterbiResults: readonly ViterbiResult[],
  allEmissions: readonly Float64Array[]
): SequenceDisagreement[] => {
  const disagreements: SequenceDisagreement[] = [];

  for (let index = 0; index < drafts.length; index++) {
    const draft = getRequiredItem(drafts, index, "draft");
    const viterbiResult = getRequiredItem(viterbiResults, index, "viterbi result");
    const forwardType = draft.type;
    const viterbiType = viterbiResult.type;

    if (forwardType === viterbiType) {
      continue;
    }

    const forwardTypeIndex = TYPE_INDEX.get(forwardType) ?? 0;
    const viterbiTypeIndex = TYPE_INDEX.get(viterbiType) ?? 0;
    const emissions = getRequiredItem(allEmissions, index, "emissions");

    const emissionDiff =
      readNumericValue(emissions, viterbiTypeIndex) -
      readNumericValue(emissions, forwardTypeIndex);
    const confidenceFactor = Math.max(0, (85 - draft.confidence) * 0.5);
    const rawStrength = Math.max(0, emissionDiff * 8 + confidenceFactor + 40);
    const strength = Math.min(99, Math.round(rawStrength));

    disagreements.push({
      lineIndex: index,
      forwardType,
      forwardConfidence: draft.confidence,
      viterbiType,
      viterbiScore: viterbiResult.score,
      disagreementStrength: strength,
    });
  }

  return disagreements;
};
