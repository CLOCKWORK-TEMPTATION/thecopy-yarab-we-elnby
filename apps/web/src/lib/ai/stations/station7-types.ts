/**
 * @fileoverview Types and interfaces for Station 7 – Finalization.
 * Extracted from station7-finalization.ts to keep each file ≤ 500 lines.
 */

export interface Station7Input {
  conflictNetwork: import("../core/models/base-entities").ConflictNetwork;
  station6Output: import("./station6-diagnostics-treatment").Station6Output;
  allPreviousStationsData: Map<number, unknown>;
}

export interface AudienceResonance {
  emotionalImpact: number;
  intellectualEngagement: number;
  relatability: number;
  memorability: number;
  viralPotential: number;
  primaryResponse: string;
  secondaryResponses: string[];
  controversialElements: string[];
}

export interface RewritingSuggestion {
  location: string;
  currentIssue: string;
  suggestedRewrite: string;
  reasoning: string;
  impact: number;
  priority: "must" | "should" | "could";
}

export interface ScoreMatrix {
  foundation: number;
  conceptual: number;
  conflictNetwork: number;
  efficiency: number;
  dynamicSymbolic: number;
  diagnostics: number;
  overall: number;
}

export interface Station7Output {
  finalReport: {
    executiveSummary: string;
    overallAssessment: {
      narrativeQualityScore: number;
      structuralIntegrityScore: number;
      characterDevelopmentScore: number;
      conflictEffectivenessScore: number;
      thematicDepthScore: number;
      overallScore: number;
      rating: "Masterpiece" | "Excellent" | "Good" | "Fair" | "Needs Work";
    };
    strengthsAnalysis: string[];
    weaknessesIdentified: string[];
    opportunitiesForImprovement: string[];
    threatsToCoherence: string[];
    finalRecommendations: {
      mustDo: string[];
      shouldDo: string[];
      couldDo: string[];
    };
    audienceResonance: AudienceResonance;
    rewritingSuggestions: RewritingSuggestion[];
  };
  scoreMatrix: ScoreMatrix;
  finalConfidence: {
    overallConfidence: number;
    stationConfidences: Map<string, number>;
    uncertaintyAggregation: {
      epistemicUncertainties: string[];
      aleatoricUncertainties: string[];
      resolvableIssues: string[];
    };
  };
  metadata: {
    analysisTimestamp: Date;
    totalExecutionTime: number;
    stationsCompleted: number;
    agentsUsed: string[];
    tokensUsed: number;
    modelUsed: string;
    status: "Complete" | "Partial" | "Failed";
  };
}

// ---------------------------------------------------------------------------
// Internal helper types (used by score utils and parsers)
// ---------------------------------------------------------------------------

export interface StationScoreLike {
  confidence?: number;
  qualityScore?: number;
  overallScore?: number;
}

export interface Station2AudienceContext {
  hybridGenre?: {
    primary?: string;
  };
  targetAudience?: {
    primaryAudience?: string;
  };
}
