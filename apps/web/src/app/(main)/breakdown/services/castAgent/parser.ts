/**
 * Cast Agent Parser
 * Text parsing and NLP helper functions for script analysis
 */

import { TRANSITIONS, TECHNICAL_EXTENSIONS, ARABIC_TITLES } from "./constants";

import type { ParsedName, SceneLocation } from "./types";

// ============================================
// TEXT NORMALIZATION
// ============================================

/**
 * Normalizes Arabic text for accurate matching by removing diacritics,
 * tatweel, and standardizing letter forms
 */
export const normalizeArabic = (text: string): string => {
  if (!text) return "";
  let normalized = text;
  normalized = normalized.replace(/\u0640/g, ""); // Remove tatweel
  normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, ""); // Remove diacritics
  normalized = normalized.replace(/[أإآ]/g, "ا");
  normalized = normalized.replace(/ى/g, "ي");
  normalized = normalized.replace(/ة/g, "ه");
  return normalized.trim().toUpperCase();
};

/**
 * Counts words in text
 */
export const countWords = (text: string): number => {
  return text.trim().split(/\s+/).length;
};

// ============================================
// LINE TYPE DETECTION
// ============================================

/**
 * Checks if a line is a scene heading (slug line)
 */
export const isSceneHeading = (line: string): boolean => {
  const upperLine = line.trim().toUpperCase();
  const patterns = [
    /^INT\./,
    /^EXT\./,
    /^I\/E\./,
    /^INT\/EXT/,
    /^DAKHEL/,
    /^KHAREG/,
    /^مشهد/,
    /^داخلي/,
    /^خارجي/,
    /^ليل/,
    /^نهار/,
    /^\d+\s*[-.]/,
  ];
  return patterns.some((pattern) => pattern.test(upperLine));
};

/**
 * Checks if a line is a transition (CUT TO, FADE OUT, etc.)
 */
export const isTransition = (line: string): boolean => {
  const upper = line.trim().toUpperCase();
  return TRANSITIONS.some(
    (t) => upper.startsWith(t) || upper.endsWith(t.replace(":", ""))
  );
};

/**
 * Checks if a line is a comment or annotation
 */
export const isComment = (line: string): boolean => {
  const trim = line.trim();
  return (
    trim.startsWith("//") ||
    trim.startsWith("[[") ||
    (trim.startsWith("(") && trim.endsWith(")"))
  );
};

// ============================================
// CHARACTER NAME PARSING
// ============================================

/**
 * Parses character name from a script header line, handling technical
 * extensions like (V.O), (O.S), (CONT'D), etc.
 */
export const parseNameHeader = (line: string): ParsedName => {
  let raw = line.trim();
  const parenMatch = /\((.*?)\)/.exec(raw);
  let isVariant = false;

  if (parenMatch) {
    const content = parenMatch[1]?.toUpperCase().trim() ?? "";
    const isTech = TECHNICAL_EXTENSIONS.some(
      (ext) => content.includes(ext) || content === ext
    );
    if (isTech) {
      raw = raw.replace(/\(.*?\)/, "").trim();
    } else {
      isVariant = true;
    }
  }

  raw = raw.replace(/[:-]$/, "").trim();
  raw = raw.replace(/^[.*-]+/, "").trim();

  return { name: raw.toUpperCase(), isVariant };
};

/**
 * Determines if a line is likely a character name header based on
 * formatting conventions and context
 */
export const isLikelyCharacter = (line: string, nextLine: string): boolean => {
  const trimmed = line.trim();
  const nextTrimmed = nextLine ? nextLine.trim() : "";

  // Exclude non-character lines
  if (
    !trimmed ||
    isSceneHeading(line) ||
    isTransition(line) ||
    isComment(line)
  ) {
    return false;
  }
  if (trimmed.length > 40) return false;

  // Check various character name patterns
  const isAllUpper = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
  const isArabicName = /[\u0600-\u06FF]/.test(trimmed);
  const startsWithTitle = ARABIC_TITLES.some((t) =>
    trimmed.startsWith(t + " ")
  );

  const isShortLine = trimmed.length < 30 && trimmed.split(" ").length <= 5;
  const nextIsDialogue =
    nextTrimmed.length > 0 &&
    !isSceneHeading(nextTrimmed) &&
    !isTransition(nextTrimmed);
  const hasNumber = /\d/.test(trimmed);

  return (
    (isAllUpper || isArabicName || startsWithTitle || hasNumber) &&
    isShortLine &&
    nextIsDialogue
  );
};

// ============================================
// SCENE PARSING
// ============================================

/**
 * Extracts location and time of day from a scene heading
 */
export const extractSceneLocation = (heading: string): SceneLocation => {
  const upper = heading.toUpperCase();
  let timeOfDay = "unknown";
  let location = "unknown";

  // Time of day detection
  if (
    upper.includes("NIGHT") ||
    upper.includes("ليلا") ||
    upper.includes("ليل")
  ) {
    timeOfDay = "night";
  } else if (
    upper.includes("DAY") ||
    upper.includes("نهار") ||
    upper.includes("صباح")
  ) {
    timeOfDay = "day";
  } else if (upper.includes("MORNING") || upper.includes("صباحا")) {
    timeOfDay = "morning";
  } else if (upper.includes("EVENING") || upper.includes("مساء")) {
    timeOfDay = "evening";
  } else if (upper.includes("SUNSET") || upper.includes("غروب")) {
    timeOfDay = "sunset";
  } else if (upper.includes("DAWN") || upper.includes("فجر")) {
    timeOfDay = "dawn";
  }

  // Location extraction
  const locationMatch =
    /(?:INT\.|EXT\.|DAKHEL|KHAREG|داخلي|خارجي)\s*(.+?)(?:\s*-\s*[A-Z]+)?$/.exec(
      heading
    );
  if (locationMatch?.[1]) {
    location = locationMatch[1].trim();
  }

  return { location, timeOfDay };
};

// ============================================
// MENTION SCANNING
// ============================================

/**
 * Scans text for mentions of known character names
 */
export const scanForMentions = (
  text: string,
  knownNames: string[]
): string[] => {
  if (!text) return [];
  const found: string[] = [];
  const normText = normalizeArabic(text);

  knownNames.forEach((name) => {
    if (name.length < 3) return;
    const normName = normalizeArabic(name);
    if (
      normText.includes(` ${normName} `) ||
      normText.startsWith(`${normName} `) ||
      normText.endsWith(` ${normName}`)
    ) {
      found.push(name);
    }
  });

  return [...new Set(found)];
};
