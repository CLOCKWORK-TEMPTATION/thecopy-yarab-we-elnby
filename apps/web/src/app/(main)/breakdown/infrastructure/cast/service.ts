import { runCastAgent } from "./local";
import {
  calculateAgeRanges,
  generateCastInsights,
  generateCastWarnings,
} from "./utils/insights";

import type {
  ExtendedCastMember,
  CastAnalysisOptions,
  CastAnalysisResult,
} from "../../domain/models";

// Re-export utility functions
export { normalizeArabic, editDistance, isSameCharacter } from "./utils/text";
export type { GenderAnalysis } from "./utils/gender-analysis";
export { analyzeGender } from "./utils/gender-analysis";
export type { EmotionAnalysis, EmotionType } from "./utils/emotion-analysis";
export { analyzeEmotion } from "./utils/emotion-analysis";
export type { ArcAnalysis, ArcType } from "./utils/arc-analysis";
export { analyzeCharacterArc } from "./utils/arc-analysis";
export type { SceneMetadata } from "./utils/scene-metadata";
export { extractSceneMetadata } from "./utils/scene-metadata";
export {
  exportCastToCSV,
  exportCastToJSON,
  generateCastingCall,
} from "./utils/export";
export { normalizeCastMember } from "./utils/validation";

// Types are now re-exported from utils modules above

// ============================================
// MAIN AI CAST ANALYSIS
// ============================================

/**
 * Wrapper for the Cast Agent (Backward compatibility or Service layer abstraction)
 */
export const analyzeCast = async (
  sceneContent: string,
  options: CastAnalysisOptions = {}
): Promise<ExtendedCastMember[]> => {
  return runCastAgent(sceneContent, options);
};

/**
 * Enhanced Cast Analysis with full breakdown.
 * Returns comprehensive analysis including summary, insights, and warnings.
 */
export const analyzeCastEnhanced = async (
  sceneContent: string,
  options: CastAnalysisOptions = {}
): Promise<CastAnalysisResult> => {
  const members = await analyzeCast(sceneContent, options);

  // Calculate summary statistics
  const summary = {
    totalCharacters: members.length,
    leadCount: members.filter(
      (m: ExtendedCastMember) => m.roleCategory === "Lead"
    ).length,
    supportingCount: members.filter(
      (m: ExtendedCastMember) => m.roleCategory === "Supporting"
    ).length,
    maleCount: members.filter((m: ExtendedCastMember) => m.gender === "Male")
      .length,
    femaleCount: members.filter(
      (m: ExtendedCastMember) => m.gender === "Female"
    ).length,
    estimatedAgeRanges: calculateAgeRanges(members),
  };

  // Generate insights based on cast composition
  const insights = generateCastInsights(members, summary);

  // Generate warnings for potential issues
  const warnings = generateCastWarnings(members);

  return {
    members,
    summary,
    insights,
    warnings,
  };
};

// Helper functions are now imported from ./utils/insights.ts
