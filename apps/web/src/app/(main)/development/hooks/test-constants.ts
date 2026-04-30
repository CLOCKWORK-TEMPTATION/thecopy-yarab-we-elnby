// @vitest-environment jsdom
/**
 * @fileoverview Test constants for useCreativeDevelopment hook tests
 */

/**
 * These are the 16 brainstorm task ids listed in the task requirements.
 * Each must have executionMode === "brainstorm" in the catalog.
 */
export const BRAINSTORM_TASK_IDS = [
  "completion",
  "creative",
  "analysis",
  "adaptive-rewriting",
  "scene-generator",
  "character-voice",
  "world-builder",
  "rhythm-mapping",
  "character-network",
  "dialogue-forensics",
  "thematic-mining",
  "style-fingerprint",
  "conflict-dynamics",
  "plot-predictor",
  "tension-optimizer",
  "audience-resonance",
  "platform-adapter",
] as const;

/**
 * Minimum text length required for analysis unlock
 */
export const MIN_TEXT_LENGTH = 160;

/**
 * Minimum report length required for unlock
 */
export const MIN_REPORT_LENGTH = 100;
