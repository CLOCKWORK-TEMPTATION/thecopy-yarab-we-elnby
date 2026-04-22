// frontend/src/lib/ai/core/models/station-types.ts

import {
  Character,
  CharacterAnalysis,
  DialogueAnalysis,
  UncertaintyReport,
  StationMetadata,
  Relationship,
  Conflict,
  Theme,
  AudienceProfile,
  ScoreMatrix,
  Recommendation,
  DebateResult,
} from "./base-entities";

import { StationInput } from "../../stations/base-station";

// ======== المحطة 1: التحليل النصي الأساسي ========

export interface Station1Input extends StationInput {
  // لا يوجد مدخلات إضافية خاصة بالمحطة 1
}

export interface Station1Output {
  // البيانات الأساسية
  logline: string; // 2-3 جمل تلخص القصة
  majorCharacters: Character[]; // الشخصيات الرئيسية (3-7)
  characterAnalysis: Map<string, CharacterAnalysis>;
  dialogueAnalysis: DialogueAnalysis;
  narrativeStyleAnalysis: {
    overallTone: string;
    pacingAnalysis: string;
    languageStyle: string;
    perspective: string;
  };

  // البيانات الوصفية
  metadata: StationMetadata;

  // تقرير عدم اليقين (إذا كان مفعلاً)
  uncertaintyReport?: UncertaintyReport;
}

// ======== المحطة 2: التحليل المفاهيمي والموضوعي ========

export interface Station2Input extends StationInput {
  previousAnalysis: Station1Output;
}

export interface Station2Output {
  // البيانات المفاهيمية
  storyStatement: string; // بيان القصة الأساسي
  elevatorPitch: string; // عرض مختصر (40 كلمة)
  hybridGenre: {
    primary: string;
    secondary: string[];
    genreBlend: string;
    originalityScore: number; // 0-10
  };

  // المواضيع والرسائل
  themes: {
    primary: Theme[];
    secondary: Theme[];
    messages: {
      explicit: string[];
      implicit: string[];
      contradictions: string[];
    };
  };

  // الجمهور والسوق
  targetAudience: AudienceProfile;
  marketAnalysis: {
    producibility: number; // سهولة الإنتاج (0-10)
    commercialPotential: number; // إمكانية تجارية (0-10)
    uniqueness: number; // الأصالة (0-10)
    culturalResonance: number; // التوافق الثقافي (0-10)
  };

  // البيانات الوصفية
  metadata: StationMetadata;

  // تقرير عدم اليقين
  uncertaintyReport?: UncertaintyReport;
}

// ======== المحطة 3: تحليل شبكة الصراعات ========

export interface Station3Input extends StationInput {
  previousAnalysis: {
    station1: Station1Output;
    station2: Station2Output;
  };
}

export interface Station3Output {
  // شبكة الصراعات
  conflictNetwork: {
    characters: Map<string, Character>;
    relationships: Map<string, Relationship>;
    conflicts: Map<string, Conflict>;
    snapshots: NetworkSnapshot[]; // لقطات تطور الشبكة
  };

  // تحليل الشبكة
  networkAnalysis: {
    density: number; // كثافة العلاقات
    complexity: number; // تعقيد الشبكة
    balance: number; // توازن القوى
    dynamicRange: number; // مدى التغير
    centralityScores: Map<string, number>; // أهمية كل شخصية
  };

  // تحليل الصراعات
  conflictAnalysis: {
    mainConflict: Conflict;
    subConflicts: Conflict[];
    conflictTypes: Map<string, number>;
    intensityProgression: number[]; // منحنى شدة الصراع
    resolutionQuality: number; // جودة الحلول
  };

  // أقواس الشخصيات
  characterArcs: Map<string, CharacterArc>;

  // النقاط المحورية
  pivotPoints: Array<{
    timestamp: string;
    description: string;
    impact: number;
    affectedElements: string[];
  }>;

  // البيانات الوصفية
  metadata: StationMetadata;

  // تقرير عدم اليقين
  uncertaintyReport?: UncertaintyReport;
}

// ======== المحطة 4: مقاييس الكفاءة ========

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

  // تحليل إمكانية الإنتاج
  producibilityAnalysis: {
    technicalFeasibility: number; // 0-10
    budgetEstimate: "low" | "medium" | "high" | "very_high";
    productionChallenges: Array<{
      challenge: string;
      severity: "low" | "medium" | "high";
      solution: string;
    }>;
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

// ======== المحطة 5: التحليل الديناميكي والرمزي ========

export interface Station5Input extends StationInput {
  previousAnalysis: {
    station1: Station1Output;
    station2: Station2Output;
    station3: Station3Output;
    station4: Station4Output;
  };
}

export interface Station5Output {
  // التحليل الديناميكي
  dynamicAnalysis: {
    eventTimeline: TimelineEvent[];
    networkEvolution: EvolutionAnalysis;
    characterDevelopment: Map<string, CharacterEvolution>;
    conflictProgression: Map<string, ConflictProgression>;
  };

  // التحليل الرمزي
  symbolicAnalysis: {
    keySymbols: Symbol[];
    recurringMotifs: Motif[];
    thematicConnections: string[];
    depthScore: number;
    consistencyScore: number;
  };

  // التحليل الأسلوبي
  stylisticAnalysis: {
    toneAssessment: ToneAssessment;
    languageComplexity: LanguageMetrics;
    pacingImpression: PacingAnalysis;
    descriptiveRichness: DescriptiveMetrics;
  };

  // تحليل التوتر
  tensionAnalysis: {
    tensionCurve: number[];
    peaks: TensionPeak[];
    valleys: TensionValley[];
    recommendations: {
      addTension: Location[];
      reduceTension: Location[];
      redistributeTension: string[];
    };
  };

  // تحليل الحوار المتقدم
  dialogueAdvanced: {
    subtext: SubtextAnalysis[];
    powerDynamics: PowerDynamic[];
    emotionalBeats: EmotionalBeat[];
    advancedMetrics: {
      subtextDepth: number;
      emotionalRange: number;
      characterVoiceConsistency: Map<string, number>;
    };
  };

  // التحليل البصري السينمائي
  visualCinematic: {
    visualDensity: number;
    cinematicPotential: number;
    keyVisualMoments: VisualMoment[];
    colorPalette: string[];
    visualMotifs: Motif[];
    cinematographyNotes: string[];
  };

  // البيانات الوصفية
  metadata: StationMetadata;

  // تقرير عدم اليقين
  uncertaintyReport?: UncertaintyReport;
}

// ======== المحطة 6: التشخيص والعلاج ========

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

// ======== المحطة 7: التقرير النهائي المتكامل ========

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
    rewritingSuggestions: Array<{
      location: string;
      currentVersion: string;
      suggestedRewrite: string;
      reasoning: string;
      impact: number;
    }>;
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

// ======== أنواع مساعدة ========

export interface NetworkSnapshot {
  timestamp: number;
  relationships: Map<string, Relationship>;
  conflicts: Map<string, Conflict>;
}

export interface CharacterArc {
  characterName: string;
  arcType: "positive" | "negative" | "flat" | "transformational";
  keyMoments: Array<{
    scene: string;
    change: string;
    significance: string;
  }>;
  arcStrength: number; // 0-10
}

export interface TimelineEvent {
  timestamp: number;
  description: string;
  type: "action" | "dialogue" | "realization" | "conflict" | "resolution";
  characters: string[];
  impact: number; // 0-10
}

export interface EvolutionAnalysis {
  networkChanges: Array<{
    from: number;
    to: number;
    change: string;
    significance: string;
  }>;
  characterEvolution: Map<string, number>; // تغير الشخصية بمرور الوقت
  conflictEvolution: Map<string, number>; // تغير الصراع بمرور الوقت
}

export interface CharacterEvolution {
  characterName: string;
  startPoint: Character;
  endPoint: Character;
  journey: string;
  growth: number; // 0-10
}

export interface ConflictProgression {
  conflictId: string;
  intensity: number[];
  keyDevelopments: Array<{
    event: string;
    impact: number;
    timestamp: number;
  }>;
  resolution: {
    resolved: boolean;
    satisfaction: number; // 0-10
  };
}

export interface Symbol {
  name: string;
  description: string;
  appearances: Array<{
    location: string;
    context: string;
    significance: string;
  }>;
  meaning: string;
  effectiveness: number; // 0-10
}

export interface Motif {
  name: string;
  type: "visual" | "auditory" | "thematic" | "behavioral";
  frequency: number;
  significance: string;
  connections: string[];
}

export interface ToneAssessment {
  primaryTone: string;
  secondaryTones: string[];
  consistency: number; // 0-10
  effectiveness: number; // 0-10
}

export interface LanguageMetrics {
  complexity: "simple" | "moderate" | "complex" | "poetic";
  vocabulary: {
    richness: number; // 0-10
    diversity: number; // 0-10
  };
  sentenceStructure: {
    averageLength: number;
    variety: number; // 0-10
  };
}

export interface PacingAnalysis {
  overallPace: "very_slow" | "slow" | "medium" | "fast" | "very_fast";
  rhythm: "consistent" | "varied" | "erratic";
  effectiveness: number; // 0-10
  recommendations: string[];
}

export interface DescriptiveMetrics {
  vividness: number; // 0-10
  sensoryDetails: {
    visual: number;
    auditory: number;
    kinesthetic: number;
    olfactory: number;
    gustatory: number;
  };
  showVsTell: {
    showRatio: number; // 0-1
    effectiveness: number; // 0-10
  };
}

export interface TensionPeak {
  location: string;
  intensity: number; // 0-10
  type: "dramatic" | "suspense" | "emotional" | "action";
  resolution: string;
}

export interface TensionValley {
  location: string;
  intensity: number; // 0-10
  duration: string;
  purpose: string;
}

export interface Location {
  scene: string;
  description: string;
  timestamp: number;
}

export interface SubtextAnalysis {
  dialogue: string;
  subtext: string;
  effectiveness: number; // 0-10
  characters: string[];
}

export interface PowerDynamic {
  characters: string[];
  powerHolder: string;
  powerType: "formal" | "informal" | "emotional" | "physical";
  intensity: number; // 0-10
  shift: boolean;
}

export interface EmotionalBeat {
  emotion: string;
  intensity: number; // 0-10
  trigger: string;
  characters: string[];
}

export interface VisualMoment {
  description: string;
  significance: string;
  cinematicPotential: number; // 0-10
  requirements: string[];
}

export interface DiagnosticIssue {
  id: string;
  type: "character" | "plot" | "dialogue" | "structure" | "pacing" | "theme";
  severity: "critical" | "major" | "minor";
  title: string;
  description: string;
  location: string;
  recommendation: string;
  impact: number; // 0-10
}

export interface IsolatedCharacter {
  characterName: string;
  isolationReason: string;
  connectionsNeeded: string[];
  integrationSuggestions: string[];
}

export interface AbandonedConflict {
  conflictId: string;
  description: string;
  abandonmentPoint: string;
  resolutionSuggestions: string[];
}

export interface StructuralIssue {
  type: "act_break" | "midpoint" | "climax" | "resolution" | "setup";
  issue: string;
  location: string;
  suggestion: string;
  severity: "critical" | "major" | "minor";
}

export interface PlotPoint {
  timestamp: number;
  description: string;
  type:
    | "setup"
    | "inciting_incident"
    | "rising_action"
    | "midpoint"
    | "climax"
    | "falling_action"
    | "resolution";
  significance: string;
}

export interface PlotDevelopment {
  description: string;
  probability: number; // 0-1
  reasoning: string;
  impact: string;
}

export interface PlotPath {
  name: string;
  description: string;
  keyChanges: string[];
  likelihood: number; // 0-1
  pros: string[];
  cons: string[];
}

export interface RiskArea {
  area: string;
  risk: "low" | "medium" | "high";
  description: string;
  mitigation: string[];
}

export interface Opportunity {
  area: string;
  potential: "low" | "medium" | "high";
  description: string;
  exploitation: string[];
}

export interface ActPacing {
  act: number;
  pace: "slow" | "medium" | "fast";
  scenes: number;
  pagePercentage: number;
  effectiveness: number; // 0-10
}
