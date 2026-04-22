/**
 * Cast Agent Module
 *
 * Refactored script analysis system with clear separation of concerns:
 * - constants.ts: Configuration and NLP keyword lists
 * - types.ts: TypeScript type definitions
 * - parser.ts: Text parsing and NLP helper functions
 * - analyzer.ts: Character and emotion analysis functions
 * - scriptAnalyzer.ts: Main local analysis engine
 * - aiAgent.ts: Google GenAI integration
 * - exporter.ts: Export format generators
 */

// ============================================
// TYPE EXPORTS
// ============================================

export type {
  RoleCategory,
  ViewMode,
  SortOption,
  EmotionType,
  EmotionStats,
  CharacterProfile,
  CharacterStats,
  SceneData,
  AnalysisResult,
  MergeSuggestion,
  OverallStats,
  Connection,
  CastAgentOptions,
  ParsedName,
  GenderAnalysis,
  SceneLocation,
} from "./types";

// ============================================
// CONSTANT EXPORTS
// ============================================

export {
  GROUP_KEYWORDS,
  GENERIC_KEYWORDS,
  TRANSITIONS,
  TECHNICAL_EXTENSIONS,
  ARABIC_TITLES,
  EMOTION_KEYWORDS,
  MALE_PATTERNS,
  FEMALE_PATTERNS,
  CHARACTER_COLORS,
  ROLE_COLORS,
  DEFAULT_CAST_MODEL,
} from "./constants";

// ============================================
// PARSER EXPORTS
// ============================================

export {
  normalizeArabic,
  countWords,
  isSceneHeading,
  isTransition,
  isComment,
  parseNameHeader,
  isLikelyCharacter,
  extractSceneLocation,
  scanForMentions,
} from "./parser";

// ============================================
// ANALYZER EXPORTS
// ============================================

export {
  analyzeEmotion,
  analyzeGenderAndConflict,
  generateCharacterTags,
  calculateConnections,
  generateMergeSuggestions,
} from "./analyzer";

// ============================================
// SCRIPT ANALYZER EXPORTS
// ============================================

export { analyzeScriptLocal } from "./scriptAnalyzer";

// ============================================
// AI AGENT EXPORTS
// ============================================

export { runCastAgent } from "./aiAgent";

// ============================================
// EXPORTER EXPORTS
// ============================================

export {
  exportToCSV,
  exportToJSON,
  exportToTXT,
  generateCastingCall,
  downloadFile,
} from "./exporter";
