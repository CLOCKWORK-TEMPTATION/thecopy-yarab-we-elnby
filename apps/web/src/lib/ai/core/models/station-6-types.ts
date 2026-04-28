// Station 6: التشخيص والعلاج

import { StationInput } from "../../stations/base-station";

import {
  StationMetadata,
  UncertaintyReport,
  DebateResult,
  Recommendation,
} from "./base-entities";

import { Station1Output } from "./station-1-types";
import { Station2Output } from "./station-2-types";
import { Station3Output } from "./station-3-types";
import { Station4Output } from "./station-4-types";
import { Station5Output } from "./station-5-types";

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

  // نتائج النقاش متعدد الوكاء (إذا كان مفعلاً)
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