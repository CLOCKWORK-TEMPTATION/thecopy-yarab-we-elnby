/**
 * @module extensions/structural-sequence-optimizer
 * @description
 * مُحسِّن التسلسل الهيكلي — طبقة Viterbi تعمل فوق الـ forward pass.
 */
import { logger } from "../utils/logger";

import { pipelineRecorder } from "./pipeline-recorder";
import { detectDisagreements } from "./structural-sequence-optimizer/disagreements";
import {
  addForwardPassBias,
  computeEmissionScores,
} from "./structural-sequence-optimizer/emissions";
import { extractSequenceFeatures } from "./structural-sequence-optimizer/feature-extraction";
import { getRequiredItem } from "./structural-sequence-optimizer/model";
import { applyViterbiOverrides as applyViterbiOverridesInternal } from "./structural-sequence-optimizer/overrides";
import { viterbiDecode } from "./structural-sequence-optimizer/viterbi";

import type { ClassifiedDraft } from "./classification-types";
import type { SequenceOptimizationResult } from "./structural-sequence-optimizer/types";

export type {
  SequenceDisagreement,
  SequenceFeatures,
  SequenceOptimizationResult,
  ViterbiResult,
} from "./structural-sequence-optimizer/types";
export { extractSequenceFeatures } from "./structural-sequence-optimizer/feature-extraction";

const optimizerLogger = logger.createScope("sequence-optimizer");

export const optimizeSequence = (
  drafts: readonly ClassifiedDraft[],
  preSeeded: ReadonlySet<string> = new Set()
): SequenceOptimizationResult => {
  pipelineRecorder.trackFile("structural-sequence-optimizer.ts");

  if (drafts.length === 0) {
    return {
      viterbiSequence: [],
      disagreements: [],
      totalDisagreements: 0,
      disagreementRate: 0,
    };
  }

  const features = extractSequenceFeatures(drafts, preSeeded);
  const allEmissions = features.map((feature, index) => {
    const emissions = computeEmissionScores(feature);
    const draft = getRequiredItem(drafts, index, "draft");
    addForwardPassBias(emissions, draft.type, draft.confidence);
    return emissions;
  });

  const viterbiSequence = viterbiDecode(allEmissions);
  const disagreements = detectDisagreements(drafts, viterbiSequence, allEmissions);

  const result: SequenceOptimizationResult = {
    viterbiSequence,
    disagreements,
    totalDisagreements: disagreements.length,
    disagreementRate: drafts.length > 0 ? disagreements.length / drafts.length : 0,
  };

  if (disagreements.length > 0) {
    optimizerLogger.info("viterbi-optimization-complete", {
      totalLines: drafts.length,
      totalDisagreements: disagreements.length,
      disagreementRate: result.disagreementRate.toFixed(3),
      topDisagreements: disagreements
        .slice()
        .sort((left, right) => right.disagreementStrength - left.disagreementStrength)
        .slice(0, 5)
        .map((entry) => ({
          line: entry.lineIndex,
          forward: entry.forwardType,
          viterbi: entry.viterbiType,
          strength: entry.disagreementStrength,
        })),
    });
  }

  return result;
};

export const applyViterbiOverrides = (
  classified: ClassifiedDraft[],
  optimizationResult: SequenceOptimizationResult
): number => {
  const applied = applyViterbiOverridesInternal(classified, optimizationResult);
  if (applied > 0) {
    optimizerLogger.info("viterbi-overrides-applied", {
      applied,
      maxAllowed: Math.max(1, Math.ceil(classified.length * 0.15)),
      totalDisagreements: optimizationResult.disagreements.length,
    });
  }
  return applied;
};
