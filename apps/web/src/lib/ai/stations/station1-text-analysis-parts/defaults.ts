import type { DialogueMetrics, VoiceAnalysis } from "./types";

export function getDefaultDialogueMetrics(): DialogueMetrics {
  return {
    efficiency: 5.0,
    distinctiveness: 5.0,
    naturalness: 5.0,
    subtext: 5.0,
    issues: [],
  };
}

export function getDefaultVoiceAnalysis(): VoiceAnalysis {
  return {
    profiles: new Map(),
    overlapIssues: [],
    overallDistinctiveness: 5.0,
  };
}

export const AGENTS_USED: readonly string[] = Object.freeze([
  "Logline Generator",
  "Character Identifier",
  "Character Deep Analyzer",
  "Dialogue Forensics",
  "Voice Analyzer",
  "Narrative Style Analyzer",
  "Text Statistics Calculator",
]);
