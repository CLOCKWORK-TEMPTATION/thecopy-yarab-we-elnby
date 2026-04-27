import {
  NUM_TYPES,
  VITERBI_TYPES,
  getRequiredItem,
  readNumericValue,
} from "./model";
import { TRANSITION_MATRIX } from "./transitions";

import type { ViterbiResult } from "./types";

export const viterbiDecode = (
  allEmissions: readonly Float64Array[]
): ViterbiResult[] => {
  const lineCount = allEmissions.length;
  if (lineCount === 0) {
    return [];
  }

  const typeCount = NUM_TYPES;
  const prob = new Float64Array(lineCount * typeCount);
  const prev = new Int32Array(lineCount * typeCount).fill(-1);

  const firstEmissions = getRequiredItem(allEmissions, 0, "emissions");
  for (let typeIndex = 0; typeIndex < typeCount; typeIndex++) {
    prob[typeIndex] = readNumericValue(firstEmissions, typeIndex);
  }

  for (let lineIndex = 1; lineIndex < lineCount; lineIndex++) {
    const currentOffset = lineIndex * typeCount;
    const prevOffset = (lineIndex - 1) * typeCount;
    const currentEmissions = getRequiredItem(allEmissions, lineIndex, "emissions");

    for (let currentType = 0; currentType < typeCount; currentType++) {
      let bestScore = -Infinity;
      let bestPrevType = 0;

      for (let prevType = 0; prevType < typeCount; prevType++) {
        const score =
          readNumericValue(prob, prevOffset + prevType) +
          readNumericValue(TRANSITION_MATRIX, prevType * typeCount + currentType) +
          readNumericValue(currentEmissions, currentType);
        if (score > bestScore) {
          bestScore = score;
          bestPrevType = prevType;
        }
      }

      prob[currentOffset + currentType] = bestScore;
      prev[currentOffset + currentType] = bestPrevType;
    }
  }

  const path = new Array<number>(lineCount);
  let bestFinalType = 0;
  let bestFinalScore = -Infinity;
  const lastOffset = (lineCount - 1) * typeCount;
  for (let typeIndex = 0; typeIndex < typeCount; typeIndex++) {
    const candidateScore = readNumericValue(prob, lastOffset + typeIndex);
    if (candidateScore > bestFinalScore) {
      bestFinalScore = candidateScore;
      bestFinalType = typeIndex;
    }
  }
  path[lineCount - 1] = bestFinalType;

  for (let lineIndex = lineCount - 2; lineIndex >= 0; lineIndex--) {
    const nextTypeIndex = readNumericValue(path, lineIndex + 1);
    path[lineIndex] = readNumericValue(prev, (lineIndex + 1) * typeCount + nextTypeIndex);
  }

  return path.map((typeIndex, lineIndex) => ({
    type: getRequiredItem(VITERBI_TYPES, typeIndex, "viterbi type"),
    score: readNumericValue(prob, lineIndex * typeCount + typeIndex),
  }));
};
