/**
 * @module extensions/retroactive-corrector-patterns-1-5
 * @description الأنماط 1–5 للتصحيح الرجعي.
 */

import { isCandidateCharacterName } from "./character";
import {
  correctedDraft,
  endsWithColon,
  hasStrongActionSignal,
  hasVeryStrongActionSignal,
  looksLikeCharacterStructurally,
  normalizeCharacterName,
  wordCount,
} from "./retroactive-corrector-utils";

import type { ClassifiedDraft, ElementType } from "./classification-types";

// ─── النمط 1: action ينتهي بـ : + أسطر لاحقة بدون مؤشرات وصف قوية ─

export const applyPattern1_ActionEndingWithColon = (
  classified: ClassifiedDraft[],
  preSeeded?: ReadonlySet<string>
): number => {
  let corrections = 0;

  for (let i = 0; i < classified.length - 1; i++) {
    const current = classified[i];
    if (!current) continue;

    if (current.type !== "action") continue;
    if (!endsWithColon(current.text)) continue;
    if (wordCount(current.text) > 4) continue;

    const candidateName = normalizeCharacterName(current.text);
    if (!candidateName || !isCandidateCharacterName(candidateName)) continue;

    const nameTokens = candidateName.split(/\s+/).filter(Boolean);
    if (nameTokens.length === 1 && preSeeded && !preSeeded.has(candidateName))
      continue;

    const next = classified[i + 1];
    if (!next) continue;
    if (next.type !== "action" || hasVeryStrongActionSignal(next.text))
      continue;

    classified[i] = correctedDraft(current, "character", 4);
    classified[i + 1] = correctedDraft(next, "dialogue", 4);
    corrections += 2;

    for (let j = i + 2; j < classified.length; j++) {
      const subsequent = classified[j];
      if (!subsequent) break;
      if (subsequent.type !== "action") break;
      if (hasStrongActionSignal(subsequent.text)) break;
      if (looksLikeCharacterStructurally(subsequent.text)) break;
      classified[j] = correctedDraft(subsequent, "dialogue", 2);
      corrections += 1;
    }
  }

  return corrections;
};

// ─── النمط 2: character متتالية → الثانية dialogue ──────────────

export const applyPattern2_ConsecutiveCharacters = (
  classified: ClassifiedDraft[]
): number => {
  let corrections = 0;

  for (let i = 0; i < classified.length - 1; i++) {
    const current = classified[i];
    const next = classified[i + 1];
    if (!current || !next) continue;
    if (current.type !== "character") continue;
    if (next.type !== "character") continue;

    if (hasStrongActionSignal(next.text)) {
      classified[i + 1] = correctedDraft(next, "action", 2);
    } else {
      classified[i + 1] = correctedDraft(next, "dialogue", 2);
    }
    corrections += 1;
  }

  return corrections;
};

// ─── النمط 3: dialogue معزول بدون character سابق ────────────────

export const applyPattern3_IsolatedDialogue = (
  classified: ClassifiedDraft[]
): number => {
  let corrections = 0;
  const DIALOGUE_FLOW_TYPES = new Set<ElementType>([
    "character",
    "dialogue",
    "parenthetical",
  ]);

  for (let i = 0; i < classified.length; i++) {
    const current = classified[i];
    if (current?.type !== "dialogue") continue;

    const prev = i > 0 ? classified[i - 1] : undefined;
    if (prev && DIALOGUE_FLOW_TYPES.has(prev.type)) continue;

    if (prev?.type === "action") {
      if (looksLikeCharacterStructurally(prev.text)) {
        classified[i - 1] = correctedDraft(prev, "character", 4);
        corrections += 1;
        continue;
      }
    }

    const prevPrev = i > 1 ? classified[i - 2] : undefined;
    if (prevPrev?.type === "action") {
      if (looksLikeCharacterStructurally(prevPrev.text)) {
        classified[i - 2] = correctedDraft(prevPrev, "character", 4);
        const between = classified[i - 1];
        if (
          between?.type === "action" &&
          !hasStrongActionSignal(between.text)
        ) {
          classified[i - 1] = correctedDraft(between, "dialogue", 2);
          corrections += 1;
        }
        corrections += 1;
        continue;
      }
    }
  }

  return corrections;
};

// ─── النمط 4: كتلة action طويلة (5+) مع سطر ينتهي بـ : ─────────

function isSeededCandidateName(
  text: string,
  preSeeded?: ReadonlySet<string>
): boolean {
  const name = normalizeCharacterName(text);
  if (!name || !isCandidateCharacterName(name)) return false;

  const tokens = name.split(/\s+/).filter(Boolean);
  return tokens.length !== 1 || !preSeeded || preSeeded.has(name);
}

function correctDialogueAfterCharacter(
  classified: ClassifiedDraft[],
  start: number,
  blockEnd: number
): number {
  let corrections = 0;

  for (let index = start + 1; index < blockEnd; index++) {
    const draft = classified[index];
    if (!draft) continue;
    if (hasStrongActionSignal(draft.text)) break;
    if (looksLikeCharacterStructurally(draft.text)) break;
    classified[index] = correctedDraft(draft, "dialogue", 4);
    corrections += 1;
  }

  return corrections;
}

function correctLongActionBlock(
  classified: ClassifiedDraft[],
  blockStart: number,
  blockEnd: number,
  preSeeded?: ReadonlySet<string>
): number {
  let corrections = 0;

  for (let index = blockStart; index < blockEnd; index++) {
    const draft = classified[index];
    if (!draft) continue;
    if (!looksLikeCharacterStructurally(draft.text)) continue;
    if (!isSeededCandidateName(draft.text, preSeeded)) continue;

    classified[index] = correctedDraft(draft, "character", 6);
    corrections += 1;
    corrections += correctDialogueAfterCharacter(classified, index, blockEnd);
  }

  return corrections;
}

export const applyPattern4_LongActionBlockWithColon = (
  classified: ClassifiedDraft[],
  preSeeded?: ReadonlySet<string>
): number => {
  let corrections = 0;
  const MIN_BLOCK_LENGTH = 5;

  let blockStart = -1;

  for (let i = 0; i <= classified.length; i++) {
    const current = i < classified.length ? classified[i] : undefined;
    const isAction = current?.type === "action";

    if (isAction && blockStart === -1) {
      blockStart = i;
      continue;
    }

    if (!isAction && blockStart !== -1) {
      const blockEnd = i;
      const blockLength = blockEnd - blockStart;

      if (blockLength >= MIN_BLOCK_LENGTH) {
        corrections += correctLongActionBlock(
          classified,
          blockStart,
          blockEnd,
          preSeeded
        );
      }

      blockStart = -1;
      if (isAction) blockStart = i;
    }
  }

  return corrections;
};

// ─── النمط 5: تأكيد character بالتكرار + السياق + التجمّع ─────────

/**
 * النمط 5 — كشف الشخصيات الزائفة بالأنماط.
 * الاسم اللي بيظهر مرة واحدة + مش مبذور + محاط بأسماء مشابهة → dialogue.
 */
export const applyPattern5_UnconfirmedCharacterCluster = (
  classified: ClassifiedDraft[],
  preSeeded: ReadonlySet<string>
): number => {
  let corrections = 0;
  const nameFrequency = getCharacterNameFrequency(classified);
  const unconfirmedIndexes = getUnconfirmedCharacterIndexes(
    classified,
    nameFrequency,
    preSeeded
  );

  if (unconfirmedIndexes.size === 0) return 0;

  for (const idx of unconfirmedIndexes) {
    if (
      !hasUnconfirmedCharacterConfirmation(classified, idx, unconfirmedIndexes)
    ) {
      const current = classified[idx];
      if (!current) continue;
      classified[idx] = correctedDraft(current, "dialogue", 4);
      corrections += 1;
    }
  }

  return corrections;
};

function getCharacterNameFrequency(classified: ClassifiedDraft[]) {
  const nameFrequency = new Map<string, number>();

  for (const draft of classified) {
    if (draft.type !== "character") continue;
    const name = normalizeCharacterName(draft.text);
    if (!name) continue;
    nameFrequency.set(name, (nameFrequency.get(name) ?? 0) + 1);
  }

  return nameFrequency;
}

function getUnconfirmedCharacterIndexes(
  classified: ClassifiedDraft[],
  nameFrequency: ReadonlyMap<string, number>,
  preSeeded: ReadonlySet<string>
) {
  const indexes = new Set<number>();

  for (let index = 0; index < classified.length; index++) {
    const current = classified[index];
    if (current?.type !== "character") continue;
    const name = normalizeCharacterName(current.text);
    if (!name) continue;
    if ((nameFrequency.get(name) ?? 0) >= 2) continue;
    if (preSeeded.has(name)) continue;
    indexes.add(index);
  }

  return indexes;
}

function hasUnconfirmedCharacterConfirmation(
  classified: ClassifiedDraft[],
  index: number,
  unconfirmedIndexes: ReadonlySet<number>
) {
  return (
    hasDialogueFlowAfter(classified, index) ||
    countNearbyUnconfirmed(index, classified.length, unconfirmedIndexes) === 0
  );
}

function hasDialogueFlowAfter(classified: ClassifiedDraft[], index: number) {
  const DIALOGUE_FLOW = new Set<ElementType>(["dialogue", "parenthetical"]);
  const nextType =
    index + 1 < classified.length
      ? (classified[index + 1]?.type ?? null)
      : null;

  return Boolean(nextType && DIALOGUE_FLOW.has(nextType));
}

function countNearbyUnconfirmed(
  index: number,
  length: number,
  unconfirmedIndexes: ReadonlySet<number>
) {
  const CLUSTER_WINDOW = 5;
  let nearby = 0;

  for (
    let current = Math.max(0, index - CLUSTER_WINDOW);
    current < Math.min(length, index + CLUSTER_WINDOW + 1);
    current++
  ) {
    if (current !== index && unconfirmedIndexes.has(current)) nearby += 1;
  }

  return nearby;
}
