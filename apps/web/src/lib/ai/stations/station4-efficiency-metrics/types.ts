import type { Station3Output } from "../station3-network-builder";

export interface Station4Input {
  station3Output: Station3Output;
  originalText: string;
  options?: {
    enableConstitutionalAI?: boolean;
    enableUncertaintyQuantification?: boolean;
    temperature?: number;
  };
}

export interface EfficiencyMetrics {
  overallEfficiencyScore: number; // 0-100
  overallRating: "Excellent" | "Good" | "Fair" | "Poor" | "Critical";
  conflictCohesion: number;
  dramaticBalance: {
    balanceScore: number;
    characterInvolvementGini: number;
  };
  narrativeEfficiency: {
    characterEfficiency: number;
    relationshipEfficiency: number;
    conflictEfficiency: number;
  };
  narrativeDensity: number;
  redundancyMetrics: {
    characterRedundancy: number;
    relationshipRedundancy: number;
    conflictRedundancy: number;
  };
}

export interface QualityAssessment {
  literary: number;
  technical: number;
  commercial: number;
  overall: number;
}

export interface LiteraryQualityAssessment {
  overallQuality: number;
  proseQuality: number;
  structureQuality: number;
  characterDevelopmentQuality: number;
  dialogueQuality: number;
  thematicDepth: number;
}

export interface ProducibilityAnalysis {
  technicalFeasibility: number; // 0-10
  budgetEstimate: "low" | "medium" | "high" | "very_high";
  productionChallenges: {
    type: string;
    description: string;
    severity: "low" | "medium" | "high";
  }[];
  locationRequirements: string[];
  specialEffectsNeeded: boolean;
  castSize: number;
}

export interface RhythmAnalysis {
  overallPace: "very_slow" | "slow" | "medium" | "fast" | "very_fast";
  paceVariation: number;
  sceneLengths: number[];
  actBreakdown: {
    act: number;
    averagePace: string;
    tensionProgression: number[];
  }[];
  recommendations: string[];
}

export interface Recommendation {
  type: "character" | "relationship" | "conflict" | "structure" | "dialogue";
  priority: "high" | "medium" | "low";
  description: string;
  impact: number; // 0-10
  implementationComplexity: "low" | "medium" | "high";
}

export interface UncertaintyReport {
  overallConfidence: number;
  uncertainties: {
    type: "epistemic" | "aleatoric";
    aspect: string;
    note: string;
  }[];
}

export interface Station4Output {
  efficiencyMetrics: EfficiencyMetrics;
  qualityAssessment: QualityAssessment;
  producibilityAnalysis: ProducibilityAnalysis;
  rhythmAnalysis: RhythmAnalysis;
  recommendations: {
    priorityActions: string[];
    quickFixes: string[];
    structuralRevisions: string[];
  };
  uncertaintyReport: UncertaintyReport;
  metadata: {
    analysisTimestamp: Date;
    status: "Success" | "Partial" | "Failed";
    analysisTime: number;
    agentsUsed: string[];
    tokensUsed: number;
  };
}

export type RecommendationBuckets = Station4Output["recommendations"];
