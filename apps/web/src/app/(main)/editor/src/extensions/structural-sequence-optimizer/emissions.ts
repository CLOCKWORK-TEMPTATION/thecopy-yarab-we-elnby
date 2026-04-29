import {
  FORWARD_BIAS_SCALE,
  NUM_TYPES,
  TYPE_INDEX,
  adjustNumericValue,
} from "./model";

import type { ElementType } from "../classification-types";
import type { SequenceFeatures } from "./types";

// ─── دوال تعديل النقاط لكل نوع ──────────────────────────────────────

const adjustBasmala = (
  scores: Float64Array,
  features: SequenceFeatures
): void => {
  const index = TYPE_INDEX.get("basmala")!;
  if (
    features.wordCount >= 3 &&
    features.wordCount <= 6 &&
    !features.endsWithColon
  ) {
    adjustNumericValue(scores, index, 0.5);
  } else {
    adjustNumericValue(scores, index, -5.0);
  }
};

const adjustSceneHeader1 = (
  scores: Float64Array,
  features: SequenceFeatures
): void => {
  const index = TYPE_INDEX.get("scene_header_1")!;
  if (
    features.wordCount <= 3 &&
    !features.endsWithColon &&
    !features.hasActionIndicators
  ) {
    adjustNumericValue(scores, index, 0.5);
  } else {
    adjustNumericValue(scores, index, -4.0);
  }
};

const adjustSceneHeader2 = (
  scores: Float64Array,
  features: SequenceFeatures
): void => {
  const index = TYPE_INDEX.get("scene_header_2")!;
  if (features.wordCount <= 5 && !features.endsWithColon) {
    adjustNumericValue(scores, index, 0.5);
  } else {
    adjustNumericValue(scores, index, -3.0);
  }
  if (features.hasActionIndicators) {
    adjustNumericValue(scores, index, -2.0);
  }
};

const adjustSceneHeader3 = (
  scores: Float64Array,
  features: SequenceFeatures
): void => {
  const index = TYPE_INDEX.get("scene_header_3")!;
  if (
    features.wordCount <= 8 &&
    !features.endsWithColon &&
    !features.hasActionIndicators
  ) {
    adjustNumericValue(scores, index, 0.5);
  } else {
    adjustNumericValue(scores, index, -3.0);
  }
};

const adjustAction = (
  scores: Float64Array,
  features: SequenceFeatures
): void => {
  const index = TYPE_INDEX.get("action")!;
  if (features.hasActionIndicators) adjustNumericValue(scores, index, 3.0);
  if (features.startsWithDash) adjustNumericValue(scores, index, 2.0);
  if (features.startsWithBullet) adjustNumericValue(scores, index, 2.0);
  if (features.wordCount >= 5) adjustNumericValue(scores, index, 1.0);
  if (features.endsWithColon && features.wordCount <= 4) {
    adjustNumericValue(scores, index, -2.0);
  }
  if (features.isParenthetical) {
    adjustNumericValue(scores, index, -3.0);
  }
};

const adjustCharacter = (
  scores: Float64Array,
  features: SequenceFeatures
): void => {
  const index = TYPE_INDEX.get("character")!;
  if (features.endsWithColon) adjustNumericValue(scores, index, 3.0);
  else adjustNumericValue(scores, index, -6.0);

  if (features.wordCount <= 3) adjustNumericValue(scores, index, 2.0);
  else if (features.wordCount <= 4) adjustNumericValue(scores, index, 1.0);
  else adjustNumericValue(scores, index, -2.0);

  if (features.wordCount > 5) adjustNumericValue(scores, index, -3.0);
  if (features.hasActionIndicators) adjustNumericValue(scores, index, -3.0);

  if (features.nameRepetitionCount >= 2) adjustNumericValue(scores, index, 2.5);
  else if (features.nameRepetitionCount === 1) {
    adjustNumericValue(scores, index, -1.0);
  }

  if (features.isPreSeeded) adjustNumericValue(scores, index, 2.5);

  if (features.hasSentencePunctuation && features.endsWithColon) {
    adjustNumericValue(scores, index, -2.5);
  }

  if (features.isParenthetical) adjustNumericValue(scores, index, -4.0);
};

const adjustDialogue = (
  scores: Float64Array,
  features: SequenceFeatures
): void => {
  const index = TYPE_INDEX.get("dialogue")!;
  if (!features.hasActionIndicators) adjustNumericValue(scores, index, 0.5);
  if (features.endsWithColon && features.wordCount <= 3) {
    adjustNumericValue(scores, index, -2.0);
  }
  if (features.wordCount >= 4 && !features.hasActionIndicators) {
    adjustNumericValue(scores, index, 1.0);
  }
  if (features.hasSentencePunctuation) adjustNumericValue(scores, index, 0.5);
  if (features.startsWithDash) adjustNumericValue(scores, index, -1.5);
  if (features.startsWithBullet) adjustNumericValue(scores, index, -1.5);
  if (features.isParenthetical) adjustNumericValue(scores, index, -2.0);
};

const adjustParenthetical = (
  scores: Float64Array,
  features: SequenceFeatures
): void => {
  const index = TYPE_INDEX.get("parenthetical")!;
  if (features.isParenthetical) adjustNumericValue(scores, index, 5.0);
  else adjustNumericValue(scores, index, -5.0);
};

const adjustTransition = (
  scores: Float64Array,
  features: SequenceFeatures
): void => {
  const index = TYPE_INDEX.get("transition")!;
  if (
    features.wordCount <= 5 &&
    !features.endsWithColon &&
    !features.hasActionIndicators
  ) {
    adjustNumericValue(scores, index, 0.0);
  } else {
    adjustNumericValue(scores, index, -3.0);
  }
  if (features.wordCount > 6) {
    adjustNumericValue(scores, index, -3.0);
  }
};

// ─── الدالة الرئيسية ─────────────────────────────────────────────────

export const computeEmissionScores = (
  features: SequenceFeatures
): Float64Array => {
  const scores = new Float64Array(NUM_TYPES).fill(0);

  adjustBasmala(scores, features);
  adjustSceneHeader1(scores, features);
  adjustSceneHeader2(scores, features);
  adjustSceneHeader3(scores, features);
  adjustAction(scores, features);
  adjustCharacter(scores, features);
  adjustDialogue(scores, features);
  adjustParenthetical(scores, features);
  adjustTransition(scores, features);

  return scores;
};

export const addForwardPassBias = (
  emissionScores: Float64Array,
  forwardType: ElementType,
  forwardConfidence: number
): void => {
  const typeIndex = TYPE_INDEX.get(forwardType);
  if (typeIndex === undefined) {
    return;
  }

  const bias = forwardConfidence * FORWARD_BIAS_SCALE;
  adjustNumericValue(emissionScores, typeIndex, bias);
};
