import { safeCountMultipleTerms, sumCounts } from "../shared/safe-regexp";

const DIALOGUE_EXTRACT_REGEX = /"[^"]+"/g; // NOSONAR
const ALL_DIALOGUE_EXTRACT_REGEX = /"[^"]+"|«[^»]+»/g; // NOSONAR
const SENTENCE_SPLIT_REGEX = /[.!?]/; // NOSONAR
const SPACES_SPLIT_REGEX = /\s+/; // NOSONAR
const ARABIC_CHAR_REGEX = /^[أ-ي\s]+:/; // NOSONAR
const LATIN_CHAR_REGEX = /^[A-Z\s]+:/; // NOSONAR

export function assessDramaticTension(text: string): number {
  let score = 0.5;

  // Check for conflict indicators
  const conflictWords = [
    "لكن",
    "رغم",
    "ضد",
    "تحدي",
    "صراع",
    "مواجهة",
    "رفض",
    "اعتراض",
  ];
  const conflictCount = safeCountMultipleTerms(text, conflictWords);
  score += Math.min(0.2, sumCounts(conflictCount) * 0.02);

  // Check for emotional intensity
  const emotionalWords = [
    "غضب",
    "خوف",
    "حب",
    "كره",
    "قلق",
    "صدمة",
    "دهشة",
    "!",
  ];
  const emotionCount = safeCountMultipleTerms(text, emotionalWords);
  score += Math.min(0.15, sumCounts(emotionCount) * 0.015);

  // Check for turning points
  const turningWords = ["فجأة", "لحظة", "الآن", "أخيراً", "لا يمكن"];
  const hasTurning = turningWords.some((word) => text.includes(word));
  if (hasTurning) score += 0.15;

  return Math.min(1, score);
}

export function assessDialogueQuality(text: string): number {
  let score = 0.6;

  // Check for dialogue presence
  const hasDialogue =
    text.includes('"') || text.includes("«") || text.includes(":");
  if (!hasDialogue) return 0.3;

  // Check for varied dialogue lengths
  const dialogueMatches = text.match(DIALOGUE_EXTRACT_REGEX) ?? [];
  if (dialogueMatches.length > 0) {
    const lengths = dialogueMatches.map((d) => d.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance =
      lengths.reduce((sum, len) => sum + Math.abs(len - avgLength), 0) /
      lengths.length;

    // Higher variance is better (varied dialogue)
    if (variance > 20) score += 0.2;
  }

  // Check for subtext and implication
  const subtextWords = ["ربما", "يبدو", "أظن", "لعل", "..."];
  const hasSubtext = subtextWords.some((word) => text.includes(word));
  if (hasSubtext) score += 0.2;

  return Math.min(1, score);
}

export function assessVisualClarity(text: string): number {
  let score = 0.5;

  // Check for visual descriptors
  const visualWords = [
    "يرى",
    "ينظر",
    "يشاهد",
    "مشهد",
    "منظر",
    "ضوء",
    "ظلام",
    "لون",
    "حركة",
  ];
  const visualCount = safeCountMultipleTerms(text, visualWords);
  score += Math.min(0.25, sumCounts(visualCount) * 0.025);

  // Check for spatial indicators
  const spatialWords = [
    "أمام",
    "خلف",
    "يمين",
    "يسار",
    "فوق",
    "تحت",
    "بجانب",
    "وسط",
  ];
  const spatialCount = safeCountMultipleTerms(text, spatialWords);
  score += Math.min(0.15, sumCounts(spatialCount) * 0.03);

  // Check for action verbs
  const actionVerbs = [
    "يدخل",
    "يخرج",
    "يقف",
    "يجلس",
    "يمشي",
    "يركض",
    "يلتفت",
    "يمسك",
  ];
  const actionCount = safeCountMultipleTerms(text, actionVerbs);
  score += Math.min(0.1, sumCounts(actionCount) * 0.02);

  return Math.min(1, score);
}

export function assessPacing(text: string): number {
  let score = 0.6;

  // Check sentence variety
  const sentences = text.split(SENTENCE_SPLIT_REGEX);
  const lengths = sentences.map((s) => s.split(SPACES_SPLIT_REGEX).length);

  if (lengths.length > 3) {
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const hasShort = lengths.some((l) => l < avgLength * 0.5);
    const hasLong = lengths.some((l) => l > avgLength * 1.5);

    if (hasShort && hasLong) score += 0.2;
  }

  // Check for rhythm markers
  const rhythmWords = ["ثم", "بعد", "فجأة", "ببطء", "بسرعة", "في الحال"];
  const rhythmCount = safeCountMultipleTerms(text, rhythmWords);
  score += Math.min(0.2, sumCounts(rhythmCount) * 0.04);

  return Math.min(1, score);
}

export function calculateDialoguePercentage(text: string): number {
  const dialogueMatches = text.match(ALL_DIALOGUE_EXTRACT_REGEX) ?? [];
  const dialogueLength = dialogueMatches.join("").length;
  return Math.round((dialogueLength / text.length) * 100);
}

export function countCharactersInScene(text: string): number {
  const characterNames = new Set<string>();
  const lines = text.split("\n");

  for (const line of lines) {
    if (isCharacterName(line)) {
      const name = line.split(":")[0]?.trim();
      if (name) characterNames.add(name);
    }
  }

  return characterNames.size;
}

function isCharacterName(line: string): boolean {
  return ARABIC_CHAR_REGEX.test(line) || LATIN_CHAR_REGEX.test(line);
}
