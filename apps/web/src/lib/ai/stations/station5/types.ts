// Define ConflictPhase enum for conflict progression tracking
export enum ConflictPhaseEnum {
  LATENT = "latent",
  EMERGING = "emerging",
  ESCALATING = "escalating",
  CLIMAX = "climax",
  DEESCALATING = "deescalating",
  RESOLUTION = "resolution",
  AFTERMATH = "aftermath",
}

// Extend Conflict interface to include phase property
export interface ConflictWithPhase extends Conflict {
  phase?: ConflictPhaseEnum | string;
}

// Station 5 Interfaces
export interface Station5Input {
  conflictNetwork: ConflictNetwork;
  station4Output: Station4Output;
  fullText: string;
  options?: {
    enableConstitutionalAI?: boolean;
    enableUncertaintyQuantification?: boolean;
    enableMultiAgentDebate?: boolean;
    temperature?: number;
  };
}

export interface Station5Output {
  dynamicAnalysis: DynamicAnalysis;
  symbolicAnalysis: SymbolicAnalysis;
  stylisticAnalysis: StylisticAnalysis;
  tensionAnalysis: TensionAnalysis;
  advancedDialogueAnalysis: AdvancedDialogueAnalysis;
  visualCinematicAnalysis: VisualCinematicAnalysis;
  uncertaintyReport: UncertaintyReport;
  metadata: StationMetadata;
}

export interface DynamicAnalysis {
  eventTimeline: TimelineEvent[];
  networkEvolution: EvolutionAnalysis;
  characterDevelopment: Map<string, CharacterEvolution>;
  conflictProgression: Map<string, ConflictProgression>;
}

export interface TimelineEvent {
  timestamp: Date;
  eventType:
    | "character_introduced"
    | "relationship_formed"
    | "conflict_emerged"
    | "conflict_escalated"
    | "conflict_resolved"
    | "character_transformed"
    | "network_snapshot"
    | "other";
  description: string;
  involvedEntities: {
    characters?: string[];
    relationships?: string[];
    conflicts?: string[];
  };
  significance: number; // 1-10
  narrativePhase:
    | "setup"
    | "rising_action"
    | "climax"
    | "falling_action"
    | "resolution";
}

export interface EvolutionAnalysis {
  overallGrowthRate: number;
  complexityProgression: number[];
  densityProgression: number[];
  criticalTransitionPoints: {
    timestamp: Date;
    description: string;
    impactScore: number;
  }[];
  stabilityMetrics: {
    structuralStability: number;
    characterStability: number;
    conflictStability: number;
  };
}

export interface CharacterEvolution {
  characterId: string;
  characterName: string;
  developmentStages: {
    timestamp: Date;
    stage: string;
    traits: string[];
    relationships: string[];
    conflicts: string[];
  }[];
  arcType: "positive" | "negative" | "flat" | "complex";
  transformationScore: number;
  keyMoments: {
    timestamp: Date;
    event: string;
    impact: string;
  }[];
}

export interface ConflictProgression {
  conflictId: string;
  conflictName: string;
  phaseTransitions: {
    timestamp: Date;
    fromPhase: ConflictPhaseEnum | string;
    toPhase: ConflictPhaseEnum | string;
    catalyst: string;
  }[];
  intensityProgression: number[];
  resolutionProbability: number;
  stagnationRisk: number;
}

export interface SymbolicAnalysis {
  keySymbols: Symbol[];
  recurringMotifs: Motif[];
  centralThemesHintedBySymbols: string[];
  symbolicNetworks: {
    primarySymbol: string;
    relatedSymbols: string[];
    thematicConnection: string;
  }[];
  depthScore: number;
  consistencyScore: number;
}

export interface Symbol {
  symbol: string;
  interpretation: string;
  frequency: number;
}

export interface Motif {
  motif: string;
  description: string;
  occurrences: number;
}

export interface StylisticAnalysis {
  toneAssessment: ToneAssessment;
  languageMetrics: LanguageMetrics;
  pacingAnalysis: PacingAnalysis;
  descriptiveMetrics: DescriptiveMetrics;
}

export interface ToneAssessment {
  primaryTone: string;
  toneConsistency: number;
  toneShifts: {
    location: string;
    fromTone: string;
    toTone: string;
    justification: string;
  }[];
}

export interface LanguageMetrics {
  vocabularyRichness: number;
  sentenceComplexity: number;
  dialogueRatio: number;
  narrativeVoice: string;
}

export interface PacingAnalysis {
  overallPacing: string;
  pacingVariability: number;
  sceneLengthDistribution: number[];
}

export interface DescriptiveMetrics {
  visualDetailLevel: number;
  sensoryEngagement: number;
  atmosphericQuality: number;
}

export interface TensionAnalysis {
  tensionCurve: number[];
  peaks: TensionPeak[];
  valleys: TensionValley[];
  recommendations: {
    addTension: Location[];
    reduceTension: Location[];
    redistributeTension: Location[];
  };
}

export interface TensionPeak {
  location: Location;
  intensity: number;
  duration: number;
  justification: string;
}

export interface TensionValley {
  location: Location;
  depth: number;
  duration: number;
  justification: string;
}

export interface Location {
  start: number;
  end: number;
  description: string;
}

export interface AdvancedDialogueAnalysis {
  subtext: SubtextAnalysis[];
  powerDynamics: PowerDynamic[];
  emotionalBeats: EmotionalBeat[];
  advancedMetrics: {
    subtextDepth: number;
    emotionalRange: number;
    characterVoiceConsistency: Map<string, number>;
  };
}

export interface SubtextAnalysis {
  location: Location;
  surfaceText: string;
  subtext: string;
  speaker: string;
  listener: string;
  intention: string;
}

export interface PowerDynamic {
  characters: string[];
  dynamic: "dominant" | "submissive" | "equal" | "conflictual";
  evidence: string[];
  significance: number;
}

export interface EmotionalBeat {
  location: Location;
  emotion: string;
  intensity: number;
  character: string;
  trigger: string;
}

export interface VisualCinematicAnalysis {
  visualDensity: number;
  cinematicPotential: number;
  keyVisualMoments: VisualMoment[];
  colorPalette: string[];
  visualMotifs: string[];
  cinematographyNotes: string[];
}

export interface VisualMoment {
  location: Location;
  description: string;
  cinematicPotential: number;
  visualElements: string[];
}

export interface UncertaintyReport {
  overallConfidence: number;
  uncertainties: {
    component: string;
    confidence: number;
    reason: string;
  }[];
}

export interface StationMetadata {
  analysisTimestamp: Date;
  status: "Success" | "Failed";
  agentsUsed: string[];
  executionTime: number;
}
