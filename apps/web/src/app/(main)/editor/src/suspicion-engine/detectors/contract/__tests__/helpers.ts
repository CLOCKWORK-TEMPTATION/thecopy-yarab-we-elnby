import type { ClassifiedDraft } from "@editor/extensions/classification-types";
import type { DetectorContext } from "@editor/suspicion-engine/detectors/detector-interface";
import type {
  ClassificationTrace,
  SuspicionFeature,
} from "@editor/suspicion-engine/types";

export function makeTrace(
  lineIndex: number,
  text: string
): ClassificationTrace {
  return {
    lineIndex,
    rawText: text,
    normalizedText: text,
    sourceHints: {
      importSource: "paste",
      lineQuality: {
        score: 0.9,
        arabicRatio: 0.95,
        weirdCharRatio: 0.01,
        hasStructuralMarkers: false,
      },
      pageNumber: null,
    },
    repairs: [],
    passVotes: [],
    finalDecision: {
      assignedType: "action",
      confidence: 0.8,
      method: "weighted",
      winningStage: null,
    },
  };
}

export function makeDraft(
  type: ClassifiedDraft["type"],
  text: string
): ClassifiedDraft {
  return {
    type,
    text,
    confidence: 80,
    classificationMethod: "context",
  };
}

export function makeFeatures(overrides: {
  endsWithColon?: boolean;
  lineLength?: number;
  matchesCharacterPattern?: boolean;
}): SuspicionFeature {
  return {
    lineIndex: 0,
    gate: {
      hasColon: overrides.endsWithColon ?? false,
      lineLength: overrides.lineLength ?? 10,
      startsWithUpperArabic: true,
      endsWithColon: overrides.endsWithColon ?? false,
      matchesCharacterPattern: overrides.matchesCharacterPattern ?? false,
      matchesTransitionPattern: false,
      matchesSceneHeaderPattern: false,
    },
    context: {
      previousType: null,
      nextType: null,
      dialogueBlockDepth: 0,
      distanceFromLastCharacter: 99,
      distanceFromLastSceneHeader: 99,
    },
    rawQuality: {
      arabicRatio: 0.95,
      weirdCharRatio: 0.01,
      qualityScore: 0.9,
      lineLength: overrides.lineLength ?? 10,
      hasEncodingIssues: false,
    },
    crossPass: {
      totalVotes: 0,
      distinctTypes: 0,
      agreementRatio: 1,
      highestConflictSeverity: "none",
      dominantType: null,
      minorityType: null,
    },
    competition: {
      strongestAlternativeType: null,
      pullStrength: 0,
      confidenceDelta: 0,
      contributingStageCount: 0,
    },
    stability: {
      decisionFragility: 0,
      repairCount: 0,
      wasOverridden: false,
      finalConfidence: 0.8,
    },
  };
}

export function makeContext(
  neighbors: readonly ClassifiedDraft[],
  neighborTraces: readonly ClassificationTrace[],
  features: SuspicionFeature
): DetectorContext {
  return {
    lineIndex: 0,
    totalLines: neighbors.length + 1,
    neighbors,
    neighborTraces,
    features,
  };
}
