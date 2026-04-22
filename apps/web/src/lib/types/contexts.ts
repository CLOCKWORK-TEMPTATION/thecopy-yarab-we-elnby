// Type definitions for context objects used across the application

export interface CharacterContext {
  name: string;
  profile?: any;
  traits?: string[];
  motivations?: string[];
  relationships?: any[];
}

export interface NarrativeContext {
  themes?: string[];
  conflicts?: any[];
  plotPoints?: any[];
  setting?: any;
}

export interface AnalysisContext {
  characters?: CharacterContext[];
  narrative?: NarrativeContext;
  metadata?: Record<string, any>;
}

// Station-specific contexts
export interface Station2Context {
  storyStatement?: string;
  elevatorPitch?: string;
  hybridGenre?: string;
  themes?: string[];
  narrativeStructure?: any;
  conceptualFramework?: any;
  fullText?: string;
  narrativeTone?: string;
  majorCharacters?: string[];
  relationshipSummary?: any;
}

export interface Station3Context {
  conflictNetwork?: any;
  characterNetwork?: any;
  relationshipDynamics?: any;
  networkMetrics?: any;
  socialStructure?: any;
  fullText?: string;
  majorCharacters?: string[];
  characterProfiles?: Map<string, any>;
  relationshipData?: any[];
}

export type Context = AnalysisContext;
