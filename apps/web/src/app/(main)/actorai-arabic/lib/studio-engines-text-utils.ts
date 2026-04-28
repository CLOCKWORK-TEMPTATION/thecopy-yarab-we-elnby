import type { TempoLevel } from "../types";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

export function meaningfulLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function extractGoalPhrase(text: string): string | null {
  const goalPattern = /(أريد|أحتاج|سأ|لن|يجب|سن|أقسم)\s+([^.!؟\n،]+)/u;
  const match = goalPattern.exec(text);
  return match?.[2]?.trim() ?? null;
}

export function extractSpeakerNames(lines: string[]): string[] {
  const speakers = new Set<string>();
  for (const line of lines) {
    const match = /^([^:]+):$/u.exec(line);
    if (match?.[1]) {
      speakers.add(match[1].trim());
    }
  }
  return [...speakers];
}

export function collectKeywordMatches(
  text: string,
  keywords: readonly string[]
): string[] {
  const matches = new Set<string>();
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      matches.add(keyword);
    }
  }
  return [...matches];
}

export function buildIntensity(line: string, index: number): number {
  const punctuationBoost = (line.match(/[!؟]/g) ?? []).length * 12;
  const emotionalBoost =
    collectKeywordMatches(line, [
      "حب",
      "خوف",
      "حقيقة",
      "غضب",
      "أمل",
      "وعد",
      "لن",
      "لا",
    ]).length * 10;

  return clamp(32 + punctuationBoost + emotionalBoost + index * 9, 25, 96);
}

export function pickEmotion(line: string): string {
  if (line.includes("حب") || line.includes("قلب")) return "حب";
  if (line.includes("خوف") || line.includes("خائفة")) return "خوف";
  if (line.includes("حقيقة") || line.includes("أعترف")) return "مواجهة";
  if (line.includes("أمل") || line.includes("سنجد")) return "أمل";
  if (line.includes("لن") || line.includes("لا")) return "توتر";
  return "ترقب";
}

export function tempoFromLine(line: string): TempoLevel {
  const wordCount = line.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 3) return "slow";
  if (wordCount <= 8) return "medium";
  if (wordCount <= 14) return "fast";
  return "very-fast";
}
