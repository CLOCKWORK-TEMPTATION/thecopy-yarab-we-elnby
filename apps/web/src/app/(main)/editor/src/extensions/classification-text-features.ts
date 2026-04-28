import {
  FULL_ACTION_VERB_SET,
  PRONOUN_ACTION_RE,
} from "./arabic-patterns";
import {
  hasActionVerbStructure,
  isActionCueLine,
  isActionVerbStart,
  matchesActionStartPattern,
  startsWithBullet,
} from "./text-utils";

export interface TextFeatures {
  readonly wordCount: number;
  readonly startsWithDash: boolean;
  readonly startsWithBullet: boolean;
  readonly isParenthetical: boolean;
  readonly hasActionIndicators: boolean;
  readonly hasPunctuation: boolean;
  readonly endsWithColon: boolean;
  readonly isEmpty: boolean;
  readonly normalized: string;
}

const INVISIBLE_FORMAT_RE = /[\u200f\u200e\ufeff]/g;
const CONNECTOR_THEN_ACTION_RE =
  /(?:^|[\s،,؛:.!?؟…])ثم\s+([يتنأ][؀-ۿ]{2,})(?=$|[\s،,؛:.!?؟…])/;
const ARABIC_EDGE_CLEAN_RE = /(^[^؀-ۿ]+)|([^؀-ۿ]+$)/g;
export const ACTION_VERB_LIKE_RE = /^(?:[وف]?)[يتنأ][؀-ۿ]{2,}$/;
const DIALOGUE_ACTION_CONNECTORS = new Set([
  "ثم",
  "وبعدين",
  "بعدها",
  "عندها",
  "فجأة",
]);

const CONJUNCTION_START_RE = /^[وفثم][ـ-ي]/;
const CHARACTER_VERB_RE = /^[يتنأ][؀-ۿ]{2,}$/;

export const detectActionIndicators = (text: string): boolean => {
  if (!text) return false;
  if (/^[-–—]/.test(text)) return true;
  if (startsWithBullet(text)) return true;

  return (
    isActionCueLine(text) ||
    matchesActionStartPattern(text) ||
    isActionVerbStart(text) ||
    hasActionVerbStructure(text) ||
    PRONOUN_ACTION_RE.test(text)
  );
};

export const hasHighConfidenceActionSignal = (text: string): boolean => {
  if (!text) return false;
  if (/^[-–—]/.test(text)) return true;
  if (startsWithBullet(text)) return true;

  return (
    isActionCueLine(text) ||
    matchesActionStartPattern(text) ||
    isActionVerbStart(text) ||
    hasActionVerbStructure(text)
  );
};

export const hasStrongNarrativeActionSignal = (text: string): boolean => {
  const normalized = (text ?? "").trim();
  if (!normalized) return false;
  if (/^[-–—]/.test(normalized) || startsWithBullet(normalized)) return true;

  return (
    isActionCueLine(normalized) ||
    matchesActionStartPattern(normalized) ||
    isActionVerbStart(normalized) ||
    hasActionVerbStructure(normalized) ||
    PRONOUN_ACTION_RE.test(normalized)
  );
};

export const extractTextFeatures = (text: string): TextFeatures => {
  const normalized = text.replace(INVISIBLE_FORMAT_RE, "").trim();
  const words = normalized.split(/\s+/).filter(Boolean);

  return {
    wordCount: words.length,
    startsWithDash: /^[-–—]/.test(normalized),
    startsWithBullet: startsWithBullet(normalized),
    isParenthetical: /^\s*[(（].*[)）]\s*$/.test(normalized),
    hasActionIndicators: detectActionIndicators(normalized),
    hasPunctuation: /[.!?؟،,؛:;"'«»]/.test(normalized),
    endsWithColon: /[:：]\s*$/.test(normalized),
    isEmpty: normalized.length === 0,
    normalized,
  };
};

const cleanArabicToken = (token: string): string =>
  (token ?? "").replace(ARABIC_EDGE_CLEAN_RE, "").trim();

export const hasEmbeddedNarrativeActionInDialogue = (text: string): boolean => {
  const normalized = (text ?? "").replace(INVISIBLE_FORMAT_RE, "").trim();
  if (!normalized) return false;

  const thenMatch = CONNECTOR_THEN_ACTION_RE.exec(normalized);
  if (thenMatch?.[1]) {
    const verbToken = cleanArabicToken(thenMatch[1]);
    if (
      verbToken &&
      (FULL_ACTION_VERB_SET.has(verbToken) ||
        ACTION_VERB_LIKE_RE.test(verbToken))
    ) {
      return true;
    }
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length < 4) return false;

  for (let index = 1; index < tokens.length - 1; index += 1) {
    const token = tokens[index];
    if (!token) continue;
    const connector = cleanArabicToken(token);
    if (!DIALOGUE_ACTION_CONNECTORS.has(connector)) {
      continue;
    }

    const candidateNextToken = tokens[index + 1];
    if (!candidateNextToken) continue;
    const nextToken = cleanArabicToken(candidateNextToken);
    if (!nextToken) continue;
    if (
      FULL_ACTION_VERB_SET.has(nextToken) ||
      ACTION_VERB_LIKE_RE.test(nextToken)
    ) {
      return true;
    }
  }

  return false;
};

export const normalizeNameFragment = (text: string): string =>
  (text ?? "")
    .replace(INVISIBLE_FORMAT_RE, "")
    .replace(/[:：]/g, "")
    .trim();

export const isLikelyCharacterFragment = (
  text: string,
  limits: { minChars: number; maxChars: number; maxWords: number }
): boolean => {
  const normalized = normalizeNameFragment(text);
  if (!normalized) return false;
  if (
    normalized.length < limits.minChars ||
    normalized.length > limits.maxChars
  )
    return false;
  if (/[.!?؟،,؛;"'«»()\x5B\x5D{}]/.test(normalized)) return false;

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > limits.maxWords) return false;

  return tokens.every((token) => /^[؀-ۿ0-9٠-٩]+$/.test(token));
};

export const looksLikeVerbOrConjunction = (normalized: string): boolean => {
  const words = normalized
    .replace(/[:،؛]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return false;
  const firstWord = words[0];
  if (!firstWord) return false;
  if (CONJUNCTION_START_RE.test(firstWord) && words.length <= 3) return true;
  if (words.length === 1 && CHARACTER_VERB_RE.test(firstWord)) return true;
  return words.some((w) => ACTION_VERB_LIKE_RE.test(w));
};
