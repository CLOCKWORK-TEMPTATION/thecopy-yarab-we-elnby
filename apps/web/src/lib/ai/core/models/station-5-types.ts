// Station 5 Types

import type {
  StationInput,
  TimelineEvent,
  EvolutionAnalysis,
  CharacterEvolution,
  ConflictProgression,
  Motif,
  ToneAssessment,
  LanguageMetrics,
  PacingAnalysis,
  DescriptiveMetrics,
  TensionPeak,
  TensionValley,
  Location,
  SubtextAnalysis,
  PowerDynamic,
  EmotionalBeat,
  VisualMoment,
  StationMetadata,
  UncertaintyReport,
} from "./common-types";
import type { Station1Output } from "./station-1-types";
import type { Station2Output } from "./station-2-types";
import type { Station3Output } from "./station-3-types";
import type { Station4Output } from "./station-4-types";

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
    keySymbols: symbol[];
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
