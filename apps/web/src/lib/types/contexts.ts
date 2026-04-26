// Type definitions for context objects used across the application

export interface CharacterContext {
  name: string;
  profile?: unknown;
  traits?: string[];
  motivations?: string[];
  relationships?: unknown[];
}

export interface NarrativeContext {
  themes?: string[];
  conflicts?: unknown[];
  plotPoints?: unknown[];
  setting?: unknown;
}

export interface AnalysisContext {
  characters?: CharacterContext[];
  narrative?: NarrativeContext;
  metadata?: Record<string, unknown>;
}

// Station-specific contexts
export interface Station2Context {
  storyStatement?: string;
  elevatorPitch?: string;
  hybridGenre?: string;
  themes?: string[];
  narrativeStructure?: unknown;
  conceptualFramework?: unknown;
  fullText?: string;
  narrativeTone?: string;
  majorCharacters?: string[];
  relationshipSummary?: unknown;
}

export interface Station3Context {
  conflictNetwork?: unknown;
  characterNetwork?: unknown;
  relationshipDynamics?: unknown;
  networkMetrics?: unknown;
  socialStructure?: unknown;
  fullText?: string;
  majorCharacters?: string[];
  characterProfiles?: Map<string, unknown>;
  relationshipData?: unknown[];
}

export type Context = AnalysisContext;
