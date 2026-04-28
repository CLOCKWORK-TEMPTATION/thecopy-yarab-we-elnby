import { PRONOUN_ACTION_RE } from "../arabic-patterns";
import {
  hasActionVerbStructure,
  hasSentencePunctuation,
  isActionCueLine,
  isActionVerbStart,
  matchesActionStartPattern,
  normalizeCharacterName,
  normalizeLine,
  startsWithBullet,
} from "../text-utils";

import type { ClassifiedDraft } from "../classification-types";
import type { SequenceFeatures } from "./types";

const detectActionSignals = (normalized: string): boolean => {
  if (!normalized) return false;
  if (/^[-–—]/.test(normalized)) return true;
  if (startsWithBullet(normalized)) return true;
  return (
    isActionCueLine(normalized) ||
    matchesActionStartPattern(normalized) ||
    isActionVerbStart(normalized) ||
    hasActionVerbStructure(normalized) ||
    PRONOUN_ACTION_RE.test(normalized)
  );
};

export const extractSequenceFeatures = (
  drafts: readonly ClassifiedDraft[],
  preSeeded: ReadonlySet<string>
): SequenceFeatures[] => {
  if (drafts.length === 0) {
    return [];
  }

  const avgLength =
    drafts.reduce((sum, draft) => sum + normalizeLine(draft.text).length, 0) /
      drafts.length || 1;

  const nameFrequency = new Map<string, number>();
  for (const draft of drafts) {
    const name = normalizeCharacterName(draft.text);
    if (name && /[:：]\s*$/.test(normalizeLine(draft.text))) {
      nameFrequency.set(name, (nameFrequency.get(name) ?? 0) + 1);
    }
  }

  return drafts.map((draft, index) => {
    const normalized = normalizeLine(draft.text);
    const words = normalized.split(/\s+/).filter(Boolean);
    const name = normalizeCharacterName(draft.text);
    const endsColon = /[:：]\s*$/.test(normalized);

    return {
      wordCount: words.length,
      charCount: normalized.length,
      endsWithColon: endsColon,
      startsWithDash: /^[-–—]/.test(normalized),
      startsWithBullet: startsWithBullet(normalized),
      isParenthetical: /^\s*[(（].*[)）]\s*$/.test(normalized),
      hasActionIndicators: detectActionSignals(normalized),
      hasSentencePunctuation: endsColon
        ? hasSentencePunctuation(normalized.replace(/[:：]\s*$/, "").trim())
        : hasSentencePunctuation(normalized),
      relativeLength: normalized.length / avgLength,
      nameRepetitionCount: endsColon ? (nameFrequency.get(name) ?? 0) : 0,
      isPreSeeded: endsColon ? preSeeded.has(name) : false,
      positionRatio: drafts.length > 1 ? index / (drafts.length - 1) : 0.5,
      normalized,
    };
  });
};
