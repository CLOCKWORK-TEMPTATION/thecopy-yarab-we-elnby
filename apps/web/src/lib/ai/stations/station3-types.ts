/**
 * @fileoverview Types and enums for Station 3 – Network Builder.
 * Extracted from station3-network-builder.ts to keep each file ≤ 500 lines.
 */

import type { StationInput } from "./base-station";
import type { CharacterProfile , Station1Output } from "./station1-text-analysis";
import type { Station2Output } from "./station2-conceptual-analysis";

// ---------------------------------------------------------------------------
// Pivotal points
// ---------------------------------------------------------------------------

export interface ConflictPivotPoint {
  timestamp: string | Date;
  description: string;
  impact: number;
  affectedElements?: string[];
}

// ---------------------------------------------------------------------------
// Relationship hint from previous stations
// ---------------------------------------------------------------------------

export interface RelationshipHint {
  source?: string;
  target?: string;
  description?: string;
  strength?: number;
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum RelationshipType {
  FAMILY = "family",
  FRIENDSHIP = "friendship",
  ROMANTIC = "romantic",
  PROFESSIONAL = "professional",
  ANTAGONISTIC = "antagonistic",
  MENTORSHIP = "mentorship",
  OTHER = "other",
}

export enum RelationshipNature {
  POSITIVE = "positive",
  NEGATIVE = "negative",
  NEUTRAL = "neutral",
  VOLATILE = "volatile",
}

export enum RelationshipDirection {
  UNIDIRECTIONAL = "unidirectional",
  BIDIRECTIONAL = "bidirectional",
}

export enum ConflictSubject {
  RELATIONSHIP = "relationship",
  POWER = "power",
  IDEOLOGY = "ideology",
  RESOURCES = "resources",
  INFORMATION = "information",
  TERRITORY = "territory",
  HONOR = "honor",
  OTHER = "other",
}

export enum ConflictScope {
  PERSONAL = "personal",
  GROUP = "group",
  SOCIETAL = "societal",
}

export enum ConflictPhase {
  EMERGING = "emerging",
  ESCALATING = "escalating",
  PEAK = "peak",
  RESOLVING = "resolving",
  RESOLVED = "resolved",
}

// ---------------------------------------------------------------------------
// Domain entities
// ---------------------------------------------------------------------------

export interface Character {
  id: string;
  name: string;
  description: string;
  profile?: {
    personalityTraits: string;
    motivationsGoals: string;
    potentialArc: string;
  };
  metadata: {
    source: string;
    analysisTimestamp: string;
  };
}

export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  nature: RelationshipNature;
  direction: RelationshipDirection;
  strength: number;
  description: string;
  triggers: string[];
  metadata: {
    source: string;
    inferenceTimestamp: string;
  };
}

export interface Conflict {
  id: string;
  name: string;
  description: string;
  involvedCharacters: string[];
  subject: ConflictSubject;
  scope: ConflictScope;
  phase: ConflictPhase;
  strength: number;
  relatedRelationships: string[];
  pivotPoints: ConflictPivotPoint[];
  timestamps: Date[];
  metadata: {
    source: string;
    inferenceTimestamp: string;
  };
}

export interface CharacterArc {
  characterId: string;
  characterName: string;
  arcType: "positive" | "negative" | "flat" | "transformational" | "fall";
  arcDescription: string;
  keyMoments: { timestamp: Date; description: string; impact: number }[];
  transformation: string;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Conflict network interface
// ---------------------------------------------------------------------------

export interface ConflictNetwork {
  id: string;
  name: string;
  characters: Map<string, Character>;
  relationships: Map<string, Relationship>;
  conflicts: Map<string, Conflict>;
  addCharacter(character: Character): void;
  addRelationship(relationship: Relationship): void;
  addConflict(conflict: Conflict): void;
  createSnapshot(description: string): void;
}

// ---------------------------------------------------------------------------
// Diagnostic report
// ---------------------------------------------------------------------------

export interface DiagnosticReport {
  overallHealthScore: number;
  criticalityLevel: "low" | "medium" | "high" | "critical";
  structuralIssues: string[];
  isolatedCharacters: { totalIsolated: number; characters: string[] };
  abandonedConflicts: { totalAbandoned: number; conflicts: string[] };
  overloadedCharacters: { totalOverloaded: number; characters: string[] };
  weakConnections: { totalWeak: number; connections: string[] };
  redundancies: { totalRedundant: number; items: string[] };
}

// ---------------------------------------------------------------------------
// Station3 IO types
// ---------------------------------------------------------------------------

export interface Station3Context {
  majorCharacters: string[];
  characterProfiles?: Map<string, CharacterProfile>;
  relationshipData?: RelationshipHint[];
  fullText: string;
}

export interface Station3Input extends StationInput {
  station1Output: Station1Output;
  station2Output: Station2Output;
}

export interface Station3Output {
  conflictNetwork: ConflictNetwork;
  networkAnalysis: {
    density: number;
    complexity: number;
    balance: number;
    dynamicRange: number;
  };
  conflictAnalysis: {
    mainConflict: Conflict;
    subConflicts: Conflict[];
    conflictTypes: Map<string, number>;
    intensityProgression: number[];
  };
  characterArcs: Map<string, CharacterArc>;
  pivotPoints: {
    timestamp: string;
    description: string;
    impact: number;
    affectedElements: string[];
  }[];
  diagnosticsReport: DiagnosticReport;
  uncertaintyReport: {
    confidence: number;
    uncertainties: {
      type: "epistemic" | "aleatoric";
      aspect: string;
      note: string;
    }[];
  };
  metadata: {
    analysisTimestamp: Date;
    status: "Success" | "Partial" | "Failed";
    buildTime: number;
    agentsUsed: string[];
  };
}
