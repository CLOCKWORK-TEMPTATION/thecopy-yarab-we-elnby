// Base Entity Models for AI Analysis

export interface Character {
  id: string;
  name: string;
  role?: string;
  traits?: string[];
  relationships?: string[];
  arc?: string;
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

export interface Relationship {
  id?: string;
  source: string;
  target: string;
  type?: string;
  strength?: number;
}

export interface NetworkSnapshot {
  timestamp: Date;
  characters: Character[];
  relationships: Relationship[];
  conflicts: Conflict[];
  metrics: {
    density: number;
    centrality: Record<string, number>;
    clustering: number;
  };
}

export interface ConflictPhase {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  intensity: number;
  participants: string[];
  description: string;
}

export interface ConflictNetwork {
  characters: Map<string, Character>;
  relationships: Map<string, Relationship>;
  conflicts?: Map<string, Conflict>;
  snapshots?: NetworkSnapshot[];
  phases?: ConflictPhase[];
}

export interface Scene {
  id: string;
  title: string;
  location: string;
  timeOfDay: string;
  characters: string[];
  description?: string;
  conflicts?: string[];
}

export interface ThematicElement {
  id: string;
  name: string;
  category: "theme" | "motif" | "symbol";
  description: string;
  occurrences: Array<{
    location: string;
    context: string;
    intensity: number;
  }>;
}

export interface AnalysisMetadata {
  timestamp: Date;
  version: string;
  model: string;
  confidence: number;
  processingTime: number;
}

// Station and System Metadata
export interface StationMetadata {
  stationName: string;
  stationNumber: number;
  status: "Success" | "Failed" | "Partial";
  error?: string;
  executionTime: number;
  agentsUsed: string[];
  tokensUsed: number;
  options?: Record<string, unknown>;
  ragInfo?: {
    wasChunked: boolean;
    chunksCount: number;
    retrievalTime: number;
  };
}

export interface SystemMetadata {
  systemName: string;
  systemType: string;
  status: "Success" | "Failed" | "Partial";
  error?: string;
  executionTime: number;
  agentsUsed: string[];
  tokensUsed: number;
  options?: Record<string, unknown>;
  ragInfo?: {
    wasChunked: boolean;
    chunksCount: number;
    retrievalTime: number;
  };
}

// Analysis Types
export interface CharacterAnalysis {
  motivations: string[];
  flaws: string[];
  strengths: string[];
  arc: string;
  relationships: Record<string, string>;
}

export interface DialogueAnalysis {
  naturalness: number;
  characterVoiceConsistency: number;
  subtextPresence: number;
  pacing: string;
  issues: string[];
}

export interface UncertaintyReport {
  overallConfidence: number;
  uncertaintyType: "epistemic" | "aleatoric";
  sources: Array<{
    aspect: string;
    reason: string;
    reducible: boolean;
  }>;
}

// Thematic and Audience Types
export interface Theme {
  name: string;
  description: string;
  prominence: number;
  evidence: string[];
}

export interface AudienceProfile {
  primaryDemographic: string;
  ageRange: string;
  interests: string[];
  culturalBackground: string;
  expectedReception: string;
}

export interface ScoreMatrix {
  narrative: number;
  character: number;
  structure: number;
  theme: number;
  technical: number;
  commercial: number;
  overall: number;
}

export interface Recommendation {
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  implementation: string;
  expectedImpact: number;
}

export interface DebateResult {
  participants: string[];
  rounds: Array<{
    speaker: string;
    argument: string;
    counterArguments: string[];
  }>;
  consensus: string;
  disagreements: string[];
  finalRecommendations: Recommendation[];
}

// Factory functions
export function createCharacter(data: Partial<Character>): Character {
  const character: Character = {
    id: data.id || `char_${Date.now()}`,
    name: data.name || "Unknown Character",
  };

  if (data.role !== undefined) character.role = data.role;
  if (data.traits !== undefined) character.traits = data.traits;
  if (data.relationships !== undefined)
    character.relationships = data.relationships;
  if (data.arc !== undefined) character.arc = data.arc;

  return character;
}

export function createConflict(data: Partial<Conflict>): Conflict {
  const conflict: Conflict = {};

  if (data.id !== undefined) conflict.id = data.id;
  if (data.name !== undefined) conflict.name = data.name;
  if (data.type !== undefined) conflict.type = data.type;
  if (data.subject !== undefined) conflict.subject = data.subject;
  if (data.strength !== undefined) conflict.strength = data.strength;
  if (data.scope !== undefined) conflict.scope = data.scope;
  if (data.involvedCharacters !== undefined)
    conflict.involvedCharacters = data.involvedCharacters;
  if (data.timestamps !== undefined) conflict.timestamps = data.timestamps;
  if (data.description !== undefined) conflict.description = data.description;
  if (data.participants !== undefined)
    conflict.participants = data.participants;

  return conflict;
}

export function createRelationship(data: Partial<Relationship>): Relationship {
  const relationship: Relationship = {
    source: data.source || "",
    target: data.target || "",
  };

  if (data.id !== undefined) relationship.id = data.id;
  if (data.type !== undefined) relationship.type = data.type;
  if (data.strength !== undefined) relationship.strength = data.strength;

  return relationship;
}

export function createNetworkSnapshot(
  data: Partial<NetworkSnapshot>
): NetworkSnapshot {
  return {
    timestamp: data.timestamp || new Date(),
    characters: data.characters || [],
    relationships: data.relationships || [],
    conflicts: data.conflicts || [],
    metrics: data.metrics || {
      density: 0,
      centrality: {},
      clustering: 0,
    },
  };
}
