/**
 * Cast Agent Analyzer
 * Analysis functions for character and script processing
 */

import {
  EMOTION_KEYWORDS,
  MALE_PATTERNS,
  FEMALE_PATTERNS,
  GROUP_KEYWORDS,
  ARABIC_TITLES,
} from "./constants";
import { isSceneHeading, isTransition, normalizeArabic } from "./parser";

import type {
  EmotionType,
  EmotionStats,
  GenderAnalysis,
  CharacterProfile,
  MergeSuggestion,
  SceneData,
  Connection,
} from "./types";

// ============================================
// EMOTION ANALYSIS
// ============================================

/**
 * Analyzes text for emotional content and returns emotion statistics
 */
export const analyzeEmotion = (text: string): EmotionStats => {
  const normalized = text.toLowerCase();
  const stats: EmotionStats = {
    neutral: 0,
    positive: 0,
    negative: 0,
    intense: 0,
    mysterious: 0,
    dominant: "neutral",
  };

  Object.entries(EMOTION_KEYWORDS).forEach(([emotion, keywords]) => {
    const count = keywords.filter((kw) =>
      normalized.includes(kw.toLowerCase())
    ).length;
    stats[emotion as EmotionType] = count;
  });

  // Find dominant emotion
  const emotionEntries = Object.entries(stats).filter(
    ([k]) => k !== "dominant"
  ) as [EmotionType, number][];
  const max = Math.max(...emotionEntries.map(([, v]) => v));

  if (max > 0) {
    stats.dominant =
      emotionEntries.find(([, v]) => v === max)?.[0] ?? "neutral";
  }

  return stats;
};

// ============================================
// GENDER ANALYSIS
// ============================================

/**
 * Analyzes script lines for gender indicators and detects conflicts
 */
export const analyzeGenderAndConflict = (
  lines: string[],
  charName: string
): GenderAnalysis => {
  let maleScore = 0;
  let femaleScore = 0;
  let firstDesc = "";

  const normName = normalizeArabic(charName);

  lines.forEach((line) => {
    if (isSceneHeading(line) || isTransition(line)) return;

    if (normalizeArabic(line).includes(normName)) {
      if (!firstDesc) firstDesc = line;
      if (MALE_PATTERNS.some((p) => p.test(line))) maleScore++;
      if (FEMALE_PATTERNS.some((p) => p.test(line))) femaleScore++;
    }
  });

  let gender = "";
  if (maleScore > femaleScore) gender = "ذكر";
  else if (femaleScore > maleScore) gender = "أنثى";

  const total = maleScore + femaleScore;
  const conflict = total > 3 && Math.min(maleScore, femaleScore) / total > 0.25;

  return { gender, conflict, desc: firstDesc };
};

// ============================================
// CHARACTER TAGS GENERATION
// ============================================

/**
 * Generates descriptive tags for a character based on their profile
 */
export const generateCharacterTags = (char: CharacterProfile): string[] => {
  const tags: string[] = [];

  if (char.roleType === "Lead") tags.push("protagonist");
  if (char.dialogueCount > 50) tags.push("talkative");
  if (char.scenes.length > char.scenes.length * 0.5) tags.push("frequent");
  if (char.mentionCount > 10) tags.push("mentioned");
  if (char.genderConflict) tags.push("conflict");
  if (char.isTimeVariant) tags.push("time-variant");

  if (char.scenes.length > 0) {
    const span = char.lastScene - char.firstScene;
    if (span > char.scenes.length * 0.7) tags.push("arc-span");
  }

  return tags;
};

// ============================================
// CONNECTION ANALYSIS
// ============================================

/**
 * Calculates connections between characters based on scene co-appearance
 */
export const calculateConnections = (scenes: SceneData[]): Connection[] => {
  const connections: Connection[] = [];
  const connectionMap = new Map<string, Connection>();

  scenes.forEach((scene) => {
    // Filter out group characters for more meaningful connections
    const chars = scene.characters.filter(
      (c) => !GROUP_KEYWORDS.some((k) => c.includes(k))
    );

    // Create pairwise connections for all characters in scene
    for (let i = 0; i < chars.length; i++) {
      for (let j = i + 1; j < chars.length; j++) {
        const source = chars[i];
        const target = chars[j];
        if (!source || !target) {
          continue;
        }

        const key = [source, target].sort().join("-");
        const existing = connectionMap.get(key);

        if (existing) {
          existing.strength++;
          existing.scenes.push(scene.number);
        } else {
          const conn: Connection = {
            source,
            target,
            strength: 1,
            scenes: [scene.number],
          };
          connectionMap.set(key, conn);
          connections.push(conn);
        }
      }
    }
  });

  return connections.sort((a, b) => b.strength - a.strength);
};

// ============================================
// MERGE SUGGESTIONS
// ============================================

/**
 * Generates suggestions for merging duplicate or related characters
 */
export const generateMergeSuggestions = (
  profiles: CharacterProfile[]
): MergeSuggestion[] => {
  const suggestions: MergeSuggestion[] = [];
  const processed = new Set<string>();
  const sorted = [...profiles].sort((a, b) => b.name.length - a.name.length);

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const long = sorted[i];
      const short = sorted[j];
      if (!long || !short) {
        continue;
      }

      // Skip groups and mysteries
      if (
        long.roleType === "Group" ||
        short.roleType === "Group" ||
        long.roleType === "Mystery" ||
        short.roleType === "Mystery"
      ) {
        continue;
      }

      const key = `${long.id}-${short.id}`;
      if (processed.has(key)) continue;

      // Check for exact normalized match
      if (long.normalizedName === short.normalizedName) {
        suggestions.push({
          sourceId: short.id,
          targetId: long.id,
          reason: "تطابق إملائي (Spelling)",
        });
        processed.add(key);
      }
      // Check for title variations
      else if (long.name.includes(short.name) && short.name.length > 2) {
        const diff = long.name.replace(short.name, "").trim();
        if (ARABIC_TITLES.some((t) => diff.includes(t))) {
          suggestions.push({
            sourceId: short.id,
            targetId: long.id,
            reason: `احتواء اللقب (${diff})`,
          });
          processed.add(key);
        }
      }
    }
  }

  return suggestions;
};
