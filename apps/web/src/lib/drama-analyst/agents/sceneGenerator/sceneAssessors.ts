import { safeCountMultipleTerms } from "@/lib/security/safe-regexp";

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
  // SECURITY FIX: Use safe RegExp utility to prevent injection
  const conflictCount = safeCountMultipleTerms(text, conflictWords);
  score += Math.min(0.2, conflictCount * 0.02);

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
  // SECURITY FIX: Use safe RegExp utility to prevent injection
  const emotionCount = safeCountMultipleTerms(text, emotionalWords);
  score += Math.min(0.15, emotionCount * 0.015);

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
  const dialogueMatches = text.match(/"[^"]+"/g) ?? [];
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
  // SECURITY FIX: Use safe RegExp utility to prevent injection
  const visualCount = safeCountMultipleTerms(text, visualWords);
  score += Math.min(0.25, visualCount * 0.025);

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
  // SECURITY FIX: Use safe RegExp utility to prevent injection
  const spatialCount = safeCountMultipleTerms(text, spatialWords);
  score += Math.min(0.15, spatialCount * 0.03);

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
  // SECURITY FIX: Use safe RegExp utility to prevent injection
  const actionCount = safeCountMultipleTerms(text, actionVerbs);
  score += Math.min(0.1, actionCount * 0.02);

  return Math.min(1, score);
}

export function assessPacing(text: string): number {
  let score = 0.6;

  // Check sentence variety
  const sentences = text.split(/[.!?]/);
  const lengths = sentences.map((s) => s.split(/\s+/).length);

  if (lengths.length > 3) {
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const hasShort = lengths.some((l) => l < avgLength * 0.5);
    const hasLong = lengths.some((l) => l > avgLength * 1.5);

    if (hasShort && hasLong) score += 0.2; // Good variety
  }

  // Check for rhythm markers
  const rhythmWords = ["ثم", "بعد", "فجأة", "ببطء", "بسرعة", "في الحال"];
  // SECURITY FIX: Use safe RegExp utility to prevent injection
  const rhythmCount = safeCountMultipleTerms(text, rhythmWords);
  score += Math.min(0.2, rhythmCount * 0.04);

  return Math.min(1, score);
}

export function calculateDialoguePercentage(text: string): number {
  const dialogueMatches = text.match(/"[^"]+"|«[^»]+»/g) ?? [];
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
  return /^[أ-ي\s]+:/.test(line) || /^[A-Z\s]+:/.test(line);
}
