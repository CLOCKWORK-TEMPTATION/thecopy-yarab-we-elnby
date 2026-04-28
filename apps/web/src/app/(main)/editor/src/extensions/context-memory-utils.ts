import { normalizeCharacterName } from "./text-utils";

import type { CharacterEvidence } from "./context-memory-types";

export const RUNTIME_SESSION_ID = "__runtime-paste-session__";
export const MAX_RECENT_TYPES = 20;
export const MAX_RUNTIME_RECORDS = 120;

const MEMORY_INVALID_SINGLE_TOKEN_RE =
  /^(?:أنا|انا|إنت|انت|أنت|أنتِ|إنتي|انتي|هو|هي|هم|هن|إحنا|احنا|نحن|أنتم|انتم)$/;

export const createEmptyEvidence = (): CharacterEvidence => ({
  inlinePairCount: 0,
  standaloneHeaderCount: 0,
  dialogueFollowerCount: 0,
  repeatCount: 0,
  actionContaminationCount: 0,
});

export const isEvidenceConfirmed = (ev: CharacterEvidence): boolean => {
  if (ev.inlinePairCount >= 1) return true;
  if (
    ev.standaloneHeaderCount >= 2 &&
    ev.dialogueFollowerCount >= 2 &&
    ev.actionContaminationCount === 0
  ) {
    return true;
  }
  return false;
};

export const isValidMemoryCharacterName = (rawName: string): boolean => {
  const normalized = normalizeCharacterName(rawName);
  if (!normalized) return false;
  if (normalized.length < 2 || normalized.length > 40) return false;
  if (/[؟!,،"«»]/.test(normalized)) return false;

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 5) return false;
  const firstToken = tokens[0];
  if (
    tokens.length === 1 &&
    firstToken &&
    MEMORY_INVALID_SINGLE_TOKEN_RE.test(firstToken)
  )
    return false;
  return true;
};

export const detectLocalRepeatedPattern = (
  classifications: readonly string[]
): string | null => {
  if (classifications.length < 4) return null;

  const detectInOrder = (ordered: readonly string[]): string | null => {
    const pairCounts = new Map<string, number>();
    for (let i = 0; i < ordered.length - 1; i += 1) {
      const first = (ordered[i] ?? "").trim();
      const second = (ordered[i + 1] ?? "").trim();
      if (!first || !second) continue;
      const key = `${first}-${second}`;
      pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
    }

    let bestPattern: string | null = null;
    let bestCount = 0;
    pairCounts.forEach((count, pattern) => {
      if (count > bestCount) {
        bestCount = count;
        bestPattern = pattern;
      }
    });

    return bestCount >= 2 ? bestPattern : null;
  };

  return (
    detectInOrder(classifications) ??
    detectInOrder(Array.from(classifications).reverse())
  );
};
