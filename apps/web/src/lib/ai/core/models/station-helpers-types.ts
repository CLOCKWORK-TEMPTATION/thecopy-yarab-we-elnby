// أنواع مساعدة للمحطات

export interface NetworkSnapshot {
  timestamp: number;
  relationships: Map<string, Relationship>;
  conflicts: Map<string, Conflict>;
}

export interface CharacterArc {
  characterName: string;
  arcType: "positive" | "negative" | "flat" | "transformational";
  keyMoments: {
    scene: string;
    change: string;
    significance: string;
  }[];
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
  networkChanges: {
    from: number;
    to: number;
    change: string;
    significance: string;
  }[];
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
  keyDevelopments: {
    event: string;
    impact: number;
    timestamp: number;
  }[];
  resolution: {
    resolved: boolean;
    satisfaction: number; // 0-10
  };
}

export interface Symbol {
  name: string;
  description: string;
  appearances: {
    location: string;
    context: string;
    significance: string;
  }[];
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

// أنواع مساعدة أخرى إذا لزم

export interface Character {
  id: string;
  name: string;
  role?: string;
  traits?: string[];
  relationships?: string[];
  arc?: string;
}

export interface Relationship {
  id?: string;
  source: string;
  target: string;
  type?: string;
  strength?: number;
}

export interface Conflict {
  id?: string;
  name?: string;
  type?: string;
  subject?: string;
  strength?: number;
  scope?: string;
  involvedCharacters?: string[];
  timestamps?: Date[];
  description?: string;
  participants?: string[];
}