// Station 6 Types

export interface Station6Input extends StationInput {
  previousAnalysis: {
    station1: Station1Output;
    station2: Station2Output;
    station3: Station3Output;
    station4: Station4Output;
    station5: Station5Output;
  };
  enableDebate?: boolean;
}

export interface Station6Output {
  // التقرير التشخيصي
  diagnosticsReport: {
    overallHealthScore: number; // 0-100
    criticalIssues: DiagnosticIssue[];
    warnings: DiagnosticIssue[];
    suggestions: DiagnosticIssue[];
    isolatedCharacters: IsolatedCharacter[];
    abandonedConflicts: AbandonedConflict[];
    structuralIssues: StructuralIssue[];
  };

  // نتائج النقاش متعدد الوكلاء (إذا كان مفعلاً)
  debateResults?: DebateResult;

  // خطة العلاج
  treatmentPlan: {
    prioritizedRecommendations: Recommendation[];
    estimatedImprovementScore: number;
    implementationComplexity: "low" | "medium" | "high";
    timeEstimate: string;
  };

  // التنبؤ بمسار الحبكة
  plotPredictions: {
    currentTrajectory: PlotPoint[];
    likelyDevelopments: PlotDevelopment[];
    alternativePaths: PlotPath[];
    riskAreas: RiskArea[];
  };

  // البيانات الوصفية
  metadata: StationMetadata;

  // تقرير عدم اليقين
  uncertaintyReport?: UncertaintyReport;
}