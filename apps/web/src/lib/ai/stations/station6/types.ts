export interface DiagnosticIssue {
  type: "critical" | "major" | "minor";
  category:
    | "character"
    | "plot"
    | "dialogue"
    | "structure"
    | "theme"
    | "pacing"
    | "continuity";
  description: string;
  location: string;
  impact: number; // 0-10
  suggestion: string;
  affectedElements: string[];
  priority: number; // 1-10 للترتيب
}

export interface IsolatedCharacter {
  name: string;
  isolationScore: number; // 0-10
  currentConnections: string[];
  missedOpportunities: string[];
  integrationSuggestions: {
    type: "conflict" | "relationship" | "subplot";
    description: string;
    expectedImpact: number;
  }[];
}

export interface AbandonedConflict {
  id: string;
  description: string;
  involvedCharacters: string[];
  introducedAt: string;
  abandonedAt: string;
  setupInvestment: number; // 0-10 مدى الاستثمار في إعداد هذا الصراع
  resolutionStrategies: {
    approach: string;
    complexity: "low" | "medium" | "high";
    narrativePayoff: number; // 0-10
    implementation: string;
  }[];
}

export interface StructuralIssue {
  type:
    | "pacing"
    | "continuity"
    | "logic"
    | "coherence"
    | "causality"
    | "timing";
  description: string;
  location: string;
  severity: number; // 0-10
  cascadingEffects: string[];
  fixStrategy: {
    approach: string;
    effort: "minimal" | "moderate" | "substantial";
    riskLevel: "low" | "medium" | "high";
    implementation: string;
  };
}

export interface Recommendation {
  priority: "immediate" | "short_term" | "long_term" | "optional";
  category:
    | "character"
    | "plot"
    | "structure"
    | "dialogue"
    | "theme"
    | "pacing";
  title: string;
  description: string;
  rationale: string;
  impact: number; // 0-10
  effort: number; // 0-10
  riskLevel: "low" | "medium" | "high";
  prerequisites: string[];
  implementation: {
    steps: string[];
    estimatedTime: string;
    potentialChallenges: string[];
  };
  expectedOutcome: string;
}

export interface PlotDevelopment {
  description: string;
  probability: number; // 0-1
  confidence: number; // 0-1
  contributingFactors: {
    factor: string;
    weight: number; // 0-1
  }[];
  potentialIssues: {
    issue: string;
    severity: number; // 0-10
    mitigation: string;
  }[];
  narrativePayoff: number; // 0-10
}

export interface PlotPath {
  name: string;
  description: string;
  probability: number; // 0-1
  divergencePoint: string;
  advantages: {
    aspect: string;
    benefit: string;
    impact: number; // 0-10
  }[];
  disadvantages: {
    aspect: string;
    drawback: string;
    severity: number; // 0-10
  }[];
  keyMoments: {
    moment: string;
    significance: string;
    timing: string;
  }[];
  requiredSetup: string[];
  compatibilityScore: number; // 0-10 مدى التوافق مع النص الحالي
}

export interface RiskArea {
  description: string;
  probability: number; // 0-1
  impact: number; // 0-10
  category: "narrative" | "character" | "theme" | "audience" | "execution";
  indicators: string[];
  mitigation: {
    strategy: string;
    effort: "low" | "medium" | "high";
    effectiveness: number; // 0-10
  };
}

export interface Opportunity {
  description: string;
  potential: number; // 0-10
  category: "character" | "plot" | "theme" | "emotional" | "commercial";
  currentState: string;
  exploitation: {
    approach: string;
    effort: "minimal" | "moderate" | "substantial";
    timeline: string;
  };
  expectedBenefit: string;
}

export interface PlotPoint {
  timestamp: string;
  description: string;
  importance: number; // 0-10
  confidence: number; // 0-1
}

export interface DiagnosticsReport {
  overallHealthScore: number; // 0-100
  healthBreakdown: {
    characterDevelopment: number; // 0-100
    plotCoherence: number; // 0-100
    structuralIntegrity: number; // 0-100
    dialogueQuality: number; // 0-100
    thematicDepth: number; // 0-100
  };
  criticalIssues: DiagnosticIssue[];
  warnings: DiagnosticIssue[];
  suggestions: DiagnosticIssue[];
  isolatedCharacters: IsolatedCharacter[];
  abandonedConflicts: AbandonedConflict[];
  structuralIssues: StructuralIssue[];
  riskAreas: RiskArea[];
  opportunities: Opportunity[];
  summary: string;
}

export interface TreatmentPlan {
  prioritizedRecommendations: Recommendation[];
  implementationRoadmap: {
    phase1: {
      title: string;
      tasks: string[];
      estimatedTime: string;
      expectedImpact: number; // 0-100
    };
    phase2: {
      title: string;
      tasks: string[];
      estimatedTime: string;
      expectedImpact: number;
    };
    phase3: {
      title: string;
      tasks: string[];
      estimatedTime: string;
      expectedImpact: number;
    };
  };
  estimatedImprovementScore: number; // 0-100
  implementationComplexity: "low" | "medium" | "high";
  totalTimeEstimate: string;
  riskAssessment: {
    overallRisk: "low" | "medium" | "high";
    specificRisks: {
      risk: string;
      probability: number;
      impact: number;
      mitigation: string;
    }[];
  };
  successMetrics: {
    metric: string;
    currentValue: number;
    targetValue: number;
    measurementMethod: string;
  }[];
}

export interface PlotPredictions {
  currentTrajectory: PlotPoint[];
  trajectoryConfidence: number; // 0-1
  likelyDevelopments: PlotDevelopment[];
  alternativePaths: PlotPath[];
  criticalDecisionPoints: {
    point: string;
    importance: number; // 0-10
    options: string[];
    implications: string;
  }[];
  narrativeMomentum: number; // 0-10
  predictabilityScore: number; // 0-10
}

export interface StationMetadata {
  analysisTimestamp: Date;
  status: "Success" | "Partial" | "Failed";
  executionTime: number;
  agentsUsed: string[];
  tokensUsed?: number;
}

export interface UncertaintyReport {
  overallConfidence: number;
  uncertainties: {
    type: "epistemic" | "aleatoric";
    aspect: string;
    note: string;
  }[];
}

export interface Station6Output {
  diagnosticsReport: DiagnosticsReport;
  debateResults: DebateResult;
  treatmentPlan: TreatmentPlan;
  plotPredictions: PlotPredictions;
  uncertaintyReport: UncertaintyReport;
  metadata: StationMetadata;
}
