// Station 4: مقاييس الكفاءة

import { StationInput } from "../../stations/base-station";

import {
  StationMetadata,
  UncertaintyReport,
  Recommendation,
} from "./base-entities";

import { Station1Output } from "./station-1-types";
import { Station2Output } from "./station-2-types";
import { Station3Output } from "./station-3-types";

export interface Station4Input extends StationInput {
  previousAnalysis: {
    station1: Station1Output;
    station2: Station2Output;
    station3: Station3Output;
  };
}

export interface Station4Output {
  // مقاييس الكفاءة
  efficiencyMetrics: {
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
  };

  // تقييم الجودة
  qualityAssessment: {
    literary: number;
    technical: number;
    commercial: number;
    overall: number;
  };

  // إمكانية الإنتاج
  producibilityAnalysis: {
    technicalFeasibility: number; // 0-10
    budgetEstimate: "low" | "medium" | "high" | "very_high";
    productionChallenges: {
      challenge: string;
      severity: "low" | "medium" | "high";
      solution: string;
    }[];
    locationRequirements: string[];
    specialEffectsNeeded: boolean;
    castSize: number;
    shootingDays: number;
  };

  // تحليل الإيقاع
  rhythmAnalysis: {
    overallPace: "very_slow" | "slow" | "medium" | "fast" | "very_fast";
    paceVariation: number;
    sceneLengths: number[];
    actBreakdown: ActPacing[];
    recommendations: string[];
  };

  // التوصيات
  recommendations: {
    priorityActions: string[];
    quickFixes: string[];
    structuralRevisions: string[];
  };

  // البيانات الوصفية
  metadata: StationMetadata;

  // تقرير عدم اليقين
  uncertaintyReport?: UncertaintyReport;
}