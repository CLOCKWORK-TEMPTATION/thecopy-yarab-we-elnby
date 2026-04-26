/**
 * Cast Agent Script Analyzer
 * Main analysis engine broken into focused, testable functions
 */

import {
  analyzeEmotion,
  analyzeGenderAndConflict,
  generateCharacterTags,
  calculateConnections,
  generateMergeSuggestions,
} from "./analyzer";
import { GROUP_KEYWORDS, GENERIC_KEYWORDS, ROLE_COLORS } from "./constants";
import {
  normalizeArabic,
  countWords,
  isSceneHeading,
  isTransition,
  isComment,
  isLikelyCharacter,
  parseNameHeader,
  extractSceneLocation,
  scanForMentions,
} from "./parser";

import type {
  RoleCategory,
  CharacterProfile,
  CharacterStats,
  SceneData,
  AnalysisResult,
  OverallStats,
  EmotionStats,
} from "./types";

// ============================================
// PASS 1: ACTIVE CHARACTER DETECTION
// ============================================

interface Pass1Result {
  scenes: SceneData[];
  charMap: Map<string, CharacterStats>;
  dialogueMap: Map<string, string[]>;
  potentialNames: Set<string>;
  lastSceneNum: number;
}

/**
 * First pass: Detect active characters and build initial scene list
 */
function detectActiveCharacters(lines: string[]): Pass1Result {
  const scenes: SceneData[] = [];
  const charMap = new Map<string, CharacterStats>();
  const dialogueMap = new Map<string, string[]>();
  const potentialNames = new Set<string>();

  let currentSceneNum = 0;
  let currentScene: SceneData = {
    number: 0,
    heading: "START",
    characters: [],
    mentioned: [],
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const nextLine = lines[i + 1] ?? "";

    if (isComment(line)) continue;

    if (isSceneHeading(line)) {
      // Save previous scene if it has content
      if (currentScene.number > 0 || currentScene.characters.length > 0) {
        scenes.push({ ...currentScene });
      }
      currentSceneNum++;
      const { location, timeOfDay } = extractSceneLocation(line);
      currentScene = {
        number: currentSceneNum,
        heading: line.trim(),
        characters: [],
        mentioned: [],
        ...(location ? { location } : {}),
        ...(timeOfDay ? { timeOfDay } : {}),
      };
    } else if (isLikelyCharacter(line, nextLine)) {
      const { name: parsedName, isVariant } = parseNameHeader(line);
      potentialNames.add(parsedName);

      if (!currentScene.characters.includes(parsedName)) {
        currentScene.characters.push(parsedName);
      }

      // Update or create character stats
      const stats = charMap.get(parsedName) ?? createEmptyStats(isVariant);
      stats.dialogueCount++;
      stats.wordCount += countWords(nextLine);
      stats.activeScenes.add(currentSceneNum || 1);
      charMap.set(parsedName, stats);

      // Store dialogue for emotion analysis
      if (!dialogueMap.has(parsedName)) {
        dialogueMap.set(parsedName, []);
      }
      dialogueMap.get(parsedName)!.push(nextLine);
    }
  }

  // Push final scene
  scenes.push(currentScene);

  return {
    scenes,
    charMap,
    dialogueMap,
    potentialNames,
    lastSceneNum: currentSceneNum,
  };
}

/**
 * Create empty character stats object
 */
function createEmptyStats(isVariant: boolean): CharacterStats {
  return {
    dialogueCount: 0,
    wordCount: 0,
    mentionCount: 0,
    activeScenes: new Set(),
    mentionedScenes: new Set(),
    isVariant,
  };
}

// ============================================
// PASS 2: MENTION & ACTION SCAN
// ============================================

/**
 * Second pass: Scan for character mentions in action lines
 */
function scanMentionsAndActions(
  lines: string[],
  nameList: string[],
  charMap: Map<string, CharacterStats>,
  scenes: SceneData[]
): void {
  let currentSceneNum = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    if (isSceneHeading(line)) {
      currentSceneNum++;
      continue;
    }
    if (isTransition(line) || isComment(line)) continue;

    const isHeader = isLikelyCharacter(line, lines[i + 1] ?? "");

    if (!isHeader) {
      const foundNames = scanForMentions(line, nameList);
      foundNames.forEach((name) => {
        processFoundMention(name, i, lines, currentSceneNum, charMap, scenes);
      });
    }
  }
}

/**
 * Process a found character mention
 */
function processFoundMention(
  name: string,
  lineIndex: number,
  lines: string[],
  sceneNum: number,
  charMap: Map<string, CharacterStats>,
  scenes: SceneData[]
): void {
  const previousLine = lineIndex > 0 ? (lines[lineIndex - 1] ?? "") : "";
  const currentLine = lines[lineIndex] ?? "";
  const prevIsHeader =
    lineIndex > 0 && isLikelyCharacter(previousLine, currentLine);
  const stats = charMap.get(name);

  if (!stats) return;

  const effectiveSceneNum = sceneNum || 1;

  if (prevIsHeader) {
    // This is dialogue attribution, count as mention
    stats.mentionCount++;
    if (!stats.activeScenes.has(effectiveSceneNum)) {
      stats.mentionedScenes.add(effectiveSceneNum);
      addToSceneMentioned(name, effectiveSceneNum, scenes);
    }
  } else {
    // This is action line presence
    if (!stats.activeScenes.has(effectiveSceneNum)) {
      stats.activeScenes.add(effectiveSceneNum);
      addToSceneCharacters(name, effectiveSceneNum, scenes);
    }
  }
}

/**
 * Add character to scene's mentioned list
 */
function addToSceneMentioned(
  name: string,
  sceneNum: number,
  scenes: SceneData[]
): void {
  const scene = scenes.find((s) => s.number === sceneNum);
  if (
    scene &&
    !scene.characters.includes(name) &&
    !scene.mentioned.includes(name)
  ) {
    scene.mentioned.push(name);
  }
}

/**
 * Add character to scene's active characters list
 */
function addToSceneCharacters(
  name: string,
  sceneNum: number,
  scenes: SceneData[]
): void {
  const scene = scenes.find((s) => s.number === sceneNum);
  if (scene && !scene.characters.includes(name)) {
    scene.characters.push(name);
    scene.mentioned = scene.mentioned.filter((n) => n !== name);
  }
}

// ============================================
// PASS 3: PROFILE BUILDING
// ============================================

/**
 * Build final character profiles from collected data
 */
function buildCharacterProfiles(
  lines: string[],
  charMap: Map<string, CharacterStats>,
  dialogueMap: Map<string, string[]>,
  totalScenes: number
): CharacterProfile[] {
  const profiles: CharacterProfile[] = [];

  // Calculate max word count for importance normalization
  let maxWords = 0;
  charMap.forEach((s) => {
    if (s.wordCount > maxWords) maxWords = s.wordCount;
  });

  charMap.forEach((stats, name) => {
    const profile = buildSingleProfile(
      name,
      stats,
      lines,
      dialogueMap,
      totalScenes,
      maxWords
    );
    profiles.push(profile);
  });

  return profiles.sort((a, b) => b.importanceScore - a.importanceScore);
}

/**
 * Build a single character profile
 */
function buildSingleProfile(
  name: string,
  stats: CharacterStats,
  lines: string[],
  dialogueMap: Map<string, string[]>,
  totalScenes: number,
  maxWords: number
): CharacterProfile {
  // Character classification
  const isGroup = GROUP_KEYWORDS.some((k) => name.includes(k));
  const isGeneric = GENERIC_KEYWORDS.some(
    (k) => name === k || name === `THE ${k}` || name === `ال${k}`
  );

  // Gender analysis
  const { gender, conflict, desc } = analyzeGenderAndConflict(lines, name);

  // Emotion analysis from dialogue
  const dialogueText = dialogueMap.get(name)?.join(" ") ?? "";
  const emotions = analyzeEmotion(dialogueText);

  // Calculate importance and role
  const { roleType, importanceScore } = calculateRoleAndImportance(
    stats,
    totalScenes,
    maxWords,
    isGroup,
    isGeneric
  );

  // Build scene arrays
  const activeSceneArr = Array.from(stats.activeScenes).sort((a, b) => a - b);
  const mentionedSceneArr = Array.from(stats.mentionedScenes).sort(
    (a, b) => a - b
  );
  const allScenes = [...activeSceneArr, ...mentionedSceneArr].sort(
    (a, b) => a - b
  );

  // Create profile skeleton for tag generation
  const profileSkeleton: CharacterProfile = {
    id: name,
    name,
    normalizedName: normalizeArabic(name),
    age: "",
    gender,
    roleType,
    description: desc,
    dialogueCount: stats.dialogueCount,
    wordCount: stats.wordCount,
    mentionCount: stats.mentionCount,
    scenes: activeSceneArr,
    mentionedScenes: mentionedSceneArr,
    firstScene: allScenes[0] ?? 0,
    lastScene: allScenes[allScenes.length - 1] ?? 0,
    importanceScore,
    aliases: [],
    isTimeVariant: stats.isVariant,
    genderConflict: conflict,
    emotions,
    tags: [],
  };

  // Generate tags and assign color
  const tags = generateCharacterTags(profileSkeleton);
  const color = ROLE_COLORS[roleType] ?? "#64748b";

  return {
    ...profileSkeleton,
    tags,
    color,
  };
}

/**
 * Calculate role type and importance score
 */
function calculateRoleAndImportance(
  stats: CharacterStats,
  totalScenes: number,
  maxWords: number,
  isGroup: boolean,
  isGeneric: boolean
): { roleType: RoleCategory; importanceScore: number } {
  const activeCount = stats.activeScenes.size;
  const presenceScore = (activeCount / totalScenes) * 40;
  const volumeScore = (stats.wordCount / (maxWords || 1)) * 30;
  const mentionBonus = Math.min(stats.mentionCount * 0.5, 10);
  const importanceScore = presenceScore + volumeScore + mentionBonus;

  let roleType: RoleCategory = "Bit Part";

  if (stats.dialogueCount === 0 && activeCount === 0) {
    roleType = "Mentioned";
  } else if (stats.dialogueCount === 0 && activeCount > 0) {
    roleType = "Silent";
  } else if (isGroup) {
    roleType = "Group";
  } else if (isGeneric) {
    roleType = "Mystery";
  } else if (importanceScore > 35) {
    roleType = "Lead";
  } else if (importanceScore > 10) {
    roleType = "Supporting";
  }

  return { roleType, importanceScore };
}

// ============================================
// STATISTICS CALCULATION
// ============================================

/**
 * Calculate overall script statistics
 */
function calculateOverallStats(
  profiles: CharacterProfile[],
  scenes: SceneData[],
  connectionCount: number
): OverallStats {
  const emptyEmotion: EmotionStats = {
    neutral: 0,
    positive: 0,
    negative: 0,
    intense: 0,
    mysterious: 0,
    dominant: "neutral",
  };

  return {
    totalCharacters: profiles.length,
    totalDialogue: profiles.reduce((sum, c) => sum + c.dialogueCount, 0),
    avgSceneLength:
      profiles.reduce((sum, c) => sum + c.scenes.length, 0) /
      (profiles.length || 1),
    genderDistribution: {
      male: profiles.filter((c) => c.gender === "ذكر").length,
      female: profiles.filter((c) => c.gender === "أنثى").length,
      unknown: profiles.filter((c) => !c.gender).length,
    },
    emotionDistribution: emptyEmotion,
    mostActiveScene: Math.max(...scenes.map((s) => s.characters.length)),
    characterConnections: connectionCount,
  };
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

/**
 * Analyzes script text and extracts character information using local NLP.
 * No API key required - uses pattern matching and linguistic analysis.
 *
 * The analysis happens in three passes:
 * 1. Detect active characters from dialogue headers
 * 2. Scan for character mentions in action lines
 * 3. Build detailed profiles with emotions, tags, and connections
 */
export const analyzeScriptLocal = (scriptText: string): AnalysisResult => {
  const lines = scriptText.split("\n");

  // Pass 1: Detect active characters
  const pass1 = detectActiveCharacters(lines);

  // Pass 2: Scan for mentions in action lines
  const nameList = Array.from(pass1.potentialNames);
  scanMentionsAndActions(lines, nameList, pass1.charMap, pass1.scenes);

  // Pass 3: Build profiles
  const totalScenes = pass1.lastSceneNum || 1;
  const profiles = buildCharacterProfiles(
    lines,
    pass1.charMap,
    pass1.dialogueMap,
    totalScenes
  );

  // Post-processing
  const suggestions = generateMergeSuggestions(profiles);
  const connections = calculateConnections(pass1.scenes);
  const stats = calculateOverallStats(
    profiles,
    pass1.scenes,
    connections.length
  );

  return {
    characters: profiles,
    scenes: pass1.scenes,
    totalScenes: pass1.lastSceneNum,
    suggestions,
    stats,
  };
};
