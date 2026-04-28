// Station 6 Types

import type {
  StationInput,
  DiagnosticIssue,
  IsolatedCharacter,
  AbandonedConflict,
  StructuralIssue,
  DebateResult,
  Recommendation,
  PlotPoint,
  PlotDevelopment,
  PlotPath,
  RiskArea,
  StationMetadata,
  UncertaintyReport,
} from "./common-types";
import type { Station1Output } from "./station-1-types";
import type { Station2Output } from "./station-2-types";
import type { Station3Output } from "./station-3-types";
import type { Station4Output } from "./station-4-types";
import type { Station5Output } from "./station-5-types";

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
