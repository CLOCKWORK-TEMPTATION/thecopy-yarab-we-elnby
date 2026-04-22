import type { ContextContradictionEvidence } from "@editor/suspicion-engine/types";
import type { DetectorFn } from "@editor/suspicion-engine/detectors/detector-interface";
import { createSignal } from "@editor/suspicion-engine/helpers";

export const detectOrphanDialogue: DetectorFn = (trace, line, context) => {
  if (line.type !== "dialogue") {
    return [];
  }

  const { distanceFromLastCharacter } = context.features.context;

  if (distanceFromLastCharacter <= 3) {
    return [];
  }

  const score = 0.5 + Math.min(0.3, distanceFromLastCharacter * 0.05);

  const evidence: ContextContradictionEvidence = {
    signalType: "context-contradiction",
    contradictionType: "orphan-dialogue",
    expectedPrecedingType: "character",
    actualPrecedingType: context.features.context.previousType,
    windowSize: distanceFromLastCharacter,
  };

  return [
    createSignal<ContextContradictionEvidence>({
      lineIndex: trace.lineIndex,
      family: "context",
      signalType: "context-contradiction",
      score,
      reasonCode: "orphan-dialogue",
      message: `حوار بلا شخصية سابقة: المسافة عن آخر شخصية هي ${distanceFromLastCharacter} سطر`,
      suggestedType: null,
      evidence,
      debug: {
        distanceFromLastCharacter,
        score,
      },
    }),
  ];
};
