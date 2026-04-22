/**
 * Cast Agent Types
 * Type definitions for script analysis
 */

// ============================================
// ENUMS & LITERALS
// ============================================

export type RoleCategory =
  | "Lead"
  | "Supporting"
  | "Bit Part"
  | "Silent"
  | "Group"
  | "Mentioned"
  | "Mystery";
export type ViewMode = "grid" | "list" | "stats" | "network" | "timeline";
export type SortOption =
  | "importance"
  | "name"
  | "scenes"
  | "dialogue"
  | "alpha";
export type EmotionType =
  | "neutral"
  | "positive"
  | "negative"
  | "intense"
  | "mysterious";

// ============================================
// EMOTION TYPES
// ============================================

export interface EmotionStats {
  neutral: number;
  positive: number;
  negative: number;
  intense: number;
  mysterious: number;
  dominant: EmotionType;
}

// ============================================
// CHARACTER TYPES
// ============================================

export interface CharacterProfile {
  id: string;
  name: string;
  normalizedName: string;
  age: string;
  gender: string;
  roleType: RoleCategory;
  description: string;
  dialogueCount: number;
  wordCount: number;
  mentionCount: number;
  scenes: number[];
  mentionedScenes: number[];
  firstScene: number;
  lastScene: number;
  importanceScore: number;
  aliases: string[];
  isTimeVariant?: boolean;
  genderConflict?: boolean;
  emotions?: EmotionStats;
  tags?: string[];
  notes?: string;
  color?: string;
}

export interface CharacterStats {
  dialogueCount: number;
  wordCount: number;
  mentionCount: number;
  activeScenes: Set<number>;
  mentionedScenes: Set<number>;
  isVariant: boolean;
}

// ============================================
// SCENE TYPES
// ============================================

export interface SceneData {
  number: number;
  heading: string;
  characters: string[];
  mentioned: string[];
  location?: string;
  timeOfDay?: string;
  pageEstimate?: number;
}

// ============================================
// ANALYSIS TYPES
// ============================================

export interface AnalysisResult {
  characters: CharacterProfile[];
  scenes: SceneData[];
  totalScenes: number;
  suggestions: MergeSuggestion[];
  stats?: OverallStats;
}

export interface MergeSuggestion {
  sourceId: string;
  targetId: string;
  reason: string;
}

export interface OverallStats {
  totalCharacters: number;
  totalDialogue: number;
  avgSceneLength: number;
  genderDistribution: { male: number; female: number; unknown: number };
  emotionDistribution: EmotionStats;
  mostActiveScene: number;
  characterConnections: number;
}

export interface Connection {
  source: string;
  target: string;
  strength: number;
  scenes: number[];
}

// ============================================
// CONFIGURATION TYPES
// ============================================

export interface CastAgentOptions {
  apiKey?: string;
  model?: string;
}

// ============================================
// PARSER RESULT TYPES
// ============================================

export interface ParsedName {
  name: string;
  isVariant: boolean;
}

export interface GenderAnalysis {
  gender: string;
  conflict: boolean;
  desc: string;
}

export interface SceneLocation {
  location?: string;
  timeOfDay?: string;
}
