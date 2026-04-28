import {
  getDefault3DMap,
  getDefaultArtisticReferences,
  getDefaultDynamicTone,
  getDefaultGenreMatrix,
  getDefaultThemeAnalysis,
} from "./defaults";

import type { Station2Output, ThemeAnalysis, ThreeDMapResult } from "./types";

export function calculateConfidenceScore(
  storyStatements: string[],
  threeDMap: ThreeDMapResult,
  themeAnalysis: ThemeAnalysis
): number {
  // Calculate confidence based on the quality and completeness of outputs
  let score = 0.5; // Base score

  // Story statements contribution
  if (storyStatements.length >= 3) {
    score += 0.15;
  } else if (storyStatements.length >= 2) {
    score += 0.1;
  } else if (storyStatements.length >= 1) {
    score += 0.05;
  }

  // 3D Map contribution
  const hasValidEvents = threeDMap.horizontalEventsAxis.length > 0;
  const hasValidMeaning = threeDMap.verticalMeaningAxis.length > 0;
  const hasValidTemporal =
    threeDMap.temporalDevelopmentAxis.pastInfluence.length > 0;

  if (hasValidEvents && hasValidMeaning && hasValidTemporal) {
    score += 0.2;
  } else if (hasValidEvents || hasValidMeaning || hasValidTemporal) {
    score += 0.1;
  }

  // Theme analysis contribution
  const hasPrimaryThemes = themeAnalysis.primaryThemes.length > 0;
  const hasSecondaryThemes = themeAnalysis.secondaryThemes.length > 0;
  const hasConsistencyScore = themeAnalysis.thematicConsistency > 0;

  if (hasPrimaryThemes && hasSecondaryThemes && hasConsistencyScore) {
    score += 0.15;
  } else if (hasPrimaryThemes || hasSecondaryThemes) {
    score += 0.1;
  }

  return Math.min(score, 1.0);
}

export function getErrorFallback(): Station2Output {
  return {
    storyStatement: "فشل في تحليل المفهوم",
    alternativeStatements: [],
    threeDMap: getDefault3DMap(),
    elevatorPitch: "فشل في توليد العرض المختصر",
    hybridGenre: "دراما عامة",
    genreAlternatives: [],
    genreContributionMatrix: getDefaultGenreMatrix("دراما عامة"),
    dynamicTone: getDefaultDynamicTone({
      majorCharacters: [],
      relationshipSummary: "",
      narrativeTone: "",
      fullText: "",
      logline: "",
      conflictSummary: "",
      dialogueQuality: 5,
    }),
    artisticReferences: getDefaultArtisticReferences("دراما عامة"),
    themeAnalysis: getDefaultThemeAnalysis(),
    targetAudience: {
      primaryAudience: "جمهور عام",
      demographics: ["بالغون"],
      psychographics: ["مهتمو الدراما"],
    },
    marketAnalysis: {
      producibility: 5,
      commercialPotential: 5,
      uniqueness: 5,
    },
    metadata: {
      analysisTimestamp: new Date(),
      status: "Failed",
      processingTime: 0,
      confidenceScore: 0.1,
    },
  };
}
