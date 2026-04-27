import type {
  LiteraryQualityAssessment,
  ProducibilityAnalysis,
  RecommendationBuckets,
  RhythmAnalysis,
  Station4Output,
} from "./types";

export const defaultLiteraryQuality: LiteraryQualityAssessment = {
  overallQuality: 50,
  proseQuality: 50,
  structureQuality: 50,
  characterDevelopmentQuality: 50,
  dialogueQuality: 50,
  thematicDepth: 50,
};

export const defaultProducibility: ProducibilityAnalysis = {
  technicalFeasibility: 5,
  budgetEstimate: "medium",
  productionChallenges: [],
  locationRequirements: [],
  specialEffectsNeeded: false,
  castSize: 5,
};

export const defaultRhythm: RhythmAnalysis = {
  overallPace: "medium",
  paceVariation: 5,
  sceneLengths: [],
  actBreakdown: [],
  recommendations: [],
};

export const defaultRecommendations: RecommendationBuckets = {
  priorityActions: ["فشل توليد التوصيات"],
  quickFixes: [],
  structuralRevisions: [],
};

export function getErrorFallback(): Station4Output {
  return {
    efficiencyMetrics: {
      overallEfficiencyScore: 0,
      overallRating: "Critical",
      conflictCohesion: 0,
      dramaticBalance: {
        balanceScore: 0,
        characterInvolvementGini: 1,
      },
      narrativeEfficiency: {
        characterEfficiency: 0,
        relationshipEfficiency: 0,
        conflictEfficiency: 0,
      },
      narrativeDensity: 0,
      redundancyMetrics: {
        characterRedundancy: 0,
        relationshipRedundancy: 0,
        conflictRedundancy: 0,
      },
    },
    qualityAssessment: {
      literary: 0,
      technical: 0,
      commercial: 0,
      overall: 0,
    },
    producibilityAnalysis: {
      technicalFeasibility: 0,
      budgetEstimate: "very_high",
      productionChallenges: [],
      locationRequirements: [],
      specialEffectsNeeded: false,
      castSize: 0,
    },
    rhythmAnalysis: {
      overallPace: "medium",
      paceVariation: 0,
      sceneLengths: [],
      actBreakdown: [],
      recommendations: [],
    },
    recommendations: {
      priorityActions: ["خطأ في التحليل"],
      quickFixes: ["خطأ في التحليل"],
      structuralRevisions: ["خطأ في التحليل"],
    },
    uncertaintyReport: {
      overallConfidence: 0,
      uncertainties: [],
    },
    metadata: {
      analysisTimestamp: new Date(),
      status: "Failed",
      analysisTime: 0,
      agentsUsed: [],
      tokensUsed: 0,
    },
  };
}
