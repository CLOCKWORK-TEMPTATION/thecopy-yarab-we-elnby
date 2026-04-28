// Station 7 Types

export interface Station7Input extends StationInput {
  previousAnalysis: {
    station1: Station1Output;
    station2: Station2Output;
    station3: Station3Output;
    station4: Station4Output;
    station5: Station5Output;
    station6: Station6Output;
  };
}

export interface Station7Output {
  // التقرير النهائي الشامل
  finalReport: {
    executiveSummary: string; // ملخص تنفيذي (200-300 كلمة)

    // تقييم شامل
    overallAssessment: {
      narrativeQualityScore: number; // 0-100
      structuralIntegrityScore: number;
      characterDevelopmentScore: number;
      conflictEffectivenessScore: number;
      thematicDepthScore: number;
      overallScore: number; // متوسط مرجح
      rating: "Masterpiece" | "Excellent" | "Good" | "Fair" | "Needs Work";
    };

    // نقاط القوة والضعف
    strengthsAnalysis: string[];
    weaknessesIdentified: string[];
    opportunitiesForImprovement: string[];
    threatsToCoherence: string[];

    // التوصيات النهائية
    finalRecommendations: {
      mustDo: string[]; // يجب عمله
      shouldDo: string[]; // ينبغي عمله
      couldDo: string[]; // يمكن عمله
    };

    // تقييم الجمهور المتوقع
    audienceResonance: {
      emotionalImpact: number; // 0-10
      intellectualEngagement: number; // 0-10
      relatability: number; // 0-10
      memorability: number; // 0-10
      viralPotential: number; // 0-10
      audiencePredictions: {
        primaryResponse: string;
        secondaryResponses: string[];
        controversialElements: string[];
      };
    };

    // اقتراحات إعادة الكتابة
    rewritingSuggestions: {
      location: string;
      currentVersion: string;
      suggestedRewrite: string;
      reasoning: string;
      impact: number;
    }[];
  };

  // Score Matrix شامل
  scoreMatrix: ScoreMatrix;

  // تقرير الثقة النهائي
  finalConfidence: {
    overallConfidence: number;
    stationConfidences: Map<string, number>;
    uncertaintyAggregation: {
      epistemicUncertainties: string[];
      aleatoricUncertainties: string[];
      resolvableIssues: string[];
    };
  };

  // البيانات الوصفية النهائية
  metadata: StationMetadata;
}
