/**
 * @module extensions/retroactive-corrector-patterns-6-9
 * @description الأنماط 6–9 للتصحيح الرجعي (أنماط جديدة — تُفعَّل بـ enableNewPatterns).
 */

import {
  looksLikeNarrativeActionSyntax,
  hasDirectDialogueMarkers,
} from "./text-utils";
import { correctedDraft, wordCount } from "./retroactive-corrector-utils";

import type { ClassifiedDraft, ElementType } from "./classification-types";

// ─── النمط 6: Action Verb في Dialogue Flow ──────────────────────

/**
 * سطر مصنّف dialogue + فيه action verb واضح + بدون dialogue cues → action.
 */
export const applyPattern6_ActionVerbInDialogueFlow = (
  classified: ClassifiedDraft[]
): number => {
  let corrections = 0;

  for (let i = 0; i < classified.length; i++) {
    const current = classified[i];
    if (current?.type !== "dialogue") continue;

    const text = current.text;
    if (!text) continue;

    if (!looksLikeNarrativeActionSyntax(text)) continue;
    if (hasDirectDialogueMarkers(text)) continue;

    if (i === 0) continue;
    const prev = classified[i - 1];
    if (!prev) continue;
    if (
      prev.type !== "dialogue" &&
      prev.type !== "character" &&
      prev.type !== "parenthetical"
    )
      continue;

    classified[i] = correctedDraft(current, "action", 4);
    corrections++;
  }

  return corrections;
};

// ─── النمط 7: Orphaned Parenthetical ────────────────────────────

/**
 * parenthetical بدون character/dialogue قبله أو بعده → action.
 */
export const applyPattern7_OrphanedParenthetical = (
  classified: ClassifiedDraft[]
): number => {
  let corrections = 0;
  const DIALOGUE_FLOW = new Set<ElementType>([
    "character",
    "dialogue",
    "parenthetical",
  ]);

  for (let i = 0; i < classified.length; i++) {
    const current = classified[i];
    if (current?.type !== "parenthetical") continue;

    const prev = i > 0 ? classified[i - 1] : undefined;
    const next = i + 1 < classified.length ? classified[i + 1] : undefined;
    const prevOk = !!prev && DIALOGUE_FLOW.has(prev.type);
    const nextOk = !!next && DIALOGUE_FLOW.has(next.type);

    if (!prevOk && !nextOk) {
      classified[i] = correctedDraft(current, "action", 3);
      corrections++;
    }
  }

  return corrections;
};

// ─── النمط 8: Transition → Action Correction ────────────────────

/**
 * سطر مصنّف transition + أطول من 6 كلمات → غالباً action.
 */
export const applyPattern8_LongTransition = (
  classified: ClassifiedDraft[]
): number => {
  let corrections = 0;

  for (let i = 0; i < classified.length; i++) {
    const current = classified[i];
    if (current?.type !== "transition") continue;
    if (wordCount(current.text) <= 6) continue;
    if (current.classificationMethod === "regex" && current.confidence >= 90)
      continue;

    classified[i] = correctedDraft(current, "action", 3);
    corrections++;
  }

  return corrections;
};

// ─── النمط 9: Dialogue بعد Transition/Scene Header ──────────────

/**
 * dialogue مباشرة بعد transition أو scene_header → action.
 */
export const applyPattern9_DialogueAfterSceneBreak = (
  classified: ClassifiedDraft[]
): number => {
  let corrections = 0;
  const BREAK_TYPES = new Set<ElementType>([
    "transition",
    "scene_header_1",
    "scene_header_2",
    "scene_header_3",
  ]);

  for (let i = 1; i < classified.length; i++) {
    const current = classified[i];
    const prev = classified[i - 1];
    if (!current || !prev || current.type !== "dialogue") continue;
    if (!BREAK_TYPES.has(prev.type)) continue;
    if (current.classificationMethod === "regex" && current.confidence >= 90)
      continue;

    classified[i] = correctedDraft(current, "action", 3);
    corrections++;
  }

  return corrections;
};
