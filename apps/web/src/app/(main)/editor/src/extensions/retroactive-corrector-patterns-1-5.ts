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
    if (next.type !== "action" || hasVeryStrongActionSignal(next.text)) continue;

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
        for (let j = blockStart; j < blockEnd; j++) {
          const currentDraft = classified[j];
          if (!currentDraft) continue;
          if (!looksLikeCharacterStructurally(currentDraft.text)) continue;

          const p4Name = normalizeCharacterName(currentDraft.text);
          if (!p4Name || !isCandidateCharacterName(p4Name)) continue;
          const p4Tokens = p4Name.split(/\s+/).filter(Boolean);
          if (p4Tokens.length === 1 && preSeeded && !preSeeded.has(p4Name))
            continue;

          classified[j] = correctedDraft(currentDraft, "character", 6);
          corrections += 1;

          for (let k = j + 1; k < blockEnd; k++) {
            const nextDraft = classified[k];
            if (!nextDraft) continue;
            if (hasStrongActionSignal(nextDraft.text)) break;
            if (looksLikeCharacterStructurally(nextDraft.text)) break;
            classified[k] = correctedDraft(nextDraft, "dialogue", 4);
            corrections += 1;
          }
        }
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

  const nameFrequency = new Map<string, number>();
  for (const draft of classified) {
    if (draft.type !== "character") continue;
    const name = normalizeCharacterName(draft.text);
    if (!name) continue;
    nameFrequency.set(name, (nameFrequency.get(name) ?? 0) + 1);
  }

  const unconfirmedIndexes = new Set<number>();
  for (let i = 0; i < classified.length; i++) {
    const current = classified[i];
    if (current?.type !== "character") continue;
    const name = normalizeCharacterName(current.text);
    if (!name) continue;
    if ((nameFrequency.get(name) ?? 0) >= 2) continue;
    if (preSeeded.has(name)) continue;
    unconfirmedIndexes.add(i);
  }

  if (unconfirmedIndexes.size === 0) return 0;

  const CLUSTER_WINDOW = 5;
  const DIALOGUE_FLOW = new Set<ElementType>(["dialogue", "parenthetical"]);

  for (const idx of unconfirmedIndexes) {
    let confirmationSignals = 0;

    const nextType =
      idx + 1 < classified.length ? (classified[idx + 1]?.type ?? null) : null;
    if (nextType && DIALOGUE_FLOW.has(nextType)) {
      confirmationSignals += 1;
    }

    let nearbyUnconfirmed = 0;
    for (
      let j = Math.max(0, idx - CLUSTER_WINDOW);
      j < Math.min(classified.length, idx + CLUSTER_WINDOW + 1);
      j++
    ) {
      if (j === idx) continue;
      if (unconfirmedIndexes.has(j)) nearbyUnconfirmed++;
    }
    if (nearbyUnconfirmed === 0) {
      confirmationSignals += 1;
    }

    if (confirmationSignals === 0) {
      const current = classified[idx];
      if (!current) continue;
      classified[idx] = correctedDraft(current, "dialogue", 4);
      corrections += 1;
    }
  }

  return corrections;
};
